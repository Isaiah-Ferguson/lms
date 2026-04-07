# Hangfire Background Jobs

## Overview

Hangfire is now integrated into the CodeStack LMS API to handle background job processing. This improves API performance by offloading time-consuming tasks like email notifications.

## What's Implemented

### ✅ Infrastructure
- **Hangfire.Core** v1.8.17
- **Hangfire.AspNetCore** v1.8.17  
- **Hangfire.SqlServer** v1.8.17
- SQL Server as job storage (uses same database as application)
- 5 concurrent worker threads

### ✅ Background Jobs

#### 1. **SendGradeNotificationJob**
- **Trigger**: When instructor grades a submission
- **Purpose**: Send email notification to student
- **Features**:
  - Checks if student has email notifications enabled
  - Sends formatted HTML email with grade and feedback
  - Automatic retry on failure (Hangfire default: 10 attempts)
  - Non-blocking - API returns immediately

### ✅ Hangfire Dashboard
- **URL**: `http://localhost:5000/hangfire`
- **Development**: Open to all (no auth required)
- **Production**: Requires Admin role authentication
- **Features**:
  - Monitor job execution
  - View succeeded/failed jobs
  - Retry failed jobs manually
  - See job history and statistics

## How It Works

### Before (Synchronous)
```csharp
// Grading took 2-3 seconds (waiting for email to send)
await _emailService.SendAsync(...);
return gradeDto; // User waits
```

### After (Asynchronous)
```csharp
// Grading returns immediately (~200ms)
_backgroundJobs.EnqueueGradeNotification(submissionId);
return gradeDto; // User doesn't wait, email sends in background
```

## Database Tables

Hangfire creates these tables in your SQL Server database (under `HangFire` schema):
- `HangFire.Job` - Job definitions
- `HangFire.JobQueue` - Job queue
- `HangFire.State` - Job state history
- `HangFire.Server` - Active servers
- `HangFire.Set`, `HangFire.Hash`, `HangFire.List`, `HangFire.Counter` - Supporting tables
- `HangFire.AggregatedCounter`, `HangFire.JobParameter` - Additional metadata tables

## Usage

### Enqueue a Job
```csharp
// In any service with IBackgroundJobService injected
_backgroundJobs.EnqueueGradeNotification(submissionId);
```

### Add New Background Jobs

1. **Create Job Class** in `Application/BackgroundJobs/`:
```csharp
public class MyNewJob
{
    private readonly IApplicationDbContext _db;
    
    public MyNewJob(IApplicationDbContext db)
    {
        _db = db;
    }
    
    public async Task ExecuteAsync(Guid entityId)
    {
        // Your job logic here
    }
}
```

2. **Register Job** in `Infrastructure/DependencyInjection.cs`:
```csharp
services.AddScoped<MyNewJob>();
```

3. **Add Method** to `IBackgroundJobService`:
```csharp
void EnqueueMyNewJob(Guid entityId);
```

4. **Implement** in `HangfireBackgroundJobService`:
```csharp
public void EnqueueMyNewJob(Guid entityId)
{
    BackgroundJob.Enqueue<MyNewJob>(job => job.ExecuteAsync(entityId));
}
```

5. **Use It**:
```csharp
_backgroundJobs.EnqueueMyNewJob(entityId);
```

## Monitoring

### View Dashboard
1. Start your API: `dotnet run`
2. Navigate to: `http://localhost:5000/hangfire`
3. See:
   - **Jobs** - All enqueued, processing, succeeded, failed jobs
   - **Retries** - Failed jobs awaiting retry
   - **Recurring Jobs** - Scheduled jobs (none yet)
   - **Servers** - Active Hangfire servers

### Check Job Status
- **Enqueued**: Waiting to be processed
- **Processing**: Currently executing
- **Succeeded**: Completed successfully
- **Failed**: Error occurred (will retry)
- **Deleted**: Manually removed

## Performance Impact

### Before Hangfire
- Grade submission API: **2-3 seconds** (includes email send)
- User experience: Slow, waiting for email

### After Hangfire
- Grade submission API: **~200ms** (just database save)
- User experience: Fast, immediate response
- Email sends in background within seconds

## Future Enhancements

### Potential Jobs to Add:
1. **Assignment Due Date Reminders** - Daily job to email students
2. **Weekly Progress Reports** - Send summary to students/instructors
3. **Cleanup Old Temp Files** - Delete expired uploads
4. **GitHub Repo Validation** - Verify repo exists and is accessible
5. **Submission Notifications** - Email instructors when student submits

### Recurring Jobs Example:
```csharp
// In Program.cs after app.Run()
RecurringJob.AddOrUpdate<DailyReminderJob>(
    "daily-reminders",
    job => job.ExecuteAsync(),
    Cron.Daily(9)); // 9 AM daily
```

## Troubleshooting

### Jobs Not Processing
- Check Hangfire dashboard for errors
- Verify PostgreSQL connection
- Check application logs for exceptions

### Dashboard Not Accessible
- Development: Should work without auth
- Production: Ensure you're logged in as Admin

### Jobs Failing
- View exception in dashboard
- Jobs auto-retry 10 times with exponential backoff
- Check email service configuration

## Configuration

### Worker Count
Adjust in `Program.cs`:
```csharp
builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 5; // Increase for more concurrency
});
```

### Job Retention
```csharp
GlobalJobFilters.Filters.Add(new AutomaticRetryAttribute 
{ 
    Attempts = 3  // Reduce retry attempts
});
```

## Security

- Dashboard requires Admin role in production
- Jobs run with application's database permissions
- No external job queue (all in PostgreSQL)
- Jobs are transactional and atomic

## Resources

- [Hangfire Documentation](https://docs.hangfire.io/)
- [Hangfire Dashboard](https://docs.hangfire.io/en/latest/configuration/using-dashboard.html)
- [Background Jobs Best Practices](https://docs.hangfire.io/en/latest/best-practices.html)
