using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Courses.DTOs;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace CodeStackLMS.Application.Courses;

public class CourseDetailService : ICourseDetailService
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CourseDetailService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<CourseDetailDto> GetCourseDetailAsync(
        string courseId,
        CancellationToken cancellationToken = default)
    {
        var course = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);

        var isAdminOrInstructor = _currentUser.Role is "Admin" or "Instructor";

        var weeks = course.Modules
            .Where(m => m.WeekNumber.HasValue)
            .OrderBy(m => m.WeekNumber)
            .Select(m => new CourseWeekDto(
                m.Id.ToString(),
                m.WeekNumber!.Value,
                m.Title,
                m.DateRange ?? "",
                m.ZoomUrl ?? "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success",
                ParseTopics(m.Topics),
                $"/courses/{courseId}/weeks/{m.WeekNumber}"))
            .ToList();

        var courseZoomUrl = course.Modules
            .Where(m => m.ZoomUrl != null)
            .OrderBy(m => m.Order)
            .Select(m => m.ZoomUrl!)
            .FirstOrDefault() ?? "https://codestack.zoom.us/j/93949618291?pwd=dVQ5VkVmZ0JTOWlYR09ub3lLdURvZz09#success";

        var announcements = course.Announcements
            .Select(a => new CourseAnnouncementDto(
                a.Id.ToString(),
                a.Title,
                a.Body,
                a.Tag,
                a.AnnouncedAt.ToString("O")))
            .ToList();

        var (accentColor, courseMeta) = ResolveCourseStyle(course.Title);

        return new CourseDetailDto(
            course.Id.ToString(),
            course.Title,
            course.Description,
            accentColor,
            courseMeta,
            courseZoomUrl,
            weeks,
            announcements,
            new CoursePermissionsDto(isAdminOrInstructor));
    }

    public async Task<CourseWeekDto> CreateWeekAsync(
        string courseId,
        CreateWeekDto dto,
        CancellationToken cancellationToken = default)
    {
        RequireAdminOrInstructor();

        var resolvedCourse = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);
        var parsedCourseId = resolvedCourse.Id;

        // Check if week number already exists
        var existingWeek = await _db.Modules
            .FirstOrDefaultAsync(
                m => m.CourseId == parsedCourseId && m.WeekNumber == dto.WeekNumber,
                cancellationToken);

        if (existingWeek != null)
            throw new InvalidOperationException($"Week {dto.WeekNumber} already exists for this course.");

        // Enforce sequential week creation - get the highest week number
        var maxWeekNumber = await _db.Modules
            .Where(m => m.CourseId == parsedCourseId && m.WeekNumber.HasValue)
            .MaxAsync(m => (int?)m.WeekNumber, cancellationToken) ?? 0;

        var expectedNextWeek = maxWeekNumber + 1;
        if (dto.WeekNumber != expectedNextWeek)
            throw new InvalidOperationException($"Weeks must be created sequentially. Next week should be Week {expectedNextWeek}, but received Week {dto.WeekNumber}.");

        // Get the highest order number for this course
        var maxOrder = await _db.Modules
            .Where(m => m.CourseId == parsedCourseId)
            .MaxAsync(m => (int?)m.Order, cancellationToken) ?? 0;

        var module = new Domain.Entities.Module
        {
            Id = Guid.NewGuid(),
            CourseId = parsedCourseId,
            Title = dto.Title.Trim(),
            WeekNumber = dto.WeekNumber,
            DateRange = dto.DateRange.Trim(),
            ZoomUrl = dto.ZoomUrl.Trim(),
            Order = maxOrder + 1,
            CreatedAt = DateTime.UtcNow,
        };

        // Store topics as JSON in the Topics column
        var topicLabels = dto.Topics
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList();
        
        module.Topics = JsonSerializer.Serialize(topicLabels);

        _db.Modules.Add(module);
        await _db.SaveChangesAsync(cancellationToken);

        return new CourseWeekDto(
            module.Id.ToString(),
            module.WeekNumber.Value,
            module.Title,
            module.DateRange ?? "",
            module.ZoomUrl ?? "",
            topicLabels,
            $"/courses/{courseId}/weeks/{module.WeekNumber}");
    }

    public async Task<CourseWeekDto> UpdateWeekAsync(
        string courseId,
        string weekId,
        UpdateWeekDto dto,
        CancellationToken cancellationToken = default)
    {
        RequireAdminOrInstructor();

        var resolvedCourse = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);
        var parsedCourseId = resolvedCourse.Id;

        if (!Guid.TryParse(weekId, out var parsedWeekId))
            throw new NotFoundException("Week", weekId);

        var module = await _db.Modules
            .FirstOrDefaultAsync(
                m => m.Id == parsedWeekId && m.CourseId == parsedCourseId,
                cancellationToken)
            ?? throw new NotFoundException("Week", weekId);

        module.Title = dto.Title.Trim();
        module.DateRange = dto.DateRange.Trim();
        module.ZoomUrl = dto.ZoomUrl.Trim();

        // Store topics as JSON - DO NOT touch lessons
        var topicLabels = dto.Topics
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList();
        
        module.Topics = JsonSerializer.Serialize(topicLabels);

        await _db.SaveChangesAsync(cancellationToken);

        return new CourseWeekDto(
            module.Id.ToString(),
            module.WeekNumber!.Value,
            module.Title,
            module.DateRange ?? "",
            module.ZoomUrl ?? "",
            topicLabels,
            $"/courses/{courseId}/weeks/{module.WeekNumber}");
    }

    public async Task<CourseAnnouncementDto> CreateAnnouncementAsync(
        string courseId,
        UpsertAnnouncementDto dto,
        CancellationToken cancellationToken = default)
    {
        RequireAdminOrInstructor();

        var resolvedCourse = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);
        var parsedCourseId = resolvedCourse.Id;

        if (!DateTime.TryParse(dto.AnnouncedAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var announcedAt))
            announcedAt = DateTime.UtcNow;

        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            CourseId = parsedCourseId,
            Title = dto.Title.Trim(),
            Body = dto.Body.Trim(),
            Tag = string.IsNullOrWhiteSpace(dto.Tag) ? null : dto.Tag.Trim(),
            AnnouncedAt = DateTime.SpecifyKind(announcedAt, DateTimeKind.Utc),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(cancellationToken);

        return new CourseAnnouncementDto(
            announcement.Id.ToString(),
            announcement.Title,
            announcement.Body,
            announcement.Tag,
            announcement.AnnouncedAt.ToString("O"));
    }

    public async Task<CourseAnnouncementDto> UpdateAnnouncementAsync(
        string courseId,
        string announcementId,
        UpsertAnnouncementDto dto,
        CancellationToken cancellationToken = default)
    {
        RequireAdminOrInstructor();

        var resolvedCourse = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);
        var parsedCourseId = resolvedCourse.Id;

        if (!Guid.TryParse(announcementId, out var parsedId))
            throw new NotFoundException("Announcement", announcementId);

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(
                a => a.Id == parsedId && a.CourseId == parsedCourseId,
                cancellationToken)
            ?? throw new NotFoundException("Announcement", announcementId);

        if (!DateTime.TryParse(dto.AnnouncedAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var announcedAt))
            announcedAt = announcement.AnnouncedAt;

        announcement.Title = dto.Title.Trim();
        announcement.Body = dto.Body.Trim();
        announcement.Tag = string.IsNullOrWhiteSpace(dto.Tag) ? null : dto.Tag.Trim();
        announcement.AnnouncedAt = DateTime.SpecifyKind(announcedAt, DateTimeKind.Utc);

        await _db.SaveChangesAsync(cancellationToken);

        return new CourseAnnouncementDto(
            announcement.Id.ToString(),
            announcement.Title,
            announcement.Body,
            announcement.Tag,
            announcement.AnnouncedAt.ToString("O"));
    }

    public async Task DeleteAnnouncementAsync(
        string courseId,
        string announcementId,
        CancellationToken cancellationToken = default)
    {
        RequireAdminOrInstructor();

        var resolvedCourse = await ResolveCourseAsync(courseId, cancellationToken)
            ?? throw new NotFoundException("Course", courseId);
        var parsedCourseId = resolvedCourse.Id;

        if (!Guid.TryParse(announcementId, out var parsedId))
            throw new NotFoundException("Announcement", announcementId);

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(
                a => a.Id == parsedId && a.CourseId == parsedCourseId,
                cancellationToken)
            ?? throw new NotFoundException("Announcement", announcementId);

        _db.Announcements.Remove(announcement);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static List<string> ParseTopics(string? topicsJson)
    {
        if (string.IsNullOrWhiteSpace(topicsJson))
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(topicsJson) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private async Task<Domain.Entities.Course?> ResolveCourseAsync(string courseId, CancellationToken cancellationToken)
    {
        // Try GUID first
        if (Guid.TryParse(courseId, out var parsedId))
        {
            return await _db.Courses
                .AsNoTracking()
                .Include(c => c.Modules.OrderBy(m => m.Order))
                    .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
                .Include(c => c.Announcements.OrderByDescending(a => a.AnnouncedAt))
                .FirstOrDefaultAsync(c => c.Id == parsedId, cancellationToken);
        }

        // Resolve slug to title
        var title = courseId.Trim().ToLowerInvariant() switch
        {
            "combine"  => "Combine",
            "level-1"  => "Level 1",
            "level-2"  => "Level 2",
            "level-3"  => "Level 3",
            "level-4"  => "Level 4",
            _          => null,
        };

        if (title == null) return null;

        return await _db.Courses
            .AsNoTracking()
            .Include(c => c.Modules.OrderBy(m => m.Order))
                .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
            .Include(c => c.Announcements.OrderByDescending(a => a.AnnouncedAt))
            .Where(c => c.Title == title)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private void RequireAdminOrInstructor()
    {
        if (_currentUser.Role is not ("Admin" or "Instructor"))
            throw new ForbiddenException();
    }

    private static (string accentColor, string courseMeta) ResolveCourseStyle(string title)
    {
        var normalized = title.Trim().ToLowerInvariant();
        return normalized switch
        {
            var t when t.Contains("combine") => ("bg-gray-600", "Intro To Programming & Game Development"),
            var t when t.Contains("level 1") => ("bg-blue-500", "Web Foundations"),
            var t when t.Contains("level 2") => ("bg-violet-500", "Back-end & APIs"),
            var t when t.Contains("level 3") => ("bg-amber-500", "Next.js & TypeScript"),
            var t when t.Contains("level 4") => ("bg-emerald-500", "Capstone & Career"),
            _ => ("bg-gray-400", ""),
        };
    }
}
