using System.Text;
using CodeStackLMS.API.Middleware;
using CodeStackLMS.Infrastructure;
using CodeStackLMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.SqlServer;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 5; // Number of concurrent jobs
});

// ── Authentication / Authorization ────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

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
                    new Uri(origin).Host == "localhost")
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

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

// ── Hangfire Dashboard ────────────────────────────────────────────────────────
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() },
    DashboardTitle = "CodeStack LMS - Background Jobs"
});

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Database initialisation ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        await context.Database.MigrateAsync();
        await ApplicationDbContextSeed.SeedAsync(context);

        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Database initialised and seeded successfully");
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initialising the database");
        throw;
    }
}

app.Run();

// ── Hangfire Authorization Filter ─────────────────────────────────────────────
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        
        // In development, allow all access
        if (httpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            return true;
        
        // In production, require authentication and Admin role
        return httpContext.User.Identity?.IsAuthenticated == true 
            && httpContext.User.IsInRole("Admin");
    }
}
