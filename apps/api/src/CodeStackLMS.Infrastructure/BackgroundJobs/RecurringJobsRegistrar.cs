using Hangfire;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

/// <summary>
/// Registers all Hangfire recurring jobs. Job arguments must not be computed
/// at registration time — Hangfire serializes them once, so anything like
/// "current week" would be frozen at deploy time. Jobs compute their own
/// time window at execution instead.
/// </summary>
public static class RecurringJobsRegistrar
{
    public static void RegisterAll()
    {
        RecurringJob.AddOrUpdate<WeeklyProgressReportJob>(
            "weekly-progress-reports",
            job => job.ExecuteForCurrentWeekAsync(CancellationToken.None),
            Cron.Weekly(DayOfWeek.Monday, 6));
    }
}
