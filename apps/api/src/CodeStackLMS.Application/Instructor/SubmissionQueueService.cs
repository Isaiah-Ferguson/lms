using CodeStackLMS.Application.Common;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Instructor;

/// <summary>
/// The instructor submission queue: latest actionable submission per
/// student + assignment, filtered and paginated entirely in SQL.
/// </summary>
public class SubmissionQueueService : ISubmissionQueueService
{
    private const decimal DefaultMaxScore = 100m;

    private readonly IApplicationDbContext _db;

    public SubmissionQueueService(IApplicationDbContext db)
    {
        _db = db;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/submissions  (queue)
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<SubmissionQueuePageDto> GetSubmissionQueueAsync(
        string? courseId,
        string? status,
        string? yearId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        page = Math.Max(1, page);

        var query = _db.Submissions.AsNoTracking();

        // Filter by year (cohort) if provided - only include submissions for courses in that cohort
        // If yearId is provided but has no courses, show empty results (not all submissions)
        if (!string.IsNullOrWhiteSpace(yearId) && Guid.TryParse(yearId, out var parsedYearId))
        {
            var yearCourseIds = _db.CohortCourses
                .Where(cc => cc.CohortId == parsedYearId)
                .Select(cc => cc.CourseId);

            query = query.Where(s => yearCourseIds.Contains(s.Assignment.Module.CourseId));
        }

        // Filter by course (GUID or slug)
        if (!string.IsNullOrWhiteSpace(courseId))
        {
            if (Guid.TryParse(courseId, out var parsedCourseId))
                query = query.Where(s => s.Assignment.Module.CourseId == parsedCourseId);
            else
            {
                var resolvedTitle = await CourseResolver.ResolveTitleFromSlugAsync(_db, courseId, cancellationToken);
                if (resolvedTitle != null)
                    query = query.Where(s => s.Assignment.Module.Course.Title == resolvedTitle);
            }
        }

        // Only the latest submission (highest attempt number) per student + assignment.
        // The subquery is against the full Submissions set on purpose: "latest" must be
        // judged across all attempts, not just those matching the status filters below.
        query = query.Where(s => !_db.Submissions.Any(other =>
            other.StudentId == s.StudentId &&
            other.AssignmentId == s.AssignmentId &&
            other.AttemptNumber > s.AttemptNumber));

        // Filter out intermediate statuses - only show submissions that are actionable for instructors
        query = query.Where(s =>
            s.Status == SubmissionStatus.ReadyToGrade ||
            s.Status == SubmissionStatus.Graded ||
            s.Status == SubmissionStatus.Returned);

        // Filter by status after getting latest submissions
        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<SubmissionStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(s => s.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // Order by created date, paginate, and project in SQL
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SubmissionQueueItemDto(
                s.Id,
                s.Student.Name,
                s.Student.Email,
                s.Assignment.Title,
                s.Assignment.Module.Course.Title,
                s.Type,
                s.Status,
                s.CreatedAt,
                s.Grade != null ? (DateTime?)s.Grade.GradedAt : null,
                s.Grade != null ? (decimal?)s.Grade.TotalScore : null,
                DefaultMaxScore,
                s.Assignment.DueDate))
            .ToListAsync(cancellationToken);

        return new SubmissionQueuePageDto(items, totalCount, page, pageSize);
    }
}
