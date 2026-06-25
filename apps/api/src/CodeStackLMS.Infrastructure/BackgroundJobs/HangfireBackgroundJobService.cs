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

    public string EnqueueWeeklyProgressReport(DateTime weekOf, Guid? cohortId)
    {
        return BackgroundJob.Enqueue<WeeklyProgressReportJob>(job =>
            job.ExecuteAsync(weekOf, cohortId, CancellationToken.None));
    }

    public string EnqueueSingleStudentReport(Guid studentId, DateTime weekOf, Guid? cohortId)
    {
        return BackgroundJob.Enqueue<WeeklyProgressReportJob>(job =>
            job.ExecuteSingleStudentAsync(studentId, weekOf, cohortId, CancellationToken.None));
    }

    public string EnqueueClassReport(DateTime weekOf, Guid? cohortId)
    {
        return BackgroundJob.Enqueue<WeeklyProgressReportJob>(job =>
            job.ExecuteClassReportAsync(weekOf, cohortId, CancellationToken.None));
    }
}
