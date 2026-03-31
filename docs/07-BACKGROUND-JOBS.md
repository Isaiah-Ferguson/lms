# CodeStack LMS - Background Jobs & Async Operations

## Overview

Background jobs handle time-consuming or non-critical operations asynchronously to keep API responses fast and improve user experience. We use **Hangfire** for job scheduling and execution.

---

## Job Processing Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   API       │         │  Hangfire   │         │  PostgreSQL │
│  Request    │────────▶│   Server    │────────▶│  Job Queue  │
│             │ Enqueue │             │  Poll   │             │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              │ Execute
                              ▼
                        ┌─────────────┐
                        │  Job Worker │
                        │   Thread    │
                        └─────────────┘
```

**Key Benefits**:
- Non-blocking API responses
- Automatic retry on failure
- Job persistence (survives server restarts)
- Dashboard for monitoring
- Scheduled/recurring jobs

---

## Job Categories

### 1. Notification Jobs
Send emails/notifications to users about important events.

### 2. Data Processing Jobs
Heavy computations or data transformations.

### 3. Cleanup Jobs
Periodic maintenance tasks.

### 4. Integration Jobs
External API calls (e.g., GitHub validation).

---

## Job Implementations

### 1. Send Submission Notification Job

**Trigger**: Student submits assignment  
**Purpose**: Notify instructor of new submission  
**Priority**: High  
**Retry**: 3 attempts

```csharp
public class SendSubmissionNotificationJob
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IEmailService _emailService;
    
    public SendSubmissionNotificationJob(
        IApplicationDbContext dbContext,
        IEmailService emailService)
    {
        _dbContext = dbContext;
        _emailService = emailService;
    }
    
    public async Task ExecuteAsync(Guid submissionId)
    {
        var submission = await _dbContext.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assignment)
            .ThenInclude(a => a.Course)
            .ThenInclude(c => c.Instructor)
            .FirstOrDefaultAsync(s => s.Id == submissionId);
        
        if (submission == null)
            throw new NotFoundException($"Submission {submissionId} not found");
        
        var instructor = submission.Assignment.Course.Instructor;
        var student = submission.Student;
        var assignment = submission.Assignment;
        
        await _emailService.SendAsync(new EmailMessage
        {
            To = instructor.Email,
            Subject = $"New Submission: {assignment.Title}",
            Body = $@"
                <h2>New Submission Received</h2>
                <p><strong>Student:</strong> {student.FirstName} {student.LastName}</p>
                <p><strong>Assignment:</strong> {assignment.Title}</p>
                <p><strong>Course:</strong> {submission.Assignment.Course.Title}</p>
                <p><strong>Submitted:</strong> {submission.SubmittedAt:f}</p>
                <p><a href='https://codestack.com/grading/{submissionId}'>View Submission</a></p>
            "
        });
    }
}
```

**Enqueue**:
```csharp
_backgroundJobService.Enqueue<SendSubmissionNotificationJob>(
    job => job.ExecuteAsync(submissionId));
