using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Infrastructure.Persistence;

public static class ApplicationDbContextSeed
{
    // Fixed Id keeps the seeded admin row stable across resets.
    private static readonly Guid InitialAdminId = new("c0a9f731-8d38-4f43-83f1-6f2e8b8cf901");

    /// <summary>
    /// Seeds a single initial admin account if none exists yet.
    /// Email and password are read from configuration:
    ///   Seed:AdminEmail      (required)
    ///   Seed:AdminPassword   (required)
    /// If either is missing, seeding is skipped with a warning. No secrets live in source.
    /// The seeded admin is forced to change their password on first login.
    /// </summary>
    public static async Task SeedAsync(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger? logger = null)
    {
        var adminEmail = configuration["Seed:AdminEmail"];
        var adminPassword = configuration["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger?.LogWarning(
                "Skipping admin seed: 'Seed:AdminEmail' and/or 'Seed:AdminPassword' are not configured.");
            return;
        }

        var normalizedEmail = adminEmail.Trim().ToLowerInvariant();

        var anyAdminExists = await context.Users
            .AnyAsync(u => u.Role == UserRole.Admin);

        if (anyAdminExists)
        {
            logger?.LogInformation("Admin seed skipped: at least one admin account already exists.");
            return;
        }

        context.Users.Add(new User
        {
            Id = InitialAdminId,
            Name = "Initial Admin",
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = UserRole.Admin,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        logger?.LogInformation(
            "Seeded initial admin account ({Email}). MustChangePassword is true.",
            normalizedEmail);
    }
}
