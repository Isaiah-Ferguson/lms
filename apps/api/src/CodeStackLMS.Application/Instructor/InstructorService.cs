using CodeStackLMS.Application.BackgroundJobs;
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
        var instructorId = _currentUser.UserId;

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
                SubmissionId = submissionId,
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
        _backgroundJobs.EnqueueGradeNotification(submissionId);

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

        // Get course IDs for the specified year (cohort) if yearId is provided
        List<Guid>? yearCourseIds = null;
        if (!string.IsNullOrWhiteSpace(yearId) && Guid.TryParse(yearId, out var parsedYearId))
        {
            yearCourseIds = await _db.CohortCourses
                .AsNoTracking()
                .Where(cc => cc.CohortId == parsedYearId)
                .Select(cc => cc.CourseId)
                .ToListAsync(cancellationToken);
        }

        // Get all submissions with necessary includes
        var allSubmissions = await _db.Submissions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .ThenInclude(a => a.Module)
            .ThenInclude(m => m.Course)
            .Include(s => s.Grade)
            .ToListAsync(cancellationToken);

        // Filter by year (cohort) if provided - only include submissions for courses in that cohort
        // If yearId is provided but has no courses, show empty results (not all submissions)
        if (yearCourseIds != null)
        {
            allSubmissions = allSubmissions
                .Where(s => yearCourseIds.Contains(s.Assignment.Module.CourseId))
                .ToList();
        }

        // Filter by course (GUID or slug)
        if (!string.IsNullOrWhiteSpace(courseId))
        {
            if (Guid.TryParse(courseId, out var parsedCourseId))
                allSubmissions = allSubmissions.Where(s => s.Assignment.Module.CourseId == parsedCourseId).ToList();
            else
            {
                var resolvedTitle = await ResolveCourseTitleFromSlugAsync(courseId, cancellationToken);
                if (resolvedTitle != null)
                    allSubmissions = allSubmissions.Where(s => s.Assignment.Module.Course.Title == resolvedTitle).ToList();
            }
        }

        // Group by student + assignment and take only the latest submission (highest attempt number)
        var latestSubmissions = allSubmissions
            .GroupBy(s => new { s.StudentId, s.AssignmentId })
            .Select(g => g.OrderByDescending(s => s.AttemptNumber).First())
            .ToList();

        // Filter out intermediate statuses - only show submissions that are actionable for instructors
        latestSubmissions = latestSubmissions
            .Where(s => s.Status == SubmissionStatus.ReadyToGrade || 
                       s.Status == SubmissionStatus.Graded || 
                       s.Status == SubmissionStatus.Returned)
            .ToList();

        // Filter by status after getting latest submissions
        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<SubmissionStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            latestSubmissions = latestSubmissions.Where(s => s.Status == parsedStatus).ToList();
        }

        var totalCount = latestSubmissions.Count;

        // Order by created date and paginate
        var submissions = latestSubmissions
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = submissions.Select(s => new SubmissionQueueItemDto(
            s.Id,
            s.Student.Name,
            s.Student.Email,
            s.Assignment.Title,
            s.Assignment.Module.Course.Title,
            s.Type,
            s.Status,
            s.CreatedAt,
            s.Grade?.GradedAt,
            s.Grade?.TotalScore,
            100,
            s.Assignment.DueDate)).ToList();

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

        // Resolve course - prefer courses with modules to avoid empty duplicates
        Course? course = null;
        if (Guid.TryParse(courseId, out var pid))
            course = await _db.Courses.AsNoTracking()
                .Include(c => c.Modules)
                .FirstOrDefaultAsync(c => c.Id == pid, cancellationToken);
        else
        {
            var resolvedTitle = await ResolveCourseTitleFromSlugAsync(courseId, cancellationToken);
            if (resolvedTitle != null)
            {
                var courses = await _db.Courses.AsNoTracking()
                    .Where(c => c.Title == resolvedTitle)
                    .Include(c => c.Modules)
                    .ToListAsync(cancellationToken);
                course = courses.FirstOrDefault(c => c.Modules.Any())
                         ?? courses.OrderByDescending(c => c.CreatedAt).FirstOrDefault();
            }
        }

        if (course == null)
            return new StudentGradesDto(courseId, courseId, []);

        // If cohortId is provided, verify the course belongs to that cohort
        if (parsedCohortId.HasValue)
        {
            var courseInCohort = await _db.CohortCourses
                .AsNoTracking()
                .AnyAsync(cc => cc.CohortId == parsedCohortId.Value && cc.CourseId == course.Id, cancellationToken);

            // If the course doesn't belong to this cohort, return empty results
            if (!courseInCohort)
            {
                return new StudentGradesDto(course.Id.ToString(), course.Title, []);
            }
        }

        // Get all assignments in this course
        var assignments = await _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module)
            .Where(a => a.Module.CourseId == course.Id)
            .OrderBy(a => a.Module.Order)
            .ThenBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        // Get latest submission per assignment for this student
        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var submissions = await _db.Submissions
            .AsNoTracking()
            .Include(s => s.Grade)
                .ThenInclude(g => g!.Instructor)
            .Where(s => s.StudentId == userId && assignmentIds.Contains(s.AssignmentId))
            .ToListAsync(cancellationToken);

        var latestByAssignment = submissions
            .GroupBy(s => s.AssignmentId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.AttemptNumber).First());

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

        // Special case: "combine" means all courses
        bool isCombined = courseId.Trim().Equals("combine", StringComparison.OrdinalIgnoreCase);

        // Resolve course - prefer courses with modules to avoid empty duplicates
        Course? course = null;
        if (!isCombined)
        {
            if (Guid.TryParse(courseId, out var pid))
            {
                course = await _db.Courses.AsNoTracking()
                    .Include(c => c.Modules)
                    .FirstOrDefaultAsync(c => c.Id == pid, cancellationToken);
            }
            else
            {
                var resolvedTitle = await ResolveCourseTitleFromSlugAsync(courseId, cancellationToken);
                if (resolvedTitle != null)
                {
                    var courses = await _db.Courses.AsNoTracking()
                        .Where(c => c.Title == resolvedTitle)
                        .Include(c => c.Modules)
                        .ToListAsync(cancellationToken);
                    course = courses.FirstOrDefault(c => c.Modules.Any())
                             ?? courses.OrderByDescending(c => c.CreatedAt).FirstOrDefault();
                }
            }

            if (course == null)
                return new AdminGradesDto(courseId, courseId, []);
        }

        // Get cohort course IDs if filtering by cohort
        List<Guid>? cohortCourseIds = null;
        if (parsedCohortId.HasValue)
        {
            cohortCourseIds = await _db.CohortCourses
                .AsNoTracking()
                .Where(cc => cc.CohortId == parsedCohortId.Value)
                .Select(cc => cc.CourseId)
                .ToListAsync(cancellationToken);

            // If filtering by single course and cohort, verify course is in cohort
            if (!isCombined && course != null && !cohortCourseIds.Contains(course.Id))
            {
                return new AdminGradesDto(course.Id.ToString(), course.Title, []);
            }
        }

        // Assignments - either for specific course or all courses
        IQueryable<Assignment> assignmentsQuery = _db.Assignments
            .AsNoTracking()
            .Include(a => a.Module);

        if (!isCombined && course != null)
        {
            assignmentsQuery = assignmentsQuery.Where(a => a.Module.CourseId == course.Id);
        }
        else if (isCombined && cohortCourseIds != null)
        {
            // For combined view with cohort filter, only get assignments from courses in that cohort
            assignmentsQuery = assignmentsQuery.Where(a => cohortCourseIds.Contains(a.Module.CourseId));
        }

        var assignments = await assignmentsQuery
            .OrderBy(a => a.Module.Order)
            .ThenBy(a => a.DueDate)
            .ToListAsync(cancellationToken);

        var assignmentIds = assignments.Select(a => a.Id).ToList();

        // All enrolled students - filter by cohort if provided
        var enrolledStudentsQuery = _db.UserCourseEnrollments
            .AsNoTracking()
            .Include(e => e.User)
            .Where(e => e.User.Role == UserRole.Student);

        // Filter by course if not combined
        if (!isCombined && course != null)
        {
            enrolledStudentsQuery = enrolledStudentsQuery.Where(e => e.CourseId == course.Id);
        }
        else if (isCombined && cohortCourseIds != null)
        {
            // For combined view, filter enrollments to only courses in this cohort
            enrolledStudentsQuery = enrolledStudentsQuery.Where(e => cohortCourseIds.Contains(e.CourseId));
        }

        var enrolledStudents = await enrolledStudentsQuery
            .Select(e => e.User)
            .Distinct()
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);

        // All submissions for this course
        var allSubmissions = await _db.Submissions
            .AsNoTracking()
            .Include(s => s.Grade)
                .ThenInclude(g => g!.Instructor)
            .Where(s => assignmentIds.Contains(s.AssignmentId))
            .ToListAsync(cancellationToken);

        var subsByStudentAndAssignment = allSubmissions
            .GroupBy(s => (s.StudentId, s.AssignmentId))
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.AttemptNumber).First());

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

        string displayId;
        string displayTitle;
        
        if (isCombined)
        {
            displayId = "combine";
            displayTitle = "All Courses Combined";
        }
        else if (course != null)
        {
            displayId = course.Id.ToString();
            displayTitle = course.Title;
        }
        else
        {
            displayId = courseId;
            displayTitle = courseId;
        }
        
        return new AdminGradesDto(displayId, displayTitle, studentDtos);
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
            else if (submission.Status == SubmissionStatus.ReadyToGrade || submission.Status == SubmissionStatus.Grading)
                status = "NeedsGrading";
            else if (submission.Status == SubmissionStatus.Returned)
                status = "Returned";
            else
                status = "Submitted";

            string? grade = null;
            if (submission?.Grade != null)
            {
                var maxScore = 100m;
                grade = maxScore > 0 
                    ? $"{submission.Grade.TotalScore} / {maxScore}"
                    : $"{submission.Grade.TotalScore}%";
            }

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

    private static StudentGradeRowDto ToGradeRow(Assignment a, Submission? sub)
    {
        var status = sub == null
            ? "Missing"
            : sub.Status == SubmissionStatus.Graded ? "Graded" : "Pending";

        return new StudentGradeRowDto(
            sub?.Id ?? Guid.Empty,
            a.Id,
            a.Title ?? "Untitled Assignment",
            "Assignment",
            DefaultMaxScore,
            sub?.Grade?.TotalScore,
            status,
            sub?.Grade?.GradedAt,
            sub?.Grade?.OverallComment,
            sub?.Grade?.Instructor?.Name);
    }

    private async Task<string?> ResolveCourseTitleFromSlugAsync(string slug, CancellationToken ct)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        var titles = await _db.Courses
            .AsNoTracking()
            .Select(c => c.Title)
            .ToListAsync(ct);

        return titles.FirstOrDefault(t =>
            t.Trim().ToLowerInvariant().Replace(" ", "-") == normalized);
    }
}
