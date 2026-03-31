using CodeStackLMS.Application.AdminParticipants.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace CodeStackLMS.Application.Profile;

public class ProfileService : IProfileService
{
    private const long MaxAvatarSizeBytes = 2 * 1024 * 1024;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IBlobStorageService _blobStorage;

    public ProfileService(
        IApplicationDbContext db,
        ICurrentUserService currentUser,
        IBlobStorageService blobStorage)
    {
        _db = db;
        _currentUser = currentUser;
        _blobStorage = blobStorage;
    }

    public async Task<ProfileDataDto> GetMyProfileAsync(CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException("User", _currentUser.UserId);

        var enrollments = await GetEnrollmentsAsync(user.Id, cancellationToken);
        var gradesOverview = await GetGradesOverviewAsync(user.Id, cancellationToken);
        var avatarUrl = await ResolveAvatarUrlAsync(user.AvatarUrl, cancellationToken);

        return BuildProfileDto(
            user.Id,
            user.Name,
            user.Email,
            user.Town,
            user.PhoneNumber,
            user.GitHubUsername,
            avatarUrl,
            user.IsOnProbation,
            user.ProbationReason,
            user.CreatedAt,
            user.LastLoginAt,
            user.EmailNotificationsEnabled,
            user.DarkModeEnabled,
            enrollments,
            gradesOverview,
            adminNotes: null,
            new ProfilePermissionsDto(true, false, false));
    }

