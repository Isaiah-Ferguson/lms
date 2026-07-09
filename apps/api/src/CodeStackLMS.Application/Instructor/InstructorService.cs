using CodeStackLMS.Application.BackgroundJobs;
using CodeStackLMS.Application.Common;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Course = CodeStackLMS.Domain.Entities.Course;

namespace CodeStackLMS.Application.Instructor;

public class InstructorService : IInstructorService
{
    private readonly IApplicationDbContext _db;
    private readonly IBlobStorageService _blob;
    private readonly ICurrentUserService _currentUser;
    private readonly IBackgroundJobService _backgroundJobs;
    private readonly ILogger<InstructorService> _logger;

    public InstructorService(
        IApplicationDbContext db,
        IBlobStorageService blob,
        ICurrentUserService currentUser,
        IBackgroundJobService backgroundJobs,
        ILogger<InstructorService> logger)
    {
        _db = db;
        _blob = blob;
        _currentUser = currentUser;
        _backgroundJobs = backgroundJobs;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/submissions/{submissionId}
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<SubmissionDetailDto> GetSubmissionDetailAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default)
    {
        var submission = await _db.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .Include(s => s.Artifacts)
            .Include(s => s.GitHubInfo)
            .Include(s => s.Grade)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        // Build artifact list with short-lived read SAS URLs
        IReadOnlyList<ArtifactDto>? artifacts = null;
        if (submission.Type == SubmissionType.Upload && submission.Artifacts.Count > 0)
        {
            var readExpiry = TimeSpan.FromMinutes(30);
            var artifactList = new List<ArtifactDto>();

            foreach (var a in submission.Artifacts)
            {
                var readUrl = await _blob.GenerateReadSasAsync(
                    a.BlobPath, readExpiry, cancellationToken);

                artifactList.Add(new ArtifactDto(
                    a.Id,
                    a.FileName,
                    a.ContentType,
                    a.Size,
                    readUrl));
            }

            artifacts = artifactList;
        }

        GitHubInfoDto? gitHubInfo = null;
        if (submission.Type == SubmissionType.GitHub && submission.GitHubInfo is not null)
        {
            gitHubInfo = new GitHubInfoDto(
                submission.GitHubInfo.RepoUrl,
                submission.GitHubInfo.Branch,
                string.IsNullOrEmpty(submission.GitHubInfo.CommitHash)
                    ? null
                    : submission.GitHubInfo.CommitHash);
        }

        ExistingGradeDto? existingGrade = submission.Grade is null
            ? null
            : ToDto(submission.Grade);

        return new SubmissionDetailDto(
            submission.Id,
            submission.AttemptNumber,
            submission.Type,
            submission.Status,
            submission.CreatedAt,
            submission.FigmaUrl,
            submission.GitHubRepoUrl,
            submission.HostedUrl,
            submission.Note,
            new StudentInfoDto(
                submission.Student.Id,
                submission.Student.Name,
                submission.Student.Email),
            new AssignmentInfoDto(
                submission.Assignment.Id,
                submission.Assignment.Title,
                submission.Assignment.Instructions,
                100,
                submission.Assignment.DueDate),
            artifacts,
            gitHubInfo,
            existingGrade);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/instructor/submissions/{submissionId}/grade
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ExistingGradeDto> GradeSubmissionAsync(
        Guid submissionId,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken = default)
    {
        var submission = await _db.Submissions
            .Include(s => s.Grade)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        // Submission must be in a gradeable state
        // Allow most states since background job transitions may not be running
        // Only reject Draft state (submission not yet started)
        if (submission.Status is SubmissionStatus.Draft)
            throw new ValidationException(
                $"Submission is in '{submission.Status}' state and cannot be graded.");

        return await ApplyGradeAsync(submission, dto, cancellationToken);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/instructor/assignments/{assignmentId}/students/{studentId}/grade
    // Grade a student who has not turned the assignment in (e.g. record a zero
    // for work missed by the due date). Reuses the student's latest submission
    // when one exists; otherwise records a placeholder submission to hang the
    // grade off of, since a Grade requires an owning Submission.
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ExistingGradeDto> GradeByStudentAsync(
        Guid assignmentId,
        Guid studentId,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken = default)
    {
        var submission = await _db.Submissions
            .Include(s => s.Grade)
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == studentId)
            .OrderByDescending(s => s.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (submission is null)
        {
            // Nothing turned in — verify the assignment and student exist before
            // creating a placeholder submission to attach the grade to.
            var assignmentExists = await _db.Assignments
                .AnyAsync(a => a.Id == assignmentId, cancellationToken);
            if (!assignmentExists)
                throw new NotFoundException(nameof(Assignment), assignmentId);

            var studentExists = await _db.Users
                .AnyAsync(u => u.Id == studentId && u.Role == UserRole.Student, cancellationToken);
            if (!studentExists)
                throw new NotFoundException(nameof(User), studentId);

            submission = new Submission
            {
                Id = Guid.NewGuid(),
                AssignmentId = assignmentId,
                StudentId = studentId,
                AttemptNumber = 1,
                Type = SubmissionType.Upload,
                Status = SubmissionStatus.ReadyToGrade,
                CreatedAt = DateTime.UtcNow,
            };
            _db.Submissions.Add(submission);
        }

        return await ApplyGradeAsync(submission, dto, cancellationToken);
    }

    // Creates or updates the Grade on a tracked submission and marks it Graded.
    private async Task<ExistingGradeDto> ApplyGradeAsync(
        Submission submission,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken)
    {
        var instructorId = _currentUser.UserId;

        if (dto.TotalScore < 0)
            throw new ValidationException("Score cannot be negative.");

        if (dto.TotalScore > 100)
            throw new ValidationException("Score cannot exceed 100.");

        var now = DateTime.UtcNow;

        if (submission.Grade is null)
        {
            // Create new grade
            var grade = new Grade
            {
                Id = Guid.NewGuid(),
                SubmissionId = submission.Id,
                InstructorId = instructorId,
                TotalScore = dto.TotalScore,
                RubricBreakdownJson = dto.RubricBreakdownJson ?? "{}",
                OverallComment = dto.OverallComment ?? string.Empty,
                GradedAt = now
            };

            _db.Grades.Add(grade);
            submission.Grade = grade;
        }
        else
        {
            // Update existing grade (re-grade)
            submission.Grade.TotalScore = dto.TotalScore;
            submission.Grade.RubricBreakdownJson = dto.RubricBreakdownJson ?? "{}";
            submission.Grade.OverallComment = dto.OverallComment ?? string.Empty;
            submission.Grade.GradedAt = now;
            submission.Grade.InstructorId = instructorId;
        }

        submission.Status = SubmissionStatus.Graded;
        submission.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        // Enqueue background job to send email notification
        _backgroundJobs.EnqueueGradeNotification(submission.Id);

        return ToDto(submission.Grade!);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/instructor/submissions/{submissionId}/return
    // ─────────────────────────────────────────────────────────────────────────
    public async Task ReturnSubmissionAsync(
        Guid submissionId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var submission = await _db.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .Include(s => s.Grade)
            .Include(s => s.Artifacts)
            .Include(s => s.GitHubInfo)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        // Only allow returning submissions that are submitted (not draft or already returned)
        if (submission.Status is SubmissionStatus.Draft or SubmissionStatus.Returned)
            throw new ValidationException(
                $"Submission is in '{submission.Status}' state and cannot be returned.");

        // Delete the grade if it exists
        if (submission.Grade != null)
        {
            _db.Grades.Remove(submission.Grade);
        }

        // Delete uploaded artifacts and blob files
        if (submission.Artifacts.Count > 0)
        {
            foreach (var artifact in submission.Artifacts)
            {
                // Delete the blob file from storage
                await _blob.DeleteBlobAsync(artifact.BlobPath, cancellationToken);
                _db.SubmissionArtifacts.Remove(artifact);
            }
        }

        // Delete GitHub info if it exists
        if (submission.GitHubInfo != null)
        {
            _db.GitHubSubmissionInfos.Remove(submission.GitHubInfo);
        }

        // Clear submission URLs but keep the Note with the return reason
        submission.Status = SubmissionStatus.Returned;
        submission.FigmaUrl = null;
        submission.GitHubRepoUrl = null;
        submission.HostedUrl = null;
        submission.Note = reason; // Store the return reason in the Note field
        submission.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        // Enqueue background job to send email notification
        _backgroundJobs.EnqueueSubmissionReturnedNotification(submissionId, reason);
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
    private const decimal DefaultMaxScore = 100m;

    private static ExistingGradeDto ToDto(Grade grade)
        => new(
            grade.Id,
            grade.TotalScore,
            grade.RubricBreakdownJson,
            grade.OverallComment,
            grade.GradedAt,
            grade.InstructorId);

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
