using CodeStackLMS.Application.BackgroundJobs;
using CodeStackLMS.Application.Common.Interfaces;

namespace CodeStackLMS.Application.Tests.TestSupport;

public sealed class FakeEmailService : IEmailService
{
    public List<(string To, string Subject, string Body)> Sent { get; } = [];
    public bool ThrowOnSend { get; set; }

    public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (ThrowOnSend)
            throw new InvalidOperationException("SMTP unavailable (test)");
        Sent.Add((toEmail, subject, htmlBody));
        return Task.CompletedTask;
    }
}

public sealed class FakeCurrentUserService : ICurrentUserService
{
    public Guid UserId { get; set; } = Guid.NewGuid();
    public string Role { get; set; } = "Student";
}

public sealed class FakeBlobStorageService : IBlobStorageService
{
    public Task<BlobUploadSlot> GenerateUploadSasAsync(string blobPath, string contentType, long maxSizeBytes, TimeSpan expiry, CancellationToken cancellationToken = default)
        => Task.FromResult(new BlobUploadSlot(blobPath, $"https://test.blob/{blobPath}?sas", DateTimeOffset.UtcNow.Add(expiry)));

    public Task<string> GenerateReadSasAsync(string blobPath, TimeSpan expiry, CancellationToken cancellationToken = default)
        => Task.FromResult($"https://test.blob/{blobPath}?sas");

    public Task UploadBlobAsync(string blobPath, Stream content, string contentType, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task<bool> BlobExistsAsync(string blobPath, CancellationToken cancellationToken = default)
        => Task.FromResult(!Deleted.Contains(blobPath));

    /// <summary>
    /// What storage reports for a given path. Tests set these to simulate a
    /// client that declared one thing and uploaded another.
    /// </summary>
    public Dictionary<string, StoredBlobInfo> Properties { get; } = new();

    /// <summary>Default returned for any path not present in <see cref="Properties"/>.</summary>
    public StoredBlobInfo? DefaultProperties { get; set; } = new(1024, "application/zip");

    public List<string> Deleted { get; } = [];

    public Task<StoredBlobInfo?> GetBlobPropertiesAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (Deleted.Contains(blobPath))
            return Task.FromResult<StoredBlobInfo?>(null);

        return Task.FromResult(
            Properties.TryGetValue(blobPath, out var props) ? props : DefaultProperties);
    }

    public Task DeleteBlobAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        Deleted.Add(blobPath);
        return Task.CompletedTask;
    }
}

public sealed class FakeGitHubVerificationService : IGitHubVerificationService
{
    public GitHubRepoInfo Result { get; set; } = new("main", "abc123");

    public Task<GitHubRepoInfo> VerifyAndResolveAsync(string repoUrl, string? branch, CancellationToken cancellationToken = default)
        => Task.FromResult(Result);
}

public sealed class FakeBackgroundJobService : IBackgroundJobService
{
    public List<Guid> GradeNotifications { get; } = [];
    public List<(Guid SubmissionId, string Reason)> ReturnedNotifications { get; } = [];

    public void EnqueueGradeNotification(Guid submissionId) => GradeNotifications.Add(submissionId);

    public void EnqueueSubmissionReturnedNotification(Guid submissionId, string reason)
        => ReturnedNotifications.Add((submissionId, reason));

    public string EnqueueWeeklyProgressReport(DateTime weekOf, Guid? cohortId) => "job-1";

    public string EnqueueSingleStudentReport(Guid studentId, DateTime weekOf, Guid? cohortId) => "job-2";

    public string EnqueueClassReport(DateTime weekOf, Guid? cohortId) => "job-3";
}
