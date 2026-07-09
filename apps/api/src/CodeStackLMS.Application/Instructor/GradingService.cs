using CodeStackLMS.Application.BackgroundJobs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Application.Instructor;

/// <summary>
/// Instructor-facing grading workflow: submission detail, grading (including
/// grade-by-student for missing work), and returning submissions.
/// </summary>
public class GradingService : IGradingService
{
    private readonly IApplicationDbContext _db;
    private readonly IBlobStorageService _blob;
    private readonly ICurrentUserService _currentUser;
    private readonly IBackgroundJobService _backgroundJobs;
    private readonly ILogger<GradingService> _logger;

    public GradingService(
        IApplicationDbContext db,
        IBlobStorageService blob,
        ICurrentUserService currentUser,
        IBackgroundJobService backgroundJobs,
        ILogger<GradingService> logger)
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

        // Build artifact list with short-lived read SAS URLs (one blob round-trip
        // each, so generate them concurrently)
        IReadOnlyList<ArtifactDto>? artifacts = null;
        if (submission.Type == SubmissionType.Upload && submission.Artifacts.Count > 0)
        {
            var readExpiry = TimeSpan.FromMinutes(30);
            artifacts = await Task.WhenAll(submission.Artifacts.Select(async a =>
            {
                var readUrl = await _blob.GenerateReadSasAsync(
                    a.BlobPath, readExpiry, cancellationToken);

                return new ArtifactDto(
                    a.Id,
                    a.FileName,
                    a.ContentType,
                    a.Size,
                    readUrl);
            }));
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

        // Remove uploaded artifact rows; blobs are deleted only after the save
        // succeeds, so a failed return can't destroy the student's files
        var blobPathsToDelete = new List<string>();
        if (submission.Artifacts.Count > 0)
        {
            foreach (var artifact in submission.Artifacts)
            {
                blobPathsToDelete.Add(artifact.BlobPath);
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

        // Now that the return is committed, delete the blobs (best-effort —
        // a failure only orphans storage)
        foreach (var path in blobPathsToDelete)
        {
            try
            {
                await _blob.DeleteBlobAsync(path, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to delete blob {BlobPath} after returning submission {SubmissionId}", path, submissionId);
            }
        }

        // Enqueue background job to send email notification
        _backgroundJobs.EnqueueSubmissionReturnedNotification(submissionId, reason);
    }

    private static ExistingGradeDto ToDto(Grade grade)
        => new(
            grade.Id,
            grade.TotalScore,
            grade.RubricBreakdownJson,
            grade.OverallComment,
            grade.GradedAt,
            grade.InstructorId);
}
