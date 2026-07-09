using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Submissions.DTOs;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeStackLMS.Application.Submissions;

public class SubmissionService : ISubmissionService
{
    // Allowed MIME types → extension whitelist
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/zip",
        "application/x-zip-compressed",
        "application/pdf",
        "text/plain",
        "text/x-python",
        "text/x-java-source",
        "text/x-csrc",
        "text/x-c++src",
        "application/javascript",
        "text/javascript",
        "application/typescript",
        "text/markdown",
        "application/json",
        "application/octet-stream"
    };

    private const long MaxFileSizeBytes = 100 * 1024 * 1024;   // 100 MB per file
    private const long MaxTotalSizeBytes = 500 * 1024 * 1024;  // 500 MB per submission
    private const int MaxFilesPerSubmission = 20;
    private static readonly TimeSpan SasExpiry = TimeSpan.FromMinutes(15);

    private readonly IApplicationDbContext _db;
    private readonly IBlobStorageService _blob;
    private readonly ICurrentUserService _currentUser;
    private readonly IGitHubVerificationService _github;
    private readonly ILogger<SubmissionService> _logger;

    public SubmissionService(
        IApplicationDbContext db,
        IBlobStorageService blob,
        ICurrentUserService currentUser,
        IGitHubVerificationService github,
        ILogger<SubmissionService> logger)
    {
        _db = db;
        _blob = blob;
        _currentUser = currentUser;
        _github = github;
        _logger = logger;
    }

    /// <summary>
    /// Deletes blobs after the owning DB transaction has committed. A failure
    /// here only orphans storage (safe, logged) — never the other way round.
    /// </summary>
    private async Task DeleteBlobsBestEffortAsync(
        IReadOnlyCollection<string> blobPaths,
        CancellationToken cancellationToken)
    {
        foreach (var path in blobPaths)
        {
            try
            {
                await _blob.DeleteBlobAsync(path, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Failed to delete blob {BlobPath} after commit; it is orphaned in storage", path);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{assignmentId}/request-upload
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<UploadUrlResponseDto> RequestUploadAsync(
        Guid assignmentId,
        RequestUploadDto dto,
        CancellationToken cancellationToken = default)
    {
        var studentId = _currentUser.UserId;

        // 2. Load assignment + module + course in one query
        var assignment = await _db.Assignments
            .Include(a => a.Module)
                .ThenInclude(m => m.Course)
                    .ThenInclude(c => c.CohortCourses)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken)
            ?? throw new NotFoundException(nameof(Assignment), assignmentId);

        // 3. Verify due date (allow late submissions — enforce via grading policy instead)
        // if (DateTime.UtcNow > assignment.DueDate)
        //     throw new ValidationException("The assignment due date has passed.");

        // 4. Resolve cohort — student must be enrolled in a cohort that has this course
        var courseId = assignment.Module.CourseId;
        var cohortId = await ResolveCohortForStudentAsync(studentId, courseId, cancellationToken);

        // 5. Validate file list
        ValidateFiles(dto.Files);

        // 6. Check if there's an existing submission to reuse its ID
        var existingSubmission = await _db.Submissions
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == studentId)
            .OrderByDescending(s => s.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);

        // Use existing submission ID if found, otherwise generate new one
        var submissionId = existingSubmission?.Id ?? Guid.NewGuid();
        var expiresAt = DateTimeOffset.UtcNow.Add(SasExpiry);
        var slots = new List<FileUploadSlot>();

        foreach (var file in dto.Files)
        {
            // Sanitize filename — strip directory traversal
            var safeFileName = Path.GetFileName(file.FileName);
            if (string.IsNullOrWhiteSpace(safeFileName))
                throw new ValidationException($"Invalid file name: '{file.FileName}'");

            // Path: submissions/{cohortId}/{assignmentId}/{studentId}/{submissionId}/{fileName}
            var blobPath = BuildBlobPath(cohortId, assignmentId, studentId, submissionId, safeFileName);

            var sasSlot = await _blob.GenerateUploadSasAsync(
                blobPath,
                file.ContentType,
                Math.Min(file.SizeBytes, MaxFileSizeBytes),
                SasExpiry,
                cancellationToken);

            slots.Add(new FileUploadSlot(
                FileName: safeFileName,
                BlobPath: blobPath,
                SasUrl: sasSlot.SasUrl,
                ContentType: file.ContentType,
                MaxSizeBytes: MaxFileSizeBytes));
        }

        // 7. All SAS URLs generated successfully — now persist the submission.
        //    Use the execution strategy to handle transactions with retry logic.
        //    Old blobs are only collected here and deleted AFTER commit, so a
        //    rolled-back transaction can't destroy the still-current attempt.
        var blobPathsToDelete = new List<string>();
        var strategy = _db.Database.CreateExecutionStrategy();
        var submission = await strategy.ExecuteAsync(async () =>
        {
            blobPathsToDelete.Clear(); // retry-safe

            await using var tx = await _db.Database
                .BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

            Submission submissionToUse;

            if (existingSubmission != null)
            {
                // Reload with tracking and includes for update
                var submissionToUpdate = await _db.Submissions
                    .Include(s => s.Artifacts)
                    .Include(s => s.Grade)
                    .Include(s => s.GitHubInfo)
                    .FirstOrDefaultAsync(s => s.Id == existingSubmission.Id, cancellationToken);

                if (submissionToUpdate == null)
                    throw new NotFoundException(nameof(Submission), existingSubmission.Id);

                // Remove old artifact rows; their blobs are deleted post-commit
                if (submissionToUpdate.Artifacts.Count > 0)
                {
                    foreach (var artifact in submissionToUpdate.Artifacts.ToList())
                    {
                        blobPathsToDelete.Add(artifact.BlobPath);
                        _db.SubmissionArtifacts.Remove(artifact);
                    }
                }

                // Remove old grade if exists
                if (submissionToUpdate.Grade != null)
                {
                    _db.Grades.Remove(submissionToUpdate.Grade);
                }

                // Remove old GitHub info if exists
                if (submissionToUpdate.GitHubInfo != null)
                {
                    _db.GitHubSubmissionInfos.Remove(submissionToUpdate.GitHubInfo);
                }

                // Update existing submission with new data
                submissionToUpdate.Type = dto.Type;
                submissionToUpdate.Status = SubmissionStatus.PendingUpload;
                submissionToUpdate.CreatedAt = DateTime.UtcNow; // Update submission date to now
                submissionToUpdate.FigmaUrl = dto.FigmaUrl;
                submissionToUpdate.GitHubRepoUrl = dto.GitHubRepoUrl;
                submissionToUpdate.HostedUrl = dto.HostedUrl;
                submissionToUpdate.Note = dto.Note;

                submissionToUse = submissionToUpdate;
            }
            else
            {
                // No existing submission - create new one
                var newSubmission = new Submission
                {
                    Id = submissionId,
                    AssignmentId = assignmentId,
                    StudentId = studentId,
                    AttemptNumber = 1,
                    Type = dto.Type,
                    Status = SubmissionStatus.PendingUpload,
                    CreatedAt = DateTime.UtcNow,
                    FigmaUrl = dto.FigmaUrl,
                    GitHubRepoUrl = dto.GitHubRepoUrl,
                    HostedUrl = dto.HostedUrl,
                    Note = dto.Note
                };

                _db.Submissions.Add(newSubmission);
                submissionToUse = newSubmission;
            }

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return submissionToUse;
        });

        await DeleteBlobsBestEffortAsync(blobPathsToDelete, cancellationToken);

        return new UploadUrlResponseDto(submission.Id, slots, expiresAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{submissionId}/complete-upload
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<SubmissionResponseDto> CompleteUploadAsync(
        Guid submissionId,
        CompleteUploadDto dto,
        CancellationToken cancellationToken = default)
    {
        var studentId = _currentUser.UserId;

        // 1. Load submission
        var submission = await _db.Submissions
            .Include(s => s.Artifacts)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        // 2. Ownership guard
        if (submission.StudentId != studentId)
            throw new ForbiddenException("You can only complete your own submissions.");

        // 3. State guard — must be PendingUpload
        if (submission.Status != SubmissionStatus.PendingUpload)
            throw new ValidationException(
                $"Submission is in '{submission.Status}' state and cannot be completed.");

        // 4. Verify every declared blob actually exists in storage
        //    (prevents marking complete without uploading)
        var verificationTasks = dto.Files.Select(f =>
            _blob.BlobExistsAsync(f.BlobPath, cancellationToken));

        var existsResults = await Task.WhenAll(verificationTasks);
        var missing = dto.Files
            .Zip(existsResults)
            .Where(x => !x.Second)
            .Select(x => x.First.BlobPath)
            .ToList();

        if (missing.Count > 0)
            throw new ValidationException(
                $"The following blobs were not found in storage: {string.Join(", ", missing)}");

        // 5. Validate blob paths belong to this submission (prevent path injection).
        //    Paths are built as submissions/{cohort}/{assignment}/{student}/{submission}/{file}
        //    (see BuildBlobPath), so require the submission-id path segment to match
        //    exactly rather than a substring anywhere in the path.
        foreach (var file in dto.Files)
        {
            var segments = file.BlobPath.Split('/');
            var ownsPath = segments.Length >= 6
                && segments[0] == "submissions"
                && string.Equals(segments[4], submissionId.ToString(), StringComparison.OrdinalIgnoreCase);

            if (!ownsPath)
                throw new ForbiddenException(
                    $"Blob path '{file.BlobPath}' does not belong to submission '{submissionId}'.");
        }

        // 6. Persist SubmissionArtifacts
        foreach (var file in dto.Files)
        {
            _db.SubmissionArtifacts.Add(new SubmissionArtifact
            {
                Id = Guid.NewGuid(),
                SubmissionId = submission.Id,
                BlobPath = file.BlobPath,
                FileName = file.FileName,
                ContentType = file.ContentType,
                Size = file.SizeBytes,
                Checksum = file.Checksum,
                CreatedAt = DateTime.UtcNow
            });
        }

        // 7. Transition: PendingUpload → ReadyToGrade
        //    Set to ReadyToGrade immediately since artifacts are already validated during upload
        //    If background processing is needed in the future, use Processing status and implement background job
        submission.Status = SubmissionStatus.ReadyToGrade;

        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(submission);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{assignmentId}/github-submit
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<SubmissionResponseDto> GitHubSubmitAsync(
        Guid assignmentId,
        GitHubSubmitDto dto,
        CancellationToken cancellationToken = default)
    {
        var studentId = _currentUser.UserId;

        // 1. Validate repoUrl format (cheap fast-fail before any network/DB work).
        if (!IsValidGitHubUrl(dto.RepoUrl))
            throw new ValidationException(
                "repoUrl must be a valid GitHub repository URL (https://github.com/owner/repo).");

        // 2. Load assignment + enrollment check.
        var assignment = await _db.Assignments
            .Include(a => a.Module)
                .ThenInclude(m => m.Course)
                    .ThenInclude(c => c.CohortCourses)
            .FirstOrDefaultAsync(a => a.Id == assignmentId, cancellationToken)
            ?? throw new NotFoundException(nameof(Assignment), assignmentId);

        // Late submissions are allowed (enforced via grading policy), matching the upload flow.

        var courseId = assignment.Module.CourseId;
        await ResolveCohortForStudentAsync(studentId, courseId, cancellationToken);

        // 3. Verify the repo is public and resolve the latest commit on the branch.
        //    Done before opening a transaction so a slow/failed GitHub call holds no DB locks.
        var repoInfo = await _github.VerifyAndResolveAsync(dto.RepoUrl, dto.Branch, cancellationToken);
        var normalizedRepo = dto.RepoUrl.TrimEnd('/');

        // 4. Reuse the student's existing submission for this assignment (a single
        //    "My Submission"), mirroring the upload flow rather than stacking attempts.
        var existingSubmission = await _db.Submissions
            .Where(s => s.AssignmentId == assignmentId && s.StudentId == studentId)
            .OrderByDescending(s => s.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);

        // Old blobs are collected inside the transaction and deleted only after
        // commit, so a rollback can't destroy the still-current attempt.
        var blobPathsToDelete = new List<string>();
        var strategy = _db.Database.CreateExecutionStrategy();
        var submission = await strategy.ExecuteAsync(async () =>
        {
            blobPathsToDelete.Clear(); // retry-safe

            await using var tx = await _db.Database
                .BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

            Submission submissionToUse;

            if (existingSubmission != null)
            {
                var submissionToUpdate = await _db.Submissions
                    .Include(s => s.Artifacts)
                    .Include(s => s.Grade)
                    .Include(s => s.GitHubInfo)
                    .FirstOrDefaultAsync(s => s.Id == existingSubmission.Id, cancellationToken)
                    ?? throw new NotFoundException(nameof(Submission), existingSubmission.Id);

                // Clear any prior artifacts (e.g. a previous ZIP attempt);
                // their blobs are deleted post-commit.
                foreach (var artifact in submissionToUpdate.Artifacts.ToList())
                {
                    blobPathsToDelete.Add(artifact.BlobPath);
                    _db.SubmissionArtifacts.Remove(artifact);
                }

                if (submissionToUpdate.Grade != null)
                    _db.Grades.Remove(submissionToUpdate.Grade);

                if (submissionToUpdate.GitHubInfo != null)
                    _db.GitHubSubmissionInfos.Remove(submissionToUpdate.GitHubInfo);

                submissionToUpdate.Type = SubmissionType.GitHub;
                submissionToUpdate.Status = SubmissionStatus.ReadyToGrade;
                submissionToUpdate.CreatedAt = DateTime.UtcNow;
                submissionToUpdate.FigmaUrl = dto.FigmaUrl;
                submissionToUpdate.GitHubRepoUrl = normalizedRepo;
                submissionToUpdate.HostedUrl = dto.HostedUrl;
                submissionToUpdate.Note = dto.Note;

                submissionToUse = submissionToUpdate;
            }
            else
            {
                var newSubmission = new Submission
                {
                    Id = Guid.NewGuid(),
                    AssignmentId = assignmentId,
                    StudentId = studentId,
                    AttemptNumber = 1,
                    Type = SubmissionType.GitHub,
                    Status = SubmissionStatus.ReadyToGrade,
                    CreatedAt = DateTime.UtcNow,
                    FigmaUrl = dto.FigmaUrl,
                    GitHubRepoUrl = normalizedRepo,
                    HostedUrl = dto.HostedUrl,
                    Note = dto.Note
                };

                _db.Submissions.Add(newSubmission);
                submissionToUse = newSubmission;
            }

            // Persist the removals/update first so the old 1:1 GitHubInfo is gone before
            // the new one is inserted (the SubmissionId index is unique).
            await _db.SaveChangesAsync(cancellationToken);

            _db.GitHubSubmissionInfos.Add(new GitHubSubmissionInfo
            {
                Id = Guid.NewGuid(),
                SubmissionId = submissionToUse.Id,
                RepoUrl = normalizedRepo,
                Branch = repoInfo.Branch,
                CommitHash = repoInfo.CommitHash,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return submissionToUse;
        });

        await DeleteBlobsBestEffortAsync(blobPathsToDelete, cancellationToken);

        return ToDto(submission);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/submissions/{submissionId}/artifacts
    // ─────────────────────────────────────────────────────────────────────────
    public async Task<ArtifactListDto> GetArtifactsAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default)
    {
        var callerId = _currentUser.UserId;

        // 1. Load submission with artifacts (no navigation beyond what we need)
        var submission = await _db.Submissions
            .Include(s => s.Artifacts)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        // 2. Authorization
        //    - Student: must own the submission
        //    - Instructor / Admin: role is sufficient
        //      (extend this check once Course.InstructorId is added to the domain)
        var isStudent = _currentUser.Role == nameof(UserRole.Student);
        var isInstructorOrAdmin = _currentUser.IsStaff();

        if (isStudent)
        {
            if (submission.StudentId != callerId)
                throw new ForbiddenException(
                    "You do not have access to this submission's artifacts.");
        }
        else if (!isInstructorOrAdmin)
        {
            throw new ForbiddenException("Insufficient role to access submission artifacts.");
        }

        // 3. Only Upload-type submissions have artifacts
        if (submission.Artifacts.Count == 0)
            return new ArtifactListDto(submissionId, Array.Empty<ArtifactDownloadDto>(), DateTimeOffset.UtcNow);

        // 4. Generate a read-only SAS per artifact — 10-minute expiry, concurrently
        var expiry = TimeSpan.FromMinutes(10);
        var expiresAt = DateTimeOffset.UtcNow.Add(expiry);

        var artifacts = await Task.WhenAll(submission.Artifacts.Select(async artifact =>
        {
            var downloadUrl = await _blob.GenerateReadSasAsync(
                artifact.BlobPath, expiry, cancellationToken);

            return ToDto(artifact, downloadUrl, expiresAt);
        }));

        return new ArtifactListDto(submissionId, artifacts, expiresAt);
    }

    public async Task<SubmissionResponseDto> GetSubmissionStatusAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default)
    {
        var isPrivileged = _currentUser.IsStaff();

        var submission = await _db.Submissions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken)
            ?? throw new NotFoundException(nameof(Submission), submissionId);

        if (!isPrivileged && submission.StudentId != _currentUser.UserId)
            throw new ForbiddenException("You do not have access to this submission.");

        return ToDto(submission);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mappers
    // ─────────────────────────────────────────────────────────────────────────
    private static SubmissionResponseDto ToDto(Submission submission)
        => new(
            submission.Id,
            submission.AssignmentId,
            submission.StudentId,
            submission.AttemptNumber,
            submission.Type,
            submission.Status,
            submission.CreatedAt,
            submission.FigmaUrl,
            submission.GitHubRepoUrl,
            submission.HostedUrl);

    private static ArtifactDownloadDto ToDto(
        SubmissionArtifact artifact,
        string downloadUrl,
        DateTimeOffset expiresAt)
        => new(
            artifact.Id,
            artifact.FileName,
            artifact.ContentType,
            artifact.Size,
            artifact.Checksum,
            downloadUrl,
            expiresAt);

    private static bool IsValidGitHubUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;
        // Must have at least /owner/repo path segments
        var segments = uri.AbsolutePath.Trim('/').Split('/');
        return segments.Length >= 2 &&
               segments[0].Length > 0 &&
               segments[1].Length > 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<Guid> ResolveCohortForStudentAsync(
        Guid studentId, Guid courseId, CancellationToken ct)
    {
        // Verify the student is actually enrolled in this course.
        var isEnrolled = await _db.UserCourseEnrollments
            .AnyAsync(e => e.UserId == studentId && e.CourseId == courseId, ct);

        if (!isEnrolled)
            throw new ForbiddenException("You are not enrolled in a cohort for this course.");

        // Collect all cohort IDs that include this course.
        var cohortIds = await _db.CohortCourses
            .Where(cc => cc.CourseId == courseId)
            .Select(cc => cc.CohortId)
            .ToListAsync(ct);

        if (cohortIds.Count == 0)
            throw new ForbiddenException("No cohort is configured for this course.");

        // Fast path: only one cohort has this course.
        if (cohortIds.Count == 1)
            return cohortIds[0];

        // Multiple cohorts share this course. The schema has no direct student→cohort
        // membership, so use an enrollment-overlap heuristic: pick the cohort whose
        // course list has the most courses in common with the student's enrollments.
        // This identifies the cohort the student is actually part of.
        var studentCourseIds = await _db.UserCourseEnrollments
            .Where(e => e.UserId == studentId)
            .Select(e => e.CourseId)
            .ToListAsync(ct);

        var bestCohortId = await _db.CohortCourses
            .Where(cc => cohortIds.Contains(cc.CohortId) && studentCourseIds.Contains(cc.CourseId))
            .GroupBy(cc => cc.CohortId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefaultAsync(ct);

        // Fall back to the first cohort if no overlap was found (e.g. single-course enrollment).
        return bestCohortId == Guid.Empty ? cohortIds[0] : bestCohortId;
    }

    private static void ValidateFiles(List<FileMetaDto> files)
    {
        if (files == null || files.Count == 0)
            throw new ValidationException("At least one file is required.");

        if (files.Count > MaxFilesPerSubmission)
            throw new ValidationException(
                $"A submission may contain at most {MaxFilesPerSubmission} files.");

        var totalSize = files.Sum(f => f.SizeBytes);
        if (totalSize > MaxTotalSizeBytes)
            throw new ValidationException(
                $"Total upload size {totalSize / 1024 / 1024} MB exceeds the {MaxTotalSizeBytes / 1024 / 1024} MB limit.");

        foreach (var file in files)
        {
            if (file.SizeBytes <= 0)
                throw new ValidationException($"File '{file.FileName}' has an invalid size.");

            if (file.SizeBytes > MaxFileSizeBytes)
                throw new ValidationException(
                    $"File '{file.FileName}' exceeds the {MaxFileSizeBytes / 1024 / 1024} MB per-file limit.");

            if (!AllowedContentTypes.Contains(file.ContentType))
                throw new ValidationException(
                    $"Content type '{file.ContentType}' is not allowed for file '{file.FileName}'.");

            // Prevent double-extension attacks e.g. "malware.exe.zip"
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext is ".exe" or ".bat" or ".cmd" or ".sh" or ".ps1" or ".msi" or ".dll")
                throw new ValidationException(
                    $"File extension '{ext}' is not permitted.");
        }
    }

    private static string BuildBlobPath(
        Guid cohortId, Guid assignmentId, Guid studentId, Guid submissionId, string fileName)
        => $"submissions/{cohortId}/{assignmentId}/{studentId}/{submissionId}/{fileName}";
}
