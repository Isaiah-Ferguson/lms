using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Home.DTOs;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Home;

public class HomeService : IHomeService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IBlobStorageService _blobStorage;

    public HomeService(IApplicationDbContext db, ICurrentUserService currentUser, IBlobStorageService blobStorage)
    {
        _db = db;
        _currentUser = currentUser;
        _blobStorage = blobStorage;
    }

    public async Task<HomeDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var rawYears = await _db.Cohorts
            .AsNoTracking()
            .OrderByDescending(c => c.StartDate)
            .ToListAsync(cancellationToken);

        var yearsWithActive = rawYears
            .Select(c => new HomeAcademicYearDto(
                c.Id.ToString(),
                c.Name,
                c.StartDate.ToString("yyyy-MM-dd"),
                c.EndDate.ToString("yyyy-MM-dd"),
                c.IsActive))
            .ToList();

        var cohortLevels = await _db.CohortCourses
            .AsNoTracking()
            .Join(
                _db.Courses.AsNoTracking(),
                cohortCourse => cohortCourse.CourseId,
                course => course.Id,
                (cohortCourse, course) => new
                {
                    CohortId = cohortCourse.CohortId,
                    CourseId = course.Id,
                    course.Title,
                    course.Description,
                })
            .ToListAsync(cancellationToken);

        var levels = cohortLevels
            .Select(item =>
            {
                var key = ResolveLevelKey(item.Title, item.CourseId);
                return new HomeCourseLevelDto(
                    item.CourseId.ToString(),
                    item.CohortId.ToString(),
                    key,
                    item.Title,
                    string.IsNullOrWhiteSpace(item.Description)
                        ? "Level content and schedule details will be available soon."
                        : item.Description,
                    false);
            })
            .ToList();

        var userEnrollmentCourseIds = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => e.UserId == user.Id)
            .Select(e => e.CourseId)
            .ToListAsync(cancellationToken);

        var enrolledLevelIdsByYear = cohortLevels
            .Where(item => userEnrollmentCourseIds.Contains(item.CourseId))
            .Select(item => new
            {
                YearId = item.CohortId.ToString(),
                LevelId = item.CourseId.ToString(),
            })
            .GroupBy(item => item.YearId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group.Select(item => item.LevelId).ToList());

        var permissions = new HomePermissionsDto(
            CanManageYears: user.Role.ToString() == "Admin",
            CanViewAllLevels: user.Role.ToString() == "Admin",
            CanViewEnrolledOnly: user.Role.ToString() != "Admin");

        var avatarUrl = await ResolveAvatarUrlAsync(user.AvatarUrl, cancellationToken);

        var userDto = new HomeCurrentUserDto(
            user.Id.ToString(),
            user.Name,
            user.Role.ToString(),
            avatarUrl,
            user.IsOnProbation);

        return new HomeDashboardDto(
            yearsWithActive,
            levels,
            enrolledLevelIdsByYear,
            userDto,
            permissions);
    }

    public async Task<HomeAcademicYearDto> CreateYearAsync(
        string label,
        string startDate,
        string endDate,
        bool setActive,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role != "Admin")
            throw new ForbiddenException();

        var trimmedLabel = label.Trim();
        if (string.IsNullOrWhiteSpace(trimmedLabel))
            throw new ValidationException("Label is required.");

        if (!DateOnly.TryParse(startDate, out var parsedStart))
            throw new ValidationException("Invalid start date.");

        if (!DateOnly.TryParse(endDate, out var parsedEnd))
            throw new ValidationException("Invalid end date.");

        if (parsedEnd <= parsedStart)
            throw new ValidationException("End date must be after start date.");

        if (setActive)
        {
            var activeYears = await _db.Cohorts
                .Where(c => c.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var y in activeYears)
                y.IsActive = false;
        }

        var cohort = new Cohort
        {
            Id = Guid.NewGuid(),
            Name = trimmedLabel,
            StartDate = parsedStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            EndDate = parsedEnd.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            IsActive = setActive,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Cohorts.Add(cohort);

        var defaultLevels = DefaultLevelConfig
            .Select(cfg => new Course
            {
                Id = Guid.NewGuid(),
                Title = cfg.Title,
                Description = cfg.Description,
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        _db.Courses.AddRange(defaultLevels);

        var cohortCourses = defaultLevels
            .Select(course => new CohortCourse
            {
                Id = Guid.NewGuid(),
                CohortId = cohort.Id,
                CourseId = course.Id,
            })
            .ToList();

        _db.CohortCourses.AddRange(cohortCourses);

        await _db.SaveChangesAsync(cancellationToken);

        return new HomeAcademicYearDto(
            cohort.Id.ToString(),
            cohort.Name,
            cohort.StartDate.ToString("yyyy-MM-dd"),
            cohort.EndDate.ToString("yyyy-MM-dd"),
            cohort.IsActive);
    }

    public async Task<HomeAcademicYearDto> SetActiveYearAsync(
        string yearId,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role != "Admin")
            throw new ForbiddenException();

        if (!Guid.TryParse(yearId, out var parsedYearId))
            throw new ValidationException("Invalid year identifier.");

        var allCohorts = await _db.Cohorts
            .Where(c => c.IsActive || c.Id == parsedYearId)
            .ToListAsync(cancellationToken);

        var target = allCohorts.FirstOrDefault(c => c.Id == parsedYearId)
            ?? throw new NotFoundException("AcademicYear", parsedYearId);

        foreach (var c in allCohorts)
            c.IsActive = c.Id == parsedYearId;

        await _db.SaveChangesAsync(cancellationToken);

        return new HomeAcademicYearDto(
            target.Id.ToString(),
            target.Name,
            target.StartDate.ToString("yyyy-MM-dd"),
            target.EndDate.ToString("yyyy-MM-dd"),
            true);
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

    private static readonly IReadOnlyList<(string Title, string Description)> DefaultLevelConfig =
    [
        ("Combine", "Introduction to Programing and Game Development, with C# and Unity."),
        ("Level 1", "Foundations of web development: HTML, CSS, and JavaScript basics."),
        ("Level 2", "Back-end APIs, SQL, architecture, and deployment."),
        ("Level 3", "Next.js, TypeScript, and modern front-end design tools."),
        ("Level 4", "Capstone delivery, leadership, and career readiness."),
    ];

    private static string ResolveLevelKey(string title, Guid courseId)
    {
        var normalized = title.Trim().ToLowerInvariant();
        return normalized switch
        {
            var t when t.Contains("combine") => "combine",
            var t when t.Contains("level 1") || t.Contains("level-1") => "level-1",
            var t when t.Contains("level 2") || t.Contains("level-2") => "level-2",
            var t when t.Contains("level 3") || t.Contains("level-3") => "level-3",
            var t when t.Contains("level 4") || t.Contains("level-4") => "level-4",
            _ => courseId.ToString(),
        };
    }
}