```

---

### 2. Send Grade Published Notification Job

**Trigger**: Instructor publishes grade  
**Purpose**: Notify student of graded assignment  
**Priority**: High  
**Retry**: 3 attempts

```csharp
public class SendGradePublishedNotificationJob
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IEmailService _emailService;
    
    public async Task ExecuteAsync(Guid gradeId)
    {
        var grade = await _dbContext.Grades
            .Include(g => g.Submission)
            .ThenInclude(s => s.Student)
            .Include(g => g.Submission)
            .ThenInclude(s => s.Assignment)
            .ThenInclude(a => a.Course)
            .FirstOrDefaultAsync(g => g.Id == gradeId);
        
        if (grade == null || grade.Status != GradeStatus.Published)
            return;
        
        var student = grade.Submission.Student;
        var assignment = grade.Submission.Assignment;
        
        await _emailService.SendAsync(new EmailMessage
        {
            To = student.Email,
            Subject = $"Grade Posted: {assignment.Title}",
            Body = $@"
                <h2>Your Assignment Has Been Graded</h2>
                <p><strong>Assignment:</strong> {assignment.Title}</p>
                <p><strong>Course:</strong> {assignment.Course.Title}</p>
                <p><strong>Score:</strong> {grade.Score}/{assignment.MaxScore}</p>
                <p><a href='https://codestack.com/submissions/{grade.SubmissionId}'>View Feedback</a></p>
            "
        });
    }
}
```

---

### 3. Validate GitHub Submission Job

**Trigger**: Student submits GitHub repo URL  
**Purpose**: Verify repo exists and commit is valid  
**Priority**: Medium  
**Retry**: 2 attempts

```csharp
public class ValidateGitHubSubmissionJob
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IGitHubService _gitHubService;
    
    public async Task ExecuteAsync(Guid submissionId)
    {
        var submission = await _dbContext.Submissions.FindAsync(submissionId);
        if (submission == null || submission.Type != SubmissionType.GitHubRepo)
            return;
        
        try
        {
            // Validate repo exists and is accessible
            var repoInfo = await _gitHubService.GetRepositoryInfoAsync(
                submission.GitHubRepoUrl);
            
            // Validate commit exists
            var commitExists = await _gitHubService.CommitExistsAsync(
                submission.GitHubRepoUrl,
                submission.CommitHash);
            
            if (!commitExists)
            {
                submission.Status = SubmissionStatus.Draft;
                submission.StudentNotes += "\n[ERROR] Commit hash not found in repository.";
                await _dbContext.SaveChangesAsync();
                
                // Notify student
                _backgroundJobService.Enqueue<SendSubmissionErrorNotificationJob>(
                    job => job.ExecuteAsync(submissionId, "Invalid commit hash"));
            }
        }
        catch (Exception ex)
        {
            submission.Status = SubmissionStatus.Draft;
            submission.StudentNotes += $"\n[ERROR] {ex.Message}";
            await _dbContext.SaveChangesAsync();
            
            throw; // Retry
        }
    }
}
```

---

### 4. Cleanup Expired Temp Files Job

**Trigger**: Scheduled (daily at 2 AM)  
**Purpose**: Delete temporary upload files older than 24 hours  
**Priority**: Low  
**Retry**: 1 attempt

```csharp
public class CleanupExpiredTempFilesJob
{
    private readonly IStorageService _storageService;
    private readonly ILogger<CleanupExpiredTempFilesJob> _logger;
    
    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Starting temp file cleanup...");
        
        var cutoffDate = DateTime.UtcNow.AddHours(-24);
        var deletedCount = 0;
        
        // List all blobs in temp/ folder
        var tempBlobs = await _storageService.ListBlobsAsync("temp/");
        
        foreach (var blob in tempBlobs)
        {
            var properties = await _storageService.GetBlobPropertiesAsync(blob.Name);
            
            if (properties.LastModified < cutoffDate)
            {
                await _storageService.DeleteBlobAsync(blob.Name);
                deletedCount++;
            }
        }
        
        _logger.LogInformation($"Deleted {deletedCount} expired temp files");
    }
}
```

**Schedule**:
```csharp
RecurringJob.AddOrUpdate<CleanupExpiredTempFilesJob>(
    "cleanup-temp-files",
    job => job.ExecuteAsync(),
    Cron.Daily(2)); // 2 AM daily
