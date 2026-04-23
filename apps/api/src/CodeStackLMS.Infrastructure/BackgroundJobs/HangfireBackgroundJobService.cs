using CodeStackLMS.Application.BackgroundJobs;
using Hangfire;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

public class HangfireBackgroundJobService : IBackgroundJobService
{
    public void EnqueueGradeNotification(Guid submissionId)
    {
        BackgroundJob.Enqueue<SendGradeNotificationJob>(job => 
            job.ExecuteAsync(submissionId));
    }

    public void EnqueueSubmissionReturnedNotification(Guid submissionId, string reason)
    {
        BackgroundJob.Enqueue<SendSubmissionReturnedNotificationJob>(job => 
            job.ExecuteAsync(submissionId, reason));
    }
}
