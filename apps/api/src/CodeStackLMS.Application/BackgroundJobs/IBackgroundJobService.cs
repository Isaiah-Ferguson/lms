namespace CodeStackLMS.Application.BackgroundJobs;

public interface IBackgroundJobService
{
    void EnqueueGradeNotification(Guid submissionId);
    void EnqueueSubmissionReturnedNotification(Guid submissionId, string reason);
    string EnqueueWeeklyProgressReport(DateTime weekOf);
    string EnqueueSingleStudentReport(Guid studentId, DateTime weekOf);
    string EnqueueClassReport(DateTime weekOf);
}
