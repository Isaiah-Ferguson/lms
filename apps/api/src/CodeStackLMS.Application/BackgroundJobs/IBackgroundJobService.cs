namespace CodeStackLMS.Application.BackgroundJobs;

public interface IBackgroundJobService
{
    void EnqueueGradeNotification(Guid submissionId);
    void EnqueueSubmissionReturnedNotification(Guid submissionId, string reason);
    string EnqueueWeeklyProgressReport(DateTime weekOf, Guid? cohortId);
    string EnqueueSingleStudentReport(Guid studentId, DateTime weekOf, Guid? cohortId);
    string EnqueueClassReport(DateTime weekOf, Guid? cohortId);
}
