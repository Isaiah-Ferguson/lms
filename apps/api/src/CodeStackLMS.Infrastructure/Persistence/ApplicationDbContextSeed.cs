using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Infrastructure.Persistence;

public static class ApplicationDbContextSeed
{
    private static readonly Guid CresticeAdminId = new("c0a9f731-8d38-4f43-83f1-6f2e8b8cf901");

    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Ensure the admin account exists
        var cresticeEmail = "crestice@yahoo.com";
        var cresticeAdmins = await context.Users
            .Where(u => u.Email.Trim().ToLower() == cresticeEmail)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        if (cresticeAdmins.Count == 0)
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
        }
        else
        {
            var primaryAdmin = cresticeAdmins[0];
            primaryAdmin.Name = "Crestice Admin";
            primaryAdmin.Email = cresticeEmail;
            primaryAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("password");
            primaryAdmin.Role = UserRole.Admin;
            primaryAdmin.IsActive = true;
            primaryAdmin.MustChangePassword = false;
            primaryAdmin.UpdatedAt = DateTime.UtcNow;

            if (cresticeAdmins.Count > 1)
            {
                context.Users.RemoveRange(cresticeAdmins.Skip(1));
            }
        }

        await context.SaveChangesAsync();

        // Seed 10 random students with password "password"
        var studentEmails = new[]
        {
            "student1@codestack.com",
            "student2@codestack.com",
            "student3@codestack.com",
            "student4@codestack.com",
            "student5@codestack.com",
            "student6@codestack.com",
            "student7@codestack.com",
            "student8@codestack.com",
            "student9@codestack.com",
            "student10@codestack.com"
        };

        var studentNames = new[]
        {
            "Alex Johnson",
            "Maria Garcia",
            "James Wilson",
            "Emily Chen",
            "Michael Brown",
            "Sarah Davis",
            "David Martinez",
            "Jessica Taylor",
            "Christopher Anderson",
            "Amanda Thomas"
        };

        // Only add students that don't already exist
        var existingStudentEmails = await context.Users
            .Where(u => u.Role == UserRole.Student)
            .Select(u => u.Email)
            .ToListAsync();

        var newStudents = new List<User>();
        for (int i = 0; i < studentEmails.Length; i++)
        {
            if (!existingStudentEmails.Contains(studentEmails[i]))
            {
                newStudents.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Name = studentNames[i],
                    Email = studentEmails[i],
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
                    Role = UserRole.Student,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (newStudents.Count > 0)
        {
            await context.Users.AddRangeAsync(newStudents);
            await context.SaveChangesAsync();
        }
    }
}
