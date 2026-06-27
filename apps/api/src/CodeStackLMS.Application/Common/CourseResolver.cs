using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Common;

/// <summary>
/// Shared course-resolution logic. Every cohort gets its OWN duplicate set of
/// level courses (Combine, Level 1-4), created in <c>HomeService.CreateAcademicYear</c>
/// and mapped via <c>CohortCourses</c>. Resolving a level slug like "level-1" therefore
/// has to pick the row belonging to the selected cohort, not just any same-titled row.
/// This is the single source of truth for that logic — keep callers from re-implementing it.
/// </summary>
public static class CourseResolver
{
    /// <summary>
    /// Resolve a level slug ("combine", "level-1" … "level-4", or any course title slugified)
    /// to an existing <see cref="Course.Title"/>. Returns null when no course matches.
    /// </summary>
    public static async Task<string?> ResolveTitleFromSlugAsync(
        IApplicationDbContext db, string slug, CancellationToken ct)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        var titles = await db.Courses.AsNoTracking()
            .Select(c => c.Title)
            .ToListAsync(ct);

        return titles.FirstOrDefault(t =>
            t.Trim().ToLowerInvariant().Replace(" ", "-") == normalized);
    }

    /// <summary>
    /// The course IDs mapped to a cohort (each cohort owns its own copy of each level course).
    /// </summary>
    public static async Task<List<Guid>> GetCohortCourseIdsAsync(
        IApplicationDbContext db, Guid cohortId, CancellationToken ct)
        => await db.CohortCourses.AsNoTracking()
            .Where(cc => cc.CohortId == cohortId)
            .Select(cc => cc.CourseId)
            .ToListAsync(ct);

    /// <summary>
    /// Resolve a course id (GUID) or level slug to a single <see cref="Course"/> with its
    /// Modules loaded. When <paramref name="cohortCourseIds"/> is supplied, resolves to THAT
    /// cohort's own course row; among ties, prefers the row that actually has modules.
    /// Returns null when nothing matches, or (for an explicit GUID) when the course is not
    /// part of the requested cohort.
    /// </summary>
    public static async Task<Course?> ResolveCourseAsync(
        IApplicationDbContext db,
        string courseIdOrSlug,
        IReadOnlyCollection<Guid>? cohortCourseIds,
        CancellationToken ct)
    {
        if (Guid.TryParse(courseIdOrSlug, out var id))
        {
            var byId = await db.Courses.AsNoTracking()
                .Include(c => c.Modules)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (byId != null && cohortCourseIds != null && !cohortCourseIds.Contains(byId.Id))
                return null;
            return byId;
        }

        var title = await ResolveTitleFromSlugAsync(db, courseIdOrSlug, ct);
        if (title == null) return null;

        var courses = await db.Courses.AsNoTracking()
            .Include(c => c.Modules)
            .Where(c => c.Title == title)
            .ToListAsync(ct);

        // Prefer the selected cohort's own course row.
        if (cohortCourseIds != null)
            courses = courses.Where(c => cohortCourseIds.Contains(c.Id)).ToList();

        return courses.FirstOrDefault(c => c.Modules.Any())
               ?? courses.OrderByDescending(c => c.CreatedAt).FirstOrDefault();
    }
}
