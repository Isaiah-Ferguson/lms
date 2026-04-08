namespace CodeStackLMS.Application.BackgroundJobs;

public interface IBackgroundJobService
{
    void EnqueueGradeNotification(Guid submissionId);
    void EnqueueSubmissionNotification(Guid submissionId);
    void EnqueueSubmissionReturnedNotification(Guid submissionId, string reason);
}
