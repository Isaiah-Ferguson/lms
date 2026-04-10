using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Infrastructure.Persistence;

public static class ApplicationDbContextSeed
{
    private static readonly Guid CresticeAdminId = new("c0a9f731-8d38-4f43-83f1-6f2e8b8cf901");

    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Only create the single admin account
        var cresticeEmail = "crestice@yahoo.com";
        var existingAdmin = await context.Users
            .FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == cresticeEmail);

        if (existingAdmin == null)
        {
            context.Users.Add(new User
            {
                Id = CresticeAdminId,
                Name = "Crestice Admin",
                Email = cresticeEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
                Role = UserRole.Admin,
                IsActive = true,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            });
            
            await context.SaveChangesAsync();
        }
    }
}
