using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Submissions;
using CodeStackLMS.Application.Submissions.DTOs;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CodeStackLMS.Application.Tests;

/// <summary>
/// Covers the upload lifecycle: request → SAS slots → complete → ReadyToGrade.
///
/// Two properties matter most here and are easy to regress:
///   1. A SAS cannot cap size or pin content type, so what the client declares
///      at complete-upload must never be trusted over what storage reports.
///   2. Requesting an upload is not a commitment to finish one — an abandoned
///      re-request must leave the previous attempt and its grade intact.
/// </summary>
public class SubmissionUploadTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly FakeBlobStorageService _blob = new();
    private readonly FakeCurrentUserService _currentUser = new() { Role = "Student" };
    private readonly SubmissionService _sut;

    private readonly Cohort _cohort;
    private readonly Course _course;
    private readonly Module _module;
    private readonly Assignment _assignment;
    private readonly User _student;

    public SubmissionUploadTests()
    {
        _sut = new SubmissionService(
            _db.Context,
            _blob,
            _currentUser,
            new FakeGitHubVerificationService(),
            NullLogger<SubmissionService>.Instance);

        _student = new User
        {
            Id = _currentUser.UserId,
            Name = "Student One",
            Email = "student1@example.com",
            PasswordHash = "hash",
            Role = UserRole.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _cohort = new Cohort { Id = Guid.NewGuid(), Name = "2026", CreatedAt = DateTime.UtcNow };
        _course = new Course { Id = Guid.NewGuid(), Title = "Level 1", CreatedAt = DateTime.UtcNow };
        _module = new Module { Id = Guid.NewGuid(), CourseId = _course.Id, Title = "Week 1", Order = 1, CreatedAt = DateTime.UtcNow };
        _assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            ModuleId = _module.Id,
            Title = "Challenge 1",
            DueDate = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Context.Users.Add(_student);
        _db.Context.Cohorts.Add(_cohort);
        _db.Context.Courses.Add(_course);
        _db.Context.Modules.Add(_module);
        _db.Context.Assignments.Add(_assignment);
        _db.Context.CohortCourses.Add(new CohortCourse { Id = Guid.NewGuid(), CohortId = _cohort.Id, CourseId = _course.Id });
        _db.Context.UserCourseEnrollments.Add(new UserCourseEnrollment
        {
            Id = Guid.NewGuid(),
            UserId = _student.Id,
            CourseId = _course.Id,
            EnrolledAt = DateTime.UtcNow,
        });
        _db.Context.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── The happy path ────────────────────────────────────────────────────────

    [Fact]
    public async Task RequestUpload_IssuesOneSlotPerFile_AndCreatesPendingSubmission()
    {
        var response = await RequestUploadAsync(("solution.zip", 1024));

        var slot = Assert.Single(response.UploadSlots);
        Assert.Equal("solution.zip", slot.FileName);
        Assert.Contains(response.SubmissionId.ToString(), slot.BlobPath);

        var submission = await _db.Context.Submissions.SingleAsync();
        Assert.Equal(SubmissionStatus.PendingUpload, submission.Status);
    }

    [Fact]
    public async Task CompleteUpload_PersistsArtifacts_AndMovesToReadyToGrade()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;
        _blob.Properties[path] = new StoredBlobInfo(2048, "application/zip");

        await _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024)));

        var submission = await _db.Context.Submissions
            .Include(s => s.Artifacts)
            .SingleAsync();

        Assert.Equal(SubmissionStatus.ReadyToGrade, submission.Status);
        var artifact = Assert.Single(submission.Artifacts);
        // Verified size wins over the client's claim of 1024.
        Assert.Equal(2048, artifact.Size);
    }

    [Fact]
    public async Task RequestUpload_SanitizesTraversalInFileNames()
    {
        var response = await RequestUploadAsync(("../../etc/passwd", 512));

        Assert.Equal("passwd", response.UploadSlots[0].FileName);
        Assert.DoesNotContain("..", response.UploadSlots[0].BlobPath);
    }

    // ── H3: declared metadata is not trusted ──────────────────────────────────

    [Fact]
    public async Task CompleteUpload_RejectsBlobLargerThanTheLimit_EvenWhenClientUnderstatesIt()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;

        // Client claims 1 KB; storage actually holds 101 MB.
        _blob.Properties[path] = new StoredBlobInfo(101L * 1024 * 1024, "application/zip");

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024))));

        Assert.Contains(ex.Errors, e => e.Contains("per-file limit"));
        Assert.Empty(await _db.Context.SubmissionArtifacts.ToListAsync());
        // The offending blob is cleaned up rather than left to be re-declared.
        Assert.Contains(path, _blob.Deleted);
    }

    [Fact]
    public async Task CompleteUpload_RejectsDisallowedContentType_EvenWhenClientDeclaresAnAllowedOne()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;

        _blob.Properties[path] = new StoredBlobInfo(1024, "application/x-msdownload");

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024))));

        Assert.Contains(ex.Errors, e => e.Contains("not allowed"));
    }

    [Fact]
    public async Task CompleteUpload_RejectsTotalSizeOverTheLimit()
    {
        var request = await RequestUploadAsync(("a.zip", 1024), ("b.zip", 1024));
        var first = request.UploadSlots[0].BlobPath;
        var second = request.UploadSlots[1].BlobPath;

        _blob.Properties[first] = new StoredBlobInfo(300L * 1024 * 1024, "application/zip");
        _blob.Properties[second] = new StoredBlobInfo(300L * 1024 * 1024, "application/zip");

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CompleteUploadAsync(
                request.SubmissionId,
                Complete((first, "a.zip", 1024), (second, "b.zip", 1024))));

        Assert.Contains(ex.Errors, e => e.Contains("exceeds"));
    }

    [Fact]
    public async Task CompleteUpload_RejectsMissingBlob()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;
        _blob.Deleted.Add(path); // never actually uploaded

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024))));
    }

    [Fact]
    public async Task CompleteUpload_RejectsBlobPathBelongingToAnotherSubmission()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var foreignPath = $"submissions/{_cohort.Id}/{_assignment.Id}/{_student.Id}/{Guid.NewGuid()}/solution.zip";

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.CompleteUploadAsync(request.SubmissionId, Complete((foreignPath, "solution.zip", 1024))));
    }

    [Fact]
    public async Task CompleteUpload_ChecksPathOwnershipBeforeTouchingStorage()
    {
        // Ownership must be rejected without a storage lookup, otherwise the
        // endpoint doubles as an oracle for whether an arbitrary blob exists.
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var foreignPath = $"submissions/{_cohort.Id}/{_assignment.Id}/{_student.Id}/{Guid.NewGuid()}/secret.zip";
        _blob.Properties.Clear();
        _blob.DefaultProperties = null; // any lookup would report "missing"

        // A ValidationException here would mean the existence check ran first.
        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.CompleteUploadAsync(request.SubmissionId, Complete((foreignPath, "secret.zip", 1024))));
    }

    [Fact]
    public async Task CompleteUpload_RejectsDuplicateBlobPaths()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CompleteUploadAsync(
                request.SubmissionId,
                Complete((path, "solution.zip", 1024), (path, "solution.zip", 1024))));
    }

    [Fact]
    public async Task CompleteUpload_OnSomeoneElsesSubmission_IsForbidden()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        _currentUser.UserId = Guid.NewGuid(); // a different student

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.CompleteUploadAsync(
                request.SubmissionId,
                Complete((request.UploadSlots[0].BlobPath, "solution.zip", 1024))));
    }

    // ── H4: an abandoned re-request must not destroy the previous attempt ─────

    [Fact]
    public async Task RequestUpload_OnGradedSubmission_LeavesTheGradeIntact()
    {
        var submissionId = await CompleteAGradedSubmissionAsync();

        // Student asks to resubmit, then walks away without uploading.
        await RequestUploadAsync(("solution.zip", 1024));

        var grade = await _db.Context.Grades.SingleOrDefaultAsync(g => g.SubmissionId == submissionId);
        Assert.NotNull(grade);
        Assert.Equal(88, grade!.TotalScore);

        // The earlier files are still downloadable too.
        Assert.NotEmpty(await _db.Context.SubmissionArtifacts.Where(a => a.SubmissionId == submissionId).ToListAsync());
    }

    [Fact]
    public async Task CompleteUpload_AfterResubmitting_RetiresTheOldGradeAndArtifacts()
    {
        var submissionId = await CompleteAGradedSubmissionAsync();

        var request = await RequestUploadAsync(("second-attempt.zip", 1024));
        Assert.Equal(submissionId, request.SubmissionId);

        var newPath = request.UploadSlots[0].BlobPath;
        _blob.Properties[newPath] = new StoredBlobInfo(4096, "application/zip");

        await _sut.CompleteUploadAsync(request.SubmissionId, Complete((newPath, "second-attempt.zip", 1024)));

        // Now — and only now — the previous attempt is replaced.
        Assert.Null(await _db.Context.Grades.SingleOrDefaultAsync(g => g.SubmissionId == submissionId));

        var artifact = Assert.Single(await _db.Context.SubmissionArtifacts.Where(a => a.SubmissionId == submissionId).ToListAsync());
        Assert.Equal("second-attempt.zip", artifact.FileName);
    }

    [Fact]
    public async Task CompleteUpload_ReusingAFileName_DoesNotDeleteTheJustUploadedBlob()
    {
        // Same filename means the same blob path, overwritten in place. Deleting
        // the "old" path here would wipe the new upload.
        var submissionId = await CompleteAGradedSubmissionAsync();

        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;
        _blob.Properties[path] = new StoredBlobInfo(4096, "application/zip");

        await _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024)));

        Assert.DoesNotContain(path, _blob.Deleted);
        var artifact = Assert.Single(await _db.Context.SubmissionArtifacts.Where(a => a.SubmissionId == submissionId).ToListAsync());
        Assert.Equal(4096, artifact.Size);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Task<UploadUrlResponseDto> RequestUploadAsync(params (string Name, long Size)[] files)
        => _sut.RequestUploadAsync(
            _assignment.Id,
            new RequestUploadDto(
                SubmissionType.Upload,
                files.Select(f => new FileMetaDto(f.Name, "application/zip", f.Size)).ToList(),
                null, null, null, null));

    private static CompleteUploadDto Complete(params (string Path, string Name, long Size)[] files)
        => new(files.Select(f => new CompletedFileDto(f.Path, f.Name, "application/zip", f.Size, "checksum")).ToList());

    /// <summary>Drives a full upload through to a graded submission.</summary>
    private async Task<Guid> CompleteAGradedSubmissionAsync()
    {
        var request = await RequestUploadAsync(("solution.zip", 1024));
        var path = request.UploadSlots[0].BlobPath;
        _blob.Properties[path] = new StoredBlobInfo(1024, "application/zip");

        await _sut.CompleteUploadAsync(request.SubmissionId, Complete((path, "solution.zip", 1024)));

        _db.Context.Grades.Add(new Grade
        {
            Id = Guid.NewGuid(),
            SubmissionId = request.SubmissionId,
            InstructorId = _student.Id, // stand-in; the grader identity is irrelevant here
            TotalScore = 88,
            OverallComment = "Nice work",
            GradedAt = DateTime.UtcNow,
        });

        var submission = await _db.Context.Submissions.SingleAsync(s => s.Id == request.SubmissionId);
        submission.Status = SubmissionStatus.Graded;
        await _db.Context.SaveChangesAsync();

        return request.SubmissionId;
    }
}
