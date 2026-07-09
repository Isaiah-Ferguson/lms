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
        => Task.FromResult(true);

    public Task DeleteBlobAsync(string blobPath, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
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
