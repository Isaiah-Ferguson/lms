using CodeStackLMS.Application.AdminParticipants.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.AdminParticipants;

public class AdminParticipantsService : IAdminParticipantsService
{
    private readonly IApplicationDbContext _db;
    private readonly IBlobStorageService _blobStorage;

    public AdminParticipantsService(IApplicationDbContext db, IBlobStorageService blobStorage)
    {
        _db = db;
        _blobStorage = blobStorage;
    }

    public async Task<AdminParticipantsDataDto> GetParticipantsAsync(CancellationToken cancellationToken = default)
    {
        // Simplify to isolate the issue
        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);

        // Get courses with cohort information
        var cohortCourses = await _db.CohortCourses
            .AsNoTracking()
            .Include(cc => cc.Course)
            .Include(cc => cc.Cohort)
            .OrderBy(cc => cc.Course.Title)
            .ToListAsync(cancellationToken);

        var courses = cohortCourses
            .Select(cc => new CourseOptionDto(
                cc.Course.Id.ToString(),
                cc.Course.Title,
                cc.Cohort.Id.ToString(),
                cc.Cohort.Name))
            .ToList();
        var rawEnrollments = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Select(e => new { e.UserId, e.CourseId })
            .ToListAsync(cancellationToken);

        var enrollments = rawEnrollments
            .GroupBy(e => e.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(e => e.CourseId.ToString()).ToList());

        var userDtos = new List<ParticipantUserDto>();
        foreach (var user in users)
        {
            var (firstName, lastName) = SplitName(user.Name);
            var initials = BuildInitials(firstName, lastName);
            var username = BuildUsername(user.Email);
            var avatarUrl = await ResolveAvatarUrlAsync(user.AvatarUrl, cancellationToken);

            userDtos.Add(new ParticipantUserDto(
                user.Id.ToString(),
                firstName,
                lastName,
                username,
                user.Email,
                user.Town,
                user.Role.ToString(),
                user.IsActive ? "Active" : "Disabled",
                enrollments.TryGetValue(user.Id, out var courseIds) ? courseIds : Array.Empty<string>(),
                user.LastLoginAt?.ToString("O"),
                initials,
                avatarUrl));
        }

        return new AdminParticipantsDataDto(
            userDtos,
            courses,
            new AdminParticipantsPermissionsDto(true));
    }

    public async Task EnrollUsersAsync(EnrollUsersRequestDto dto, CancellationToken cancellationToken = default)
    {
        var userIds = dto.UserIds
            .Select(ParseGuid)
            .Distinct()
            .ToList();

        var courseIds = dto.CourseIds
            .Select(ParseGuid)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
            throw new ValidationException("At least one user must be selected.");
        if (courseIds.Count == 0)
            throw new ValidationException("At least one course must be selected.");

        var usersExist = await _db.Users.CountAsync(u => userIds.Contains(u.Id), cancellationToken);
        if (usersExist != userIds.Count)
            throw new ValidationException("One or more users were not found.");

        var coursesExist = await _db.Courses.CountAsync(c => courseIds.Contains(c.Id), cancellationToken);
        if (coursesExist != courseIds.Count)
            throw new ValidationException("One or more courses were not found.");

        var existingPairs = await _db.UserCourseEnrollments
            .Where(e => userIds.Contains(e.UserId) && courseIds.Contains(e.CourseId))
            .Select(e => new { e.UserId, e.CourseId })
            .ToListAsync(cancellationToken);

        var existingLookup = existingPairs
            .Select(pair => (pair.UserId, pair.CourseId))
            .ToHashSet();

        var additions = new List<UserCourseEnrollment>();
        foreach (var userId in userIds)
        {
            foreach (var courseId in courseIds)
            {
                if (existingLookup.Contains((userId, courseId)))
                    continue;

                additions.Add(new UserCourseEnrollment
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    CourseId = courseId,
                    EnrolledAt = DateTime.UtcNow,
                });
            }
        }

        if (additions.Count == 0)
            return;

        _db.UserCourseEnrollments.AddRange(additions);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ToggleUserActiveAsync(string userId, string currentUserId, CancellationToken cancellationToken = default)
    {
        var userGuid = ParseGuid(userId);
        var currentUserGuid = ParseGuid(currentUserId);
        
        // Prevent admins from deactivating themselves
        if (userGuid == currentUserGuid)
        {
            throw new ValidationException("You cannot deactivate your own account.");
        }
        
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userGuid, cancellationToken)
            ?? throw new NotFoundException(nameof(User), userGuid);

        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ToggleUserAdminAsync(string userId, CancellationToken cancellationToken = default)
    {
        var userGuid = ParseGuid(userId);
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userGuid, cancellationToken)
            ?? throw new NotFoundException(nameof(User), userGuid);

        // Only toggle between Admin and Student (don't affect Instructors)
        if (user.Role == UserRole.Instructor)
        {
            throw new ValidationException("Cannot toggle admin status for Instructor role. Instructors must be managed separately.");
        }

        user.Role = user.Role == UserRole.Admin ? UserRole.Student : UserRole.Admin;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static Guid ParseGuid(string raw)
    {
        if (!Guid.TryParse(raw, out var parsed))
            throw new ValidationException("Invalid identifier provided.");

        return parsed;
    }

    private static (string firstName, string lastName) SplitName(string name)
    {
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
            return ("Unknown", "");

        if (parts.Length == 1)
            return (parts[0], "");

        return (parts[0], string.Join(' ', parts.Skip(1)));
    }

    private static string BuildInitials(string firstName, string lastName)
    {
        var first = string.IsNullOrWhiteSpace(firstName) ? "?" : firstName[..1];
        var last = string.IsNullOrWhiteSpace(lastName) ? "" : lastName[..1];
        return (first + last).ToUpperInvariant();
    }

    private static string BuildUsername(string email)
    {
        var atIndex = email.IndexOf('@');
        return atIndex > 0 ? email[..atIndex] : email;
    }

    private async Task<string?> ResolveAvatarUrlAsync(string? avatarBlobPath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(avatarBlobPath))
            return null;

        var exists = await _blobStorage.BlobExistsAsync(avatarBlobPath, cancellationToken);
        if (!exists)
            return null;

        return await _blobStorage.GenerateReadSasAsync(
            avatarBlobPath,
            TimeSpan.FromDays(1),
            cancellationToken);
    }
}
