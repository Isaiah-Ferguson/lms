using Azure.Storage.Blobs;
using Azure.Storage;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.AdminParticipants;
using CodeStackLMS.Application.Assignments;
using CodeStackLMS.Application.Auth;
using CodeStackLMS.Application.Comments;
using CodeStackLMS.Application.Courses;
using CodeStackLMS.Application.Home;
using CodeStackLMS.Application.Instructor;
using CodeStackLMS.Application.Lessons;
using CodeStackLMS.Application.Profile;
using CodeStackLMS.Application.Submissions;
using CodeStackLMS.Infrastructure.Email;
using CodeStackLMS.Infrastructure.Identity;
using CodeStackLMS.Infrastructure.Persistence;
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
        services.AddScoped<ISubmissionService, SubmissionService>();
        services.AddScoped<IInstructorService, InstructorService>();
        services.AddScoped<ILessonService, LessonService>();
        services.AddScoped<ICourseDetailService, CourseDetailService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<ICommentService, CommentService>();

        return services;
    }
}
