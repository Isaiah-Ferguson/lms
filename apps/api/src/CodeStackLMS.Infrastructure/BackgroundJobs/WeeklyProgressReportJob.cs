using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CodeStackLMS.Infrastructure.AI;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

public class WeeklyProgressReportJob
{
    private readonly IApplicationDbContext _db;
    private readonly IClaudeClient _claude;
    private readonly AnthropicOptions _options;
    private readonly ILogger<WeeklyProgressReportJob> _logger;

    private const string StudentSystemPrompt = """
        You are an academic advisor writing a weekly progress report for an instructor or admin.
        Your audience is internal staff — not the student. Be concise, factual, and professional.
        Structure every report with these markdown sections:
        ## Summary
        ## Academic Performance
        ## Submission Activity
        ## Probation Status
        ## Recommendations
        Keep the total length under 400 words. Base your narrative only on the data provided — do not invent facts.
        """;

    private const string ClassSystemPrompt = """
        You are an academic director writing a weekly class-wide progress summary for faculty leadership.
        Your audience is instructors and administrators. Be concise, data-driven, and professional.
        Structure the report with these markdown sections:
        ## Class Overview
        ## Grade Distribution
        ## Submission & Engagement
        ## Students of Concern
        ## Positive Highlights
        ## Recommendations
        Keep the total length under 600 words. Base your narrative only on the data provided — do not invent facts or name individual students unless probation status is explicitly noted.
        """;

    public WeeklyProgressReportJob(
        IApplicationDbContext db,
        IClaudeClient claude,
        IOptions<AnthropicOptions> options,
        ILogger<WeeklyProgressReportJob> logger)
    {
        _db = db;
        _claude = claude;
        _options = options.Value;
        _logger = logger;
    }

    public async Task ExecuteAsync(DateTime weekOf, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        _logger.LogInformation("WeeklyProgressReportJob starting for week of {WeekOf}", weekStart);

        var students = await _db.Users
            .Where(u => u.IsActive && u.Role == UserRole.Student)
            .Include(u => u.Submissions)
                .ThenInclude(s => s.Assignment)
            .Include(u => u.Submissions)
                .ThenInclude(s => s.Grade)
            .Include(u => u.CourseEnrollments)
                .ThenInclude(e => e.Course)
            .ToListAsync(cancellationToken);

        int generated = 0;
        int failed = 0;

        foreach (var student in students)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var existingReport = await _db.ProgressReports
                .FirstOrDefaultAsync(
                    r => r.StudentId == student.Id && r.WeekOf.Date == weekStart.Date,
                    cancellationToken);

            if (existingReport?.Status == ProgressReportStatus.Generated
                || existingReport?.Status == ProgressReportStatus.Published)
            {
                _logger.LogInformation("Skipping student {StudentId} — report already exists", student.Id);
                continue;
            }

            var report = existingReport ?? new ProgressReport
            {
                Id = Guid.NewGuid(),
                StudentId = student.Id,
                ReportType = ReportType.StudentProgress,
                WeekOf = weekStart,
                CreatedAt = DateTime.UtcNow,
                Model = _options.DefaultModel,
            };

            report.Status = ProgressReportStatus.Generating;

            if (existingReport is null)
                _db.ProgressReports.Add(report);

            await _db.SaveChangesAsync(cancellationToken);

            try
            {
                var prompt = BuildStudentPrompt(student, weekStart);
                var content = await _claude.GenerateAsync(StudentSystemPrompt, prompt, _options.DefaultModel, cancellationToken);

                report.Content = content;
                report.Status = ProgressReportStatus.Generated;
                report.GeneratedAt = DateTime.UtcNow;
                report.FailureReason = null;

                generated++;
                _logger.LogInformation("Report generated for student {StudentId}", student.Id);
            }
            catch (Exception ex)
            {
                report.Status = ProgressReportStatus.Failed;
                report.FailureReason = ex.Message;
                failed++;
                _logger.LogError(ex, "Failed to generate report for student {StudentId}", student.Id);
            }

            await _db.SaveChangesAsync(cancellationToken);

            // Brief pause to respect Anthropic rate limits
            await Task.Delay(300, cancellationToken);
        }