```

---

### 5. Cleanup Expired Refresh Tokens Job

**Trigger**: Scheduled (daily at 3 AM)  
**Purpose**: Remove expired refresh tokens from database  
**Priority**: Low  
**Retry**: 1 attempt

```csharp
public class CleanupExpiredRefreshTokensJob
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ILogger<CleanupExpiredRefreshTokensJob> _logger;
    
    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Starting refresh token cleanup...");
        
        var cutoffDate = DateTime.UtcNow;
        
        var expiredTokens = await _dbContext.RefreshTokens
            .Where(rt => rt.ExpiresAt < cutoffDate)
            .ToListAsync();
        
        _dbContext.RefreshTokens.RemoveRange(expiredTokens);
        await _dbContext.SaveChangesAsync();
        
        _logger.LogInformation($"Deleted {expiredTokens.Count} expired refresh tokens");
    }
}
```

---

### 6. Send Assignment Due Reminder Job

**Trigger**: Scheduled (daily at 9 AM)  
**Purpose**: Remind students of assignments due in 24 hours  
**Priority**: Medium  
**Retry**: 2 attempts

```csharp
public class SendAssignmentDueReminderJob
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IEmailService _emailService;
    
    public async Task ExecuteAsync()
    {
        var tomorrow = DateTime.UtcNow.AddDays(1);
        var dayAfter = tomorrow.AddDays(1);
        
        // Find assignments due tomorrow
        var assignmentsDueSoon = await _dbContext.Assignments
            .Include(a => a.Course)
            .ThenInclude(c => c.Enrollments)
            .ThenInclude(e => e.User)
            .Where(a => a.DueDate >= tomorrow && a.DueDate < dayAfter)
            .ToListAsync();
        
        foreach (var assignment in assignmentsDueSoon)
        {
            foreach (var enrollment in assignment.Course.Enrollments)
            {
                var student = enrollment.User;
                
                // Check if student has already submitted
                var hasSubmitted = await _dbContext.Submissions
                    .AnyAsync(s => s.AssignmentId == assignment.Id &&
                                   s.StudentId == student.Id &&
                                   s.Status == SubmissionStatus.Submitted);
                
                if (!hasSubmitted)
                {
                    await _emailService.SendAsync(new EmailMessage
                    {
                        To = student.Email,
                        Subject = $"Reminder: {assignment.Title} Due Tomorrow",
                        Body = $@"
                            <h2>Assignment Due Soon</h2>
                            <p><strong>Assignment:</strong> {assignment.Title}</p>
                            <p><strong>Course:</strong> {assignment.Course.Title}</p>
                            <p><strong>Due:</strong> {assignment.DueDate:f}</p>
                            <p><a href='https://codestack.com/assignments/{assignment.Id}'>Submit Now</a></p>
                        "
                    });
                }
            }
        }
    }
}
```

---

### 7. Generate Course Statistics Job

**Trigger**: Scheduled (weekly on Sunday at midnight)  
**Purpose**: Pre-compute course statistics for instructor dashboard  
**Priority**: Low  
**Retry**: 1 attempt

```csharp
public class GenerateCourseStatisticsJob
{
    private readonly IApplicationDbContext _dbContext;
    
    public async Task ExecuteAsync(Guid courseId)
    {
        var course = await _dbContext.Courses
            .Include(c => c.Enrollments)
            .Include(c => c.Assignments)
            .ThenInclude(a => a.Submissions)
            .ThenInclude(s => s.Grade)
            .FirstOrDefaultAsync(c => c.Id == courseId);
        
        if (course == null) return;
        
        var stats = new CourseStatistics
        {
            CourseId = courseId,
            TotalStudents = course.Enrollments.Count(e => e.IsActive),
            TotalAssignments = course.Assignments.Count,
            TotalSubmissions = course.Assignments.Sum(a => a.Submissions.Count),
            AverageGrade = course.Assignments
                .SelectMany(a => a.Submissions)
                .Where(s => s.Grade != null && s.Grade.Status == GradeStatus.Published)
                .Average(s => (double?)s.Grade.Score) ?? 0,
            SubmissionRate = CalculateSubmissionRate(course),
            GeneratedAt = DateTime.UtcNow
        };
        
        // Store in cache or database
        await _dbContext.CourseStatistics.AddAsync(stats);
        await _dbContext.SaveChangesAsync();
    }
    
    private double CalculateSubmissionRate(Course course)
    {
        var totalExpected = course.Enrollments.Count * course.Assignments.Count;
        if (totalExpected == 0) return 0;
        
        var totalSubmitted = course.Assignments
            .Sum(a => a.Submissions.Count(s => s.Status == SubmissionStatus.Submitted));
        
        return (double)totalSubmitted / totalExpected * 100;
    }
}
```

---

## Job Configuration

### Hangfire Setup

```csharp
// Program.cs
services.AddHangfire(config =>
{
    config.UsePostgreSqlStorage(connectionString);
    config.UseRecommendedSerializerSettings();
});

