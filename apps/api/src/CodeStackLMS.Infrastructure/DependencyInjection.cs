using Azure.Storage.Blobs;
using Azure.Storage;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.AdminParticipants;
using CodeStackLMS.Application.Assignments;
using CodeStackLMS.Application.Attendance;
using CodeStackLMS.Application.Auth;
using CodeStackLMS.Application.BackgroundJobs;
using CodeStackLMS.Application.Comments;
using CodeStackLMS.Application.Courses;
using CodeStackLMS.Application.Home;
using CodeStackLMS.Application.Instructor;
using CodeStackLMS.Application.Lessons;
using CodeStackLMS.Application.Profile;
using CodeStackLMS.Application.Submissions;
using CodeStackLMS.Application.Transcript;
using CodeStackLMS.Infrastructure.AI;
using CodeStackLMS.Infrastructure.BackgroundJobs;
using CodeStackLMS.Infrastructure.Email;
using CodeStackLMS.Infrastructure.GitHub;
using CodeStackLMS.Infrastructure.Identity;
using CodeStackLMS.Infrastructure.Persistence;
using CodeStackLMS.Infrastructure.Reports;
using CodeStackLMS.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace CodeStackLMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Database ──────────────────────────────────────────────────────────
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(
                connectionString,
                sql =>
                {
                    sql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
                    sql.CommandTimeout(30);
                });
        });

        services.AddScoped<IApplicationDbContext>(sp =>
            sp.GetRequiredService<ApplicationDbContext>());

        // ── Azure Blob Storage ────────────────────────────────────────────────
        services.Configure<BlobStorageOptions>(opts =>
            configuration.GetSection(BlobStorageOptions.SectionName).Bind(opts));

        services.AddSingleton(sp =>
        {
            var connStr = configuration[$"{BlobStorageOptions.SectionName}:ConnectionString"];
            if (string.IsNullOrWhiteSpace(connStr))
                throw new InvalidOperationException(
                    "AzureStorage:ConnectionString is not configured. " +
                    "Add it to appsettings.Development.json under AzureStorage:ConnectionString.");

            // Parse AccountName and AccountKey explicitly so CanGenerateSasUri = true.
            // The connection string format is semicolon-delimited key=value pairs where
            // AccountKey is base64 and may contain '=' padding characters.
            // We split each segment on the FIRST '=' only to preserve the full key value.
            var parts = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var segment in connStr.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var idx = segment.IndexOf('=');
                if (idx > 0)
                    parts[segment[..idx].Trim()] = segment[(idx + 1)..].Trim();
            }

            if (parts.TryGetValue("AccountName", out var accountName) &&
                parts.TryGetValue("AccountKey", out var accountKey))
            {
                var credential = new StorageSharedKeyCredential(accountName, accountKey);
                var endpoint = new Uri($"https://{accountName}.blob.core.windows.net");
                return new BlobServiceClient(endpoint, credential);
            }

            // Fallback — connection string without explicit key (e.g. Azurite / emulator)
            return new BlobServiceClient(connStr);
        });

        services.AddScoped<IBlobStorageService, AzureBlobStorageService>();

        // ── Email ─────────────────────────────────────────────────────────────
        services.Configure<EmailOptions>(opts =>
            configuration.GetSection(EmailOptions.SectionName).Bind(opts));
        services.AddScoped<IEmailService, SmtpEmailService>();

        // ── Identity / Current User ───────────────────────────────────────────
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // ── Application Services ──────────────────────────────────────────────
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminParticipantsService, AdminParticipantsService>();
        services.AddScoped<IHomeService, HomeService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<ITranscriptService, TranscriptService>();
        services.AddScoped<ISubmissionService, SubmissionService>();
        services.AddSingleton<IWordDocumentGenerator, Documents.WordDocumentGenerator>();
        services.AddSingleton<ITranscriptPdfGenerator, Documents.TranscriptPdfGenerator>();
        services.AddScoped<IGradingService, GradingService>();
        services.AddScoped<ISubmissionQueueService, SubmissionQueueService>();
        services.AddScoped<IGradebookService, GradebookService>();
        services.AddScoped<ILessonService, LessonService>();
        services.AddScoped<ICourseDetailService, CourseDetailService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<ICommentService, CommentService>();
        services.AddScoped<IAttendanceService, AttendanceService>();

        // ── Claude / Anthropic ─────────────────────────────────────────────────
        services.Configure<AnthropicOptions>(opts =>
            configuration.GetSection(AnthropicOptions.SectionName).Bind(opts));

        services.AddHttpClient<IClaudeClient, ClaudeClient>();

        // ── GitHub repo verification ───────────────────────────────────────────
        // Unauthenticated public API = 60 req/hr per server IP. Set an optional
        // GitHub:Token (a fine-grained PAT with public read) to raise this to 5,000/hr.
        services.AddHttpClient<IGitHubVerificationService, GitHubVerificationService>(client =>
        {
            client.BaseAddress = new Uri("https://api.github.com/");
            client.DefaultRequestHeaders.UserAgent.ParseAdd("CodeStackLMS");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
            client.Timeout = TimeSpan.FromSeconds(10);

            var token = configuration["GitHub:Token"];
            if (!string.IsNullOrWhiteSpace(token))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        });

        // ── Background Jobs ───────────────────────────────────────────────────
        services.AddScoped<IBackgroundJobService, HangfireBackgroundJobService>();
        services.AddScoped<SendGradeNotificationJob>();
        services.AddScoped<SendSubmissionReturnedNotificationJob>();
        services.AddScoped<WeeklyProgressReportJob>();

        // ── Progress Reports ──────────────────────────────────────────────────
        services.AddScoped<IProgressReportService, ProgressReportService>();

        return services;
    }
}
