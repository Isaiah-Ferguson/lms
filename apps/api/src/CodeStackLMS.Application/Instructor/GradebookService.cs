using CodeStackLMS.Application.Common;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Instructor;

/// <summary>
/// Grade read models: a student's own grades, the admin gradebook, and the
/// per-assignment submissions roster. Latest-attempt resolution happens in SQL
/// via <see cref="QueryLatestGradeRowSources"/>.
/// </summary>
public class GradebookService : IGradebookService
{
    private const decimal DefaultMaxScore = 100m;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GradebookService(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/grades/my
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<StudentGradesDto> GetMyGradesAsync(
        string courseId,
        string? cohortId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId;

        // Resolve cohort if provided
        Guid? parsedCohortId = null;
        if (!string.IsNullOrWhiteSpace(cohortId) && Guid.TryParse(cohortId, out var cid))
            parsedCohortId = cid;

        // Resolve to the selected cohort's own course row (see CourseResolver).
        var cohortCourseIds = parsedCohortId.HasValue
            ? await CourseResolver.GetCohortCourseIdsAsync(_db, parsedCohortId.Value, cancellationToken)
            : null;

        var course = await CourseResolver.ResolveCourseAsync(_db, courseId, cohortCourseIds, cancellationToken);
        if (course == null)
            return new StudentGradesDto(courseId, courseId, []);

        // Get all assignments in this course
        var assignments = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
            .Where(a => a.Module.CourseId == course.Id)
            .OrderBy(a => a.Module.Order)
            .ThenBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        // Get latest submission per assignment for this student (resolved in SQL)
        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var submissions = await QueryLatestGradeRowSources(
                s => s.StudentId == userId && assignmentIds.Contains(s.AssignmentId))
            .ToListAsync(cancellationToken);

        var latestByAssignment = submissions
            .GroupBy(s => s.AssignmentId)
            .ToDictionary(g => g.Key, g => g.First());

        var rows = assignments.Select(a =>
        {
            latestByAssignment.TryGetValue(a.Id, out var sub);
            return ToGradeRow(a, sub);
        }).ToList();

        return new StudentGradesDto(course.Id.ToString(), course.Title, rows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/grades/admin
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<AdminGradesDto> GetAdminGradesAsync(
        string courseId,
        string? cohortId,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role is not ("Admin" or "Instructor"))
            throw new ForbiddenException();

        if (string.IsNullOrWhiteSpace(courseId))
            throw new ValidationException("courseId is required");

        // Resolve cohort if provided
        Guid? parsedCohortId = null;
        if (!string.IsNullOrWhiteSpace(cohortId) && Guid.TryParse(cohortId, out var cid))
            parsedCohortId = cid;

        // "combine" is a real level/course (resolved by slug), NOT an "all courses"
        // aggregate. Resolve to the selected cohort's own course row (see CourseResolver).
        var cohortCourseIds = parsedCohortId.HasValue
            ? await CourseResolver.GetCohortCourseIdsAsync(_db, parsedCohortId.Value, cancellationToken)
            : null;

        var course = await CourseResolver.ResolveCourseAsync(_db, courseId, cohortCourseIds, cancellationToken);
        if (course == null)
            return new AdminGradesDto(courseId, courseId, []);

        // Assignments for this course only
        var assignments = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
            .Where(a => a.Module.CourseId == course.Id)
            .OrderBy(a => a.Module.Order)
            .ThenBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        var assignmentIds = assignments.Select(a => a.Id).ToList();

        // All students enrolled in this course
        var enrolledStudents = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Include(e => e.User)
            .Where(e => e.User.Role == UserRole.Student && e.CourseId == course.Id)
            .Select(e => e.User)
            .Distinct()
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);

        // Latest submission per student + assignment for this course (resolved in SQL,
        // so older attempts and unused columns never leave the database)
        var latestSubmissions = await QueryLatestGradeRowSources(
                s => assignmentIds.Contains(s.AssignmentId))
            .ToListAsync(cancellationToken);

        var subsByStudentAndAssignment = latestSubmissions
            .GroupBy(s => (s.StudentId, s.AssignmentId))
            .ToDictionary(g => g.Key, g => g.First());

        var studentDtos = enrolledStudents.Select(student =>
        {
            var rows = assignments.Select(a =>
            {
                subsByStudentAndAssignment.TryGetValue((student.Id, a.Id), out var sub);
                return ToGradeRow(a, sub);
            }).ToList();

            return new AdminStudentGradeDto(
                student.Id,
                student.Name ?? "Unknown Student",
                student.Email ?? "no-email@example.com",
                rows);
        }).ToList();

        return new AdminGradesDto(course.Id.ToString(), course.Title, studentDtos);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/assignments/{assignmentId}/submissions-roster
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<AssignmentSubmissionsRosterDto> GetAssignmentSubmissionsRosterAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default)
    {
        if (_currentUser.Role is not ("Admin" or "Instructor"))
            throw new ForbiddenException();

        var assignment = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
                .ThenInclude(m => m.Course)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken)
            ?? throw new NotFoundException(nameof(Assignment), assignmentId);

        // Get all students enrolled in this course
        var enrolledStudents = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Include(e => e.User)
            .Where(e => e.CourseId == assignment.Module.CourseId && e.User.Role == UserRole.Student)
            .Select(e => e.User)
            .Distinct()
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);