    public async Task<ProfileDataDto?> GetProfileForAdminAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new ValidationException("Invalid user identifier.");

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken);

        if (user is null)
            return null;

        var enrollments = await GetEnrollmentsAsync(user.Id, cancellationToken);
        var gradesOverview = await GetGradesOverviewAsync(user.Id, cancellationToken);
        var adminNotes = await GetAdminNotesAsync(user.Id, cancellationToken);
        var avatarUrl = await ResolveAvatarUrlAsync(user.AvatarUrl, cancellationToken);

        return BuildProfileDto(
            user.Id,
            user.Name,
            user.Email,
            user.Town,
            user.PhoneNumber,
            user.GitHubUsername,
            avatarUrl,
            user.IsOnProbation,
            user.ProbationReason,
            user.CreatedAt,
            user.LastLoginAt,
            user.EmailNotificationsEnabled,
            user.DarkModeEnabled,
            enrollments,
            gradesOverview,
            adminNotes,
            new ProfilePermissionsDto(true, true, true));
    }

    public async Task<ProfileUserDto> UpdateProfileAsync(
        string userId,
        string name,
        string town,
        string phoneNumber,
        string gitHubUsername,
        string? avatarBlobPath,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new ValidationException("Invalid user identifier.");

        var canEdit = _currentUser.UserId == parsedUserId || _currentUser.Role == "Admin";
        if (!canEdit)
            throw new ForbiddenException();

        var trimmedName = name.Trim();
        var trimmedTown = town.Trim();
        var trimmedPhone = phoneNumber.Trim();
        var trimmedGitHub = gitHubUsername.Trim();

        if (string.IsNullOrWhiteSpace(trimmedName))
            throw new ValidationException("Name is required.");

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken)
            ?? throw new NotFoundException("User", parsedUserId);

        var oldAvatarBlobPath = user.AvatarUrl;
        var shouldDeleteOldAvatar = false;

        user.Name = trimmedName;
        user.Town = trimmedTown;
        user.PhoneNumber = trimmedPhone;
        user.GitHubUsername = trimmedGitHub;
        if (!string.IsNullOrEmpty(avatarBlobPath))
        {
            var newAvatarBlobPath = avatarBlobPath.Trim();

            var expectedPrefix = $"avatars/{parsedUserId}/";
            if (!newAvatarBlobPath.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
                throw new ValidationException("Avatar path is invalid.");

            user.AvatarUrl = newAvatarBlobPath;
            shouldDeleteOldAvatar =
                !string.IsNullOrWhiteSpace(oldAvatarBlobPath) &&
                !string.Equals(oldAvatarBlobPath, newAvatarBlobPath, StringComparison.OrdinalIgnoreCase);
        }

        await _db.SaveChangesAsync(cancellationToken);

        if (shouldDeleteOldAvatar && oldAvatarBlobPath is not null)
        {
            try
            {
                await _blobStorage.DeleteBlobAsync(oldAvatarBlobPath, cancellationToken);
            }
            catch
            {
                // Avatar replacement succeeded; ignore cleanup failures for old blob.
            }
        }

        var resolvedAvatarUrl = await ResolveAvatarUrlAsync(user.AvatarUrl, cancellationToken);

        return new ProfileUserDto(
            user.Id.ToString(),
            user.Name,
            user.Email,
            user.Town,
            user.PhoneNumber,
            user.GitHubUsername,
            resolvedAvatarUrl,
            user.IsOnProbation,
            user.ProbationReason);
    }

    public async Task<AvatarUploadSlotDto> GenerateAvatarUploadSlotAsync(
        string userId,
        string fileName,
        string contentType,
        long sizeBytes,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new ValidationException("Invalid user identifier.");

        var canEdit = _currentUser.UserId == parsedUserId || _currentUser.Role == "Admin";
        if (!canEdit)
            throw new ForbiddenException();

        var targetExists = await _db.Users.AnyAsync(u => u.Id == parsedUserId, cancellationToken);
        if (!targetExists)
            throw new NotFoundException("User", parsedUserId);

        if (sizeBytes <= 0 || sizeBytes > MaxAvatarSizeBytes)
            throw new ValidationException("Avatar must be between 1 byte and 2 MB.");

        if (!contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("Only image files can be uploaded as avatars.");

        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
            extension = ".png";

        var blobPath = $"avatars/{parsedUserId}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var uploadSlot = await _blobStorage.GenerateUploadSasAsync(
            blobPath,
            contentType,
            sizeBytes,
            TimeSpan.FromMinutes(15),
            cancellationToken);

        var readUrl = await _blobStorage.GenerateReadSasAsync(
            uploadSlot.BlobPath,
            TimeSpan.FromDays(1),
            cancellationToken);

        return new AvatarUploadSlotDto(
            uploadSlot.BlobPath,
            uploadSlot.SasUrl,
            readUrl,
            uploadSlot.ExpiresAt.ToString("O"));
    }

    public async Task<UserPreferencesDto> UpdatePreferencesAsync(
        bool emailNotificationsEnabled,
        bool darkModeEnabled,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken)
            ?? throw new NotFoundException("User", _currentUser.UserId);

        user.EmailNotificationsEnabled = emailNotificationsEnabled;
        user.DarkModeEnabled = darkModeEnabled;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return new UserPreferencesDto(emailNotificationsEnabled, darkModeEnabled);
    }

    public async Task SaveAdminNoteAsync(string userId, string text, CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role != "Admin")
            throw new ForbiddenException();

        if (!Guid.TryParse(userId, out var targetUserId))
            throw new ValidationException("Invalid user identifier.");

        var trimmed = text.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ValidationException("Note text is required.");

        var targetExists = await _db.Users.AnyAsync(u => u.Id == targetUserId, cancellationToken);
        if (!targetExists)
            throw new NotFoundException("User", targetUserId);

        _db.UserAdminNotes.Add(new UserAdminNote
        {
            Id = Guid.NewGuid(),
            TargetUserId = targetUserId,
            AuthorUserId = _currentUser.UserId,
            Text = trimmed,
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetProbationStatusAsync(
        string userId,
        bool isOnProbation,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role != "Admin")
            throw new ForbiddenException();

        if (!Guid.TryParse(userId, out var targetUserId))
            throw new ValidationException("Invalid user identifier.");

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken)
            ?? throw new NotFoundException("User", targetUserId);

        user.IsOnProbation = isOnProbation;
        user.ProbationReason = isOnProbation ? reason.Trim() : string.Empty;
        user.UpdatedAt = DateTime.UtcNow;

        var noteText = isOnProbation
            ? $"[Academic Probation] Status set to ON. Reason: {(string.IsNullOrWhiteSpace(reason) ? "(none provided)" : reason.Trim())}"
            : "[Academic Probation] Status removed.";

        _db.UserAdminNotes.Add(new UserAdminNote
        {
            Id = Guid.NewGuid(),
            TargetUserId = targetUserId,
            AuthorUserId = _currentUser.UserId,
            Text = noteText,
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<EnrollmentDto>> GetEnrollmentsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var rows = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .Join(
                _db.Courses.AsNoTracking(),
                enrollment => enrollment.CourseId,
                course => course.Id,
                (enrollment, course) => new { enrollment.EnrolledAt, course.Id, course.Title })
            .OrderByDescending(x => x.EnrolledAt)
            .ToListAsync(cancellationToken);

        return rows
            .Select((row, index) => new EnrollmentDto(
                row.Id.ToString(),
                row.Title,
                index == 0 ? "Active" : "Completed"))
            .ToList();
    }

    private async Task<GradesOverviewDto> GetGradesOverviewAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Get all assignments and submissions for the user
        var submissionsWithAssignments = await _db.Submissions
            .AsNoTracking()
            .Where(s => s.StudentId == userId)
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Module)
                .ThenInclude(m => m.Course)
            .Include(s => s.Grade)
            .ToListAsync(cancellationToken);

        var totalCount = submissionsWithAssignments.Count;
        var gradedSubmissions = submissionsWithAssignments.Where(s => s.Grade != null).ToList();
        var gradedCount = gradedSubmissions.Count;

        var overallPercent = gradedCount == 0
            ? 0
            : (int)Math.Round(gradedSubmissions.Average(s => (double)s.Grade!.TotalScore));

        var lastGradedAt = gradedSubmissions
            .Where(s => s.Grade?.GradedAt != null)
            .Select(s => (DateTime?)s.Grade!.GradedAt)
            .Max(); // returns null when there are no graded submissions

        // Calculate per-course grades
        var courseGrades = submissionsWithAssignments
            .GroupBy(s => new { s.Assignment.Module.Course.Id, s.Assignment.Module.Course.Title })
            .Select(g =>
            {
                var courseSubmissions = g.ToList();
                var courseGraded = courseSubmissions.Where(s => s.Grade != null).ToList();
                var coursePercent = courseGraded.Count == 0
                    ? 0
                    : (int)Math.Round(courseGraded.Average(s => (double)s.Grade!.TotalScore));
                
                return new CourseGradeDto(
                    g.Key.Id.ToString(),
                    g.Key.Title,
                    coursePercent,
                    CalculateLetterGrade(coursePercent),
                    courseGraded.Count,
                    courseSubmissions.Count);
            })
            .OrderBy(c => c.CourseName)
            .ToList();

        return new GradesOverviewDto(
            overallPercent,
            gradedCount,
            totalCount,
            lastGradedAt?.ToString("O"),
            courseGrades);
    }

    private static string CalculateLetterGrade(int percent)
    {
        if (percent >= 93) return "A";
        if (percent >= 90) return "A-";
        if (percent >= 87) return "B+";
        if (percent >= 83) return "B";
        if (percent >= 80) return "B-";
        if (percent >= 77) return "C+";
        if (percent >= 73) return "C";
        if (percent >= 70) return "C-";
        if (percent >= 67) return "D+";
        if (percent >= 63) return "D";
        if (percent >= 60) return "D-";
        return "F";
    }

    private async Task<AdminNotesDto> GetAdminNotesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var notes = await _db.UserAdminNotes
            .AsNoTracking()
            .Where(n => n.TargetUserId == userId)
            .Join(
                _db.Users.AsNoTracking(),
                note => note.AuthorUserId,
                author => author.Id,
                (note, author) => new
                {
                    note.Text,
                    note.CreatedAt,
                    AuthorName = author.Name,
                })
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);

        if (notes.Count == 0)
        {
            return new AdminNotesDto(
                string.Empty,
                DateTime.UtcNow.ToString("O"),
                "System",
                Array.Empty<AdminNoteHistoryItemDto>());
        }

        var current = notes[0];
        var previous = notes
            .Skip(1)
            .Select(n => new AdminNoteHistoryItemDto(
                n.Text,
                n.CreatedAt.ToString("O"),
                n.AuthorName))
            .ToList();

        return new AdminNotesDto(
            current.Text,
            current.CreatedAt.ToString("O"),
            current.AuthorName,
            previous);
    }

    private static ProfileDataDto BuildProfileDto(
        Guid userId,
        string name,
        string email,
        string town,
        string phoneNumber,
        string gitHubUsername,
        string? avatarUrl,
        bool isOnProbation,
        string probationReason,
        DateTime createdAt,
        DateTime? lastLoginAt,
        bool emailNotificationsEnabled,
        bool darkModeEnabled,
        IReadOnlyList<EnrollmentDto> enrollments,
        GradesOverviewDto gradesOverview,
        AdminNotesDto? adminNotes,
        ProfilePermissionsDto permissions)
    {
        var loginActivity = new LoginActivityDto(
            createdAt.ToString("O"),
            (lastLoginAt ?? createdAt).ToString("O"));

        var preferences = new UserPreferencesDto(
            emailNotificationsEnabled,
            darkModeEnabled);

        return new ProfileDataDto(
            new ProfileUserDto(
                userId.ToString(),
                name,
                email,
                town,
                phoneNumber,
                gitHubUsername,
                avatarUrl,
                isOnProbation,
                probationReason),
            gradesOverview,
            enrollments,
            loginActivity,
            preferences,
            adminNotes,
            permissions);
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
