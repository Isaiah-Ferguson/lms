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

    private const string SystemPrompt = """
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
                var prompt = BuildPrompt(student, weekStart);
                var content = await _claude.GenerateAsync(SystemPrompt, prompt, _options.DefaultModel, cancellationToken);

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

    private static string BuildPrompt(User student, DateTime weekStart)
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
}