        _logger.LogInformation(
            "WeeklyProgressReportJob complete — {Generated} generated, {Failed} failed",
            generated, failed);
    }

    public async Task ExecuteSingleStudentAsync(Guid studentId, DateTime weekOf, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        var student = await _db.Users
            .Where(u => u.Id == studentId && u.IsActive && u.Role == UserRole.Student)
            .Include(u => u.Submissions).ThenInclude(s => s.Assignment)
            .Include(u => u.Submissions).ThenInclude(s => s.Grade)
            .Include(u => u.CourseEnrollments).ThenInclude(e => e.Course)
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
        {
            _logger.LogWarning("Student {StudentId} not found or not active", studentId);
            return;
        }

        var existingReport = await _db.ProgressReports.FirstOrDefaultAsync(
            r => r.StudentId == studentId && r.WeekOf.Date == weekStart.Date
              && r.ReportType == ReportType.StudentProgress, cancellationToken);

        var report = existingReport ?? new ProgressReport
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            ReportType = ReportType.StudentProgress,
            WeekOf = weekStart,
            CreatedAt = DateTime.UtcNow,
            Model = _options.DefaultModel,
        };

        report.Status = ProgressReportStatus.Generating;
        if (existingReport is null) _db.ProgressReports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var prompt = BuildStudentPrompt(student, weekStart);
            report.Content = await _claude.GenerateAsync(StudentSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
            report.Status = ProgressReportStatus.Generated;
            report.GeneratedAt = DateTime.UtcNow;
            report.FailureReason = null;
            _logger.LogInformation("Single-student report generated for {StudentId}", studentId);
        }
        catch (Exception ex)
        {
            report.Status = ProgressReportStatus.Failed;
            report.FailureReason = ex.Message;
            _logger.LogError(ex, "Failed single-student report for {StudentId}", studentId);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ExecuteClassReportAsync(DateTime weekOf, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        _logger.LogInformation("ExecuteClassReportAsync starting for week of {WeekOf}", weekStart);

        var existingReport = await _db.ProgressReports.FirstOrDefaultAsync(
            r => r.StudentId == null && r.WeekOf.Date == weekStart.Date
              && r.ReportType == ReportType.ClassSummary, cancellationToken);

        if (existingReport?.Status == ProgressReportStatus.Generated
            || existingReport?.Status == ProgressReportStatus.Published)
        {
            _logger.LogInformation("Class report for {WeekOf} already exists", weekStart);
            return;
        }

        var report = existingReport ?? new ProgressReport
        {
            Id = Guid.NewGuid(),
            StudentId = null,
            ReportType = ReportType.ClassSummary,
            WeekOf = weekStart,
            CreatedAt = DateTime.UtcNow,
            Model = _options.DefaultModel,
        };

        report.Status = ProgressReportStatus.Generating;
        if (existingReport is null) _db.ProgressReports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            var students = await _db.Users
                .Where(u => u.IsActive && u.Role == UserRole.Student)
                .Include(u => u.Submissions).ThenInclude(s => s.Assignment)
                .Include(u => u.Submissions).ThenInclude(s => s.Grade)
                .ToListAsync(cancellationToken);

            var prompt = BuildClassPrompt(students, weekStart);
            report.Content = await _claude.GenerateAsync(ClassSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
            report.Status = ProgressReportStatus.Generated;
            report.GeneratedAt = DateTime.UtcNow;
            report.FailureReason = null;
            _logger.LogInformation("Class report generated for week of {WeekOf}", weekStart);
        }
        catch (Exception ex)
        {
            report.Status = ProgressReportStatus.Failed;
            report.FailureReason = ex.Message;
            _logger.LogError(ex, "Failed class report for week of {WeekOf}", weekStart);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string BuildStudentPrompt(User student, DateTime weekStart)
    {
        var gradedSubmissions = student.Submissions
            .Where(s => s.Grade != null)
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        var recentSubmissions = student.Submissions
            .Where(s => s.CreatedAt >= weekStart.AddDays(-30))
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        double? averageScore = gradedSubmissions.Any()
            ? gradedSubmissions.Average(s => (double)s.Grade!.TotalScore)
            : null;

        var lastSubmission = student.Submissions.MaxBy(s => s.CreatedAt);

        var scoreHistory = gradedSubmissions
            .Take(5)
            .Select(s => $"  - {s.Assignment.Title}: {s.Grade!.TotalScore}/100")
            .ToList();

        var enrolledCourses = student.CourseEnrollments
            .Select(e => e.Course.Title)
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Student: {student.Name}");
        sb.AppendLine($"Week of: {weekStart:yyyy-MM-dd}");
        sb.AppendLine($"Enrolled courses: {(enrolledCourses.Any() ? string.Join(", ", enrolledCourses) : "None")}");
        sb.AppendLine();
        sb.AppendLine("=== Academic Performance ===");
        sb.AppendLine($"Total graded submissions: {gradedSubmissions.Count}");
        sb.AppendLine($"Average score: {(averageScore.HasValue ? $"{averageScore:F1}/100" : "N/A")}");
        sb.AppendLine("Recent scores (most recent first):");
        if (scoreHistory.Any())
            sb.AppendLine(string.Join(Environment.NewLine, scoreHistory));
        else
            sb.AppendLine("  None");
        sb.AppendLine();
        sb.AppendLine("=== Submission Activity (last 30 days) ===");
        sb.AppendLine($"Submissions in last 30 days: {recentSubmissions.Count}");
        sb.AppendLine($"Last submission date: {(lastSubmission != null ? lastSubmission.CreatedAt.ToString("yyyy-MM-dd") : "Never")}");
        sb.AppendLine();
        sb.AppendLine("=== Probation Status ===");
        sb.AppendLine($"On probation: {(student.IsOnProbation ? "YES" : "No")}");
        if (student.IsOnProbation && !string.IsNullOrWhiteSpace(student.ProbationReason))
            sb.AppendLine($"Reason: {student.ProbationReason}");

        return sb.ToString();
    }

    private static string BuildClassPrompt(List<User> students, DateTime weekStart)
    {
        var allGraded = students
            .SelectMany(s => s.Submissions.Where(sub => sub.Grade != null))
            .ToList();

        double? classAverage = allGraded.Any()
            ? allGraded.Average(s => (double)s.Grade!.TotalScore)
            : null;

        var scoreRanges = new[]
        {
            ("90-100 (A)", allGraded.Count(s => s.Grade!.TotalScore >= 90)),
            ("80-89  (B)", allGraded.Count(s => s.Grade!.TotalScore >= 80 && s.Grade!.TotalScore < 90)),
            ("70-79  (C)", allGraded.Count(s => s.Grade!.TotalScore >= 70 && s.Grade!.TotalScore < 80)),
            ("60-69  (D)", allGraded.Count(s => s.Grade!.TotalScore >= 60 && s.Grade!.TotalScore < 70)),
            ("Below 60 (F)", allGraded.Count(s => s.Grade!.TotalScore < 60)),
        };

        var recentSubmissions = students
            .SelectMany(s => s.Submissions.Where(sub => sub.CreatedAt >= weekStart.AddDays(-7)))
            .ToList();

        var studentsWithNoRecentActivity = students
            .Where(s => !s.Submissions.Any(sub => sub.CreatedAt >= weekStart.AddDays(-30)))
            .Select(s => s.Name)
            .ToList();

        var studentsOnProbation = students
            .Where(s => s.IsOnProbation)
            .Select(s => $"{s.Name}{(string.IsNullOrWhiteSpace(s.ProbationReason) ? "" : $" ({s.ProbationReason})")}")
            .ToList();

        var topStudents = students
            .Select(s => new
            {
                s.Name,
                Avg = s.Submissions.Where(sub => sub.Grade != null).Any()
                    ? s.Submissions.Where(sub => sub.Grade != null).Average(sub => (double)sub.Grade!.TotalScore)
                    : (double?)null
            })
            .Where(x => x.Avg.HasValue)
            .OrderByDescending(x => x.Avg)
            .Take(3)
            .Select(x => $"{x.Name}: {x.Avg:F1}/100")
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Week of: {weekStart:yyyy-MM-dd}");
        sb.AppendLine($"Total active students: {students.Count}");
        sb.AppendLine();
        sb.AppendLine("=== Grade Statistics ===");
        sb.AppendLine($"Total graded submissions (all time): {allGraded.Count}");
        sb.AppendLine($"Class average score: {(classAverage.HasValue ? $"{classAverage:F1}/100" : "N/A")}");
        sb.AppendLine("Score distribution:");
        foreach (var (range, count) in scoreRanges)
            sb.AppendLine($"  {range}: {count} submissions");
        sb.AppendLine();
        sb.AppendLine("=== Submission Activity (this week) ===");
        sb.AppendLine($"Submissions this week: {recentSubmissions.Count}");
        sb.AppendLine($"Students with no activity in last 30 days ({studentsWithNoRecentActivity.Count}):");
        foreach (var name in studentsWithNoRecentActivity.Take(10))
            sb.AppendLine($"  - {name}");
        if (studentsWithNoRecentActivity.Count > 10)
            sb.AppendLine($"  ... and {studentsWithNoRecentActivity.Count - 10} more");
        sb.AppendLine();
        sb.AppendLine("=== Probation ===");
        sb.AppendLine($"Students on probation: {studentsOnProbation.Count}");
        foreach (var s in studentsOnProbation)
            sb.AppendLine($"  - {s}");
        sb.AppendLine();
        sb.AppendLine("=== Top Performers ===");
        if (topStudents.Any())
            foreach (var s in topStudents)
                sb.AppendLine($"  - {s}");
        else
            sb.AppendLine("  None with graded submissions yet");

        return sb.ToString();
    }
}