services.AddHangfireServer(options =>
{
    options.WorkerCount = 5; // Number of concurrent job workers
    options.Queues = new[] { "critical", "default", "low" };
});

// Enable dashboard (admin only)
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});
```

### Queue Priorities

| Queue | Priority | Use Cases |
|-------|----------|-----------|
| **critical** | Highest | User-facing notifications, payment processing |
| **default** | Medium | Standard operations, data validation |
| **low** | Lowest | Cleanup, statistics, maintenance |

### Job Enqueue Examples

```csharp
// Fire-and-forget (run once, ASAP)
BackgroundJob.Enqueue<SendSubmissionNotificationJob>(
    job => job.ExecuteAsync(submissionId));

// Delayed (run after specified time)
BackgroundJob.Schedule<ValidateGitHubSubmissionJob>(
    job => job.ExecuteAsync(submissionId),
    TimeSpan.FromMinutes(5));

// Recurring (scheduled)
RecurringJob.AddOrUpdate<CleanupExpiredTempFilesJob>(
    "cleanup-temp-files",
    job => job.ExecuteAsync(),
    Cron.Daily(2));

// With queue priority
BackgroundJob.Enqueue<SendGradePublishedNotificationJob>(
    job => job.ExecuteAsync(gradeId),
    new BackgroundJobOptions { Queue = "critical" });
```

---

## Retry Policies

```csharp
[AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
public class SendSubmissionNotificationJob
{
    // Retry 3 times: after 1min, 5min, 15min
}

[AutomaticRetry(Attempts = 0)] // No retry
public class GenerateCourseStatisticsJob
{
    // One-shot job
}
```

---

## Monitoring & Alerts

### Hangfire Dashboard
- URL: `/hangfire`
- View: Succeeded, failed, processing jobs
- Retry failed jobs manually
- Monitor queue lengths

### Logging
```csharp
_logger.LogInformation("Job started: {JobName}", nameof(SendSubmissionNotificationJob));
_logger.LogError(ex, "Job failed: {JobName}, SubmissionId: {SubmissionId}", 
    nameof(SendSubmissionNotificationJob), submissionId);
```

### Alerts (Future)
- Email admin if job fails > 3 times
- Slack notification for critical job failures
- Metrics: job duration, success rate

---

## Job Summary Table

| Job | Trigger | Frequency | Priority | Retry | Purpose |
|-----|---------|-----------|----------|-------|---------|
| **SendSubmissionNotification** | Student submits | Event | High | 3x | Notify instructor |
| **SendGradePublishedNotification** | Grade published | Event | High | 3x | Notify student |
| **ValidateGitHubSubmission** | GitHub submission | Event | Medium | 2x | Verify repo/commit |
| **CleanupExpiredTempFiles** | Scheduled | Daily 2 AM | Low | 1x | Delete old temp files |
| **CleanupExpiredRefreshTokens** | Scheduled | Daily 3 AM | Low | 1x | Delete expired tokens |
| **SendAssignmentDueReminder** | Scheduled | Daily 9 AM | Medium | 2x | Remind students |
| **GenerateCourseStatistics** | Scheduled | Weekly | Low | 1x | Pre-compute stats |

---

## Best Practices

1. **Keep jobs idempotent**: Safe to run multiple times
2. **Short-lived**: Jobs should complete in < 5 minutes
3. **Fail fast**: Don't retry on permanent errors (e.g., 404)
4. **Log everything**: Track job execution for debugging
5. **Use queues**: Separate critical from low-priority jobs
6. **Monitor**: Set up alerts for failed jobs
7. **Test**: Unit test job logic separately from Hangfire

---

## Future Enhancements

1. **Video Processing**: Encode videos on upload (Azure Media Services)
2. **Plagiarism Detection**: Compare submissions (MOSS integration)
3. **Analytics**: Track student engagement, video watch time
4. **Backup**: Periodic database backups to blob storage
5. **Report Generation**: Weekly instructor reports (PDF)