        // Get all submissions for this assignment
        var submissions = await _db.Submissions
            .AsNoTracking()
            .Include(s => s.Grade)
                .ThenInclude(g => g!.Instructor)
            .Where(s => s.AssignmentId == assignmentId)
            .ToListAsync(cancellationToken);

        var latestSubmissionByStudent = submissions
            .GroupBy(s => s.StudentId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.AttemptNumber).First());

        var rows = enrolledStudents.Select(student =>
        {
            latestSubmissionByStudent.TryGetValue(student.Id, out var submission);

            string status;
            if (submission == null)
                status = "NotSubmitted";
            else if (submission.Status == SubmissionStatus.Graded)
                status = "Graded";
            else if (submission.Status == SubmissionStatus.ReadyToGrade)
                status = "NeedsGrading";
            else if (submission.Status == SubmissionStatus.Returned)
                status = "Returned";
            else
                status = "Submitted";

            string? grade = null;
            if (submission?.Grade != null)
                grade = $"{submission.Grade.TotalScore} / {DefaultMaxScore}";

            return new AssignmentSubmissionRosterRowDto(
                student.Id,
                student.Name,
                student.Email,
                status,
                submission?.Id,
                submission?.CreatedAt,
                grade,
                submission?.Grade?.GradedAt,
                submission?.Grade?.Instructor?.Name);
        }).ToList();

        return new AssignmentSubmissionsRosterDto(
            assignment.Id,
            assignment.Title,
            assignment.DueDate,
            rows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mappers
    // ─────────────────────────────────────────────────────────────────────────

    private static StudentGradeRowDto ToGradeRow(Assignment a, GradeRowSource? sub)
    {
        var status = sub == null
            ? "Missing"
            : sub.Status == SubmissionStatus.Graded ? "Graded" : "Pending";

        return new StudentGradeRowDto(
            sub?.SubmissionId ?? Guid.Empty,
            a.Id,
            a.Title ?? "Untitled Assignment",
            "Assignment",
            DefaultMaxScore,
            sub?.TotalScore,
            status,
            sub?.GradedAt,
            sub?.OverallComment,
            sub?.GradedBy);
    }

    /// <summary>
    /// Minimal projection of a submission's grade data for gradebook rows.
    /// </summary>
    private sealed record GradeRowSource(
        Guid SubmissionId,
        Guid StudentId,
        Guid AssignmentId,
        SubmissionStatus Status,
        decimal? TotalScore,
        DateTime? GradedAt,
        string? OverallComment,
        string? GradedBy);

    /// <summary>
    /// Latest submission (highest attempt number) per student + assignment matching
    /// <paramref name="predicate"/>, projected server-side to <see cref="GradeRowSource"/>.
    /// </summary>
    private IQueryable<GradeRowSource> QueryLatestGradeRowSources(
        System.Linq.Expressions.Expression<Func<Submission, bool>> predicate)
        => _db.Submissions
            .AsNoTracking()
            .Where(predicate)
            .Where(s => !_db.Submissions.Any(other =>
                other.StudentId == s.StudentId &&
                other.AssignmentId == s.AssignmentId &&
                other.AttemptNumber > s.AttemptNumber))
            .Select(s => new GradeRowSource(
                s.Id,
                s.StudentId,
                s.AssignmentId,
                s.Status,
                s.Grade != null ? (decimal?)s.Grade.TotalScore : null,
                s.Grade != null ? (DateTime?)s.Grade.GradedAt : null,
                s.Grade != null ? s.Grade.OverallComment : null,
                s.Grade != null ? s.Grade.Instructor.Name : null));
}
