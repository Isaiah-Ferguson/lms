using System.Text;
using CodeStackLMS.API.Authorization;
using CodeStackLMS.API.Middleware;
using CodeStackLMS.API.Services;
using CodeStackLMS.Infrastructure;
using CodeStackLMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using CodeStackLMS.Infrastructure.BackgroundJobs;
using Hangfire;
using Hangfire.SqlServer;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApplicationInsightsTelemetry();

// ── Kestrel Configuration ─────────────────────────────────────────────────────
builder.Services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
{
    options.Limits.MaxRequestBodySize = 100 * 1024 * 1024; // 100 MB
});

// ── MVC / API ─────────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddSingleton<WordDocumentGenerator>();
builder.Services.AddSingleton<TranscriptPdfGenerator>();

// Configure form options for file uploads
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 100 * 1024 * 1024; // 100 MB
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Infrastructure (DB, Blob, Identity, Services) ─────────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── Hangfire Background Jobs ──────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true
    }));

var workerCount = builder.Configuration.GetValue<int?>("Hangfire:WorkerCount") ?? 5;

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = workerCount;
});

// ── Authentication / Authorization ────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

// Fail fast on a weak signing key: HS256 requires a high-entropy secret of at
// least 256 bits (32 bytes). A short or placeholder key makes tokens forgeable.
if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
    throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes (256 bits) of high-entropy data.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "codestack-lms",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "codestack-lms",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var configuredOrigins = builder.Configuration["Frontend:Url"] ?? "http://localhost:3000";
        var origins = configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (builder.Environment.IsDevelopment())
        {
            // Allow any localhost port in dev so Next.js port-hopping (3000/3001/3002) works
            policy.SetIsOriginAllowed(origin =>
            {
                return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                && uri.Host == "localhost";
            })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            // Support multiple origins (e.g., "http://localhost:3000,https://app.vercel.app")
            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Behind Azure App Service the app sits behind a reverse proxy that forwards the real
// client IP/protocol in X-Forwarded-* headers. Honor them so RemoteIpAddress (used by
// the rate limiter and logging) reflects the actual client rather than the platform.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // The App Service front-ends overwrite these headers and the app isn't reachable
    // directly, so clearing the default trusted-proxy lists is the documented pattern.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Throttle unauthenticated auth endpoints (login / forgot-password) per client IP to
// slow credential brute-forcing. NOTE: a whole classroom shares one public IP via NAT,
// so this bucket is per-location, not per-student. The limit is sized to absorb the
// largest class (max ~60 students) logging in together with retries, while still
// capping a runaway flood. It is a coarse backstop only — BCrypt is the real defense
// against guessing, and per-account throttling would be the next step if needed.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
// Must run first so the corrected client IP/protocol is in place before HTTPS
// redirection, the rate limiter, and logging read them.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Enforce HTTPS on subsequent requests once the browser has connected.
    app.UseHsts();
}


// ── Hangfire Dashboard ────────────────────────────────────────────────────────
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() },
    DashboardTitle = "CodeStack LMS - Background Jobs"
});

app.UseHttpsRedirection();

// Security headers for API/controller responses (placed after the Hangfire
// dashboard so its HTML/JS isn't broken by the strict CSP below).
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// ── Database initialisation ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var configuration = services.GetRequiredService<IConfiguration>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        await context.Database.MigrateAsync();
        await ApplicationDbContextSeed.SeedAsync(context, configuration, logger);

        logger.LogInformation("Database initialised and seeded successfully");
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initialising the database");
        throw;
    }
}

// ── Recurring Jobs ───────────────────────────────────────────────────────────
RecurringJob.AddOrUpdate<WeeklyProgressReportJob>(
    "weekly-progress-reports",
    job => job.ExecuteAsync(
        DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1),
        null,
        CancellationToken.None),
    Cron.Weekly(DayOfWeek.Monday, 6));

app.Run();
