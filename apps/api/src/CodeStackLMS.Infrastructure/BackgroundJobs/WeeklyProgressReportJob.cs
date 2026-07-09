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

    /// <summary>
    /// Recurring-job entry point: computes the week at execution time. The
    /// scheduler must NOT pass a precomputed date — Hangfire serializes job
    /// arguments once at registration, which would freeze the week forever.
    /// </summary>
    public Task ExecuteForCurrentWeekAsync(CancellationToken cancellationToken)
        => ExecuteAsync(DateTime.UtcNow, null, cancellationToken);

    public async Task ExecuteAsync(DateTime weekOf, Guid? cohortId, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        var (resolvedCohortId, cohortCourseIds) = await ResolveCohortScopeAsync(cohortId, cancellationToken);

        _logger.LogInformation(
            "WeeklyProgressReportJob starting for week of {WeekOf}, cohort {CohortId}",
            weekStart, resolvedCohortId);

        var studentsQuery = _db.Users
            .Where(u => u.IsActive && u.Role == UserRole.Student);

        if (cohortCourseIds is not null)
            studentsQuery = studentsQuery.Where(u =>
                u.CourseEnrollments.Any(e => cohortCourseIds.Contains(e.CourseId)));

        var students = await studentsQuery
            .Include(u => u.Submissions)
                .ThenInclude(s => s.Assignment)
                .ThenInclude(a => a.Module)
            .Include(u => u.Submissions)
                .ThenInclude(s => s.Grade)
            .Include(u => u.CourseEnrollments)
                .ThenInclude(e => e.Course)
            .ToListAsync(cancellationToken);

        var attendanceCutoff = DateOnly.FromDateTime(weekStart.AddDays(-30));
        var attendanceThrough = DateOnly.FromDateTime(weekStart.AddDays(6));
        var allAttendanceRecords = await _db.Attendances
            .AsNoTracking()
            .Where(a => a.Date >= attendanceCutoff && a.Date <= attendanceThrough)
            .ToListAsync(cancellationToken);
        var attendanceByStudent = allAttendanceRecords
            .GroupBy(a => a.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        int generated = 0;
        int failed = 0;

        foreach (var student in students)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var existingReport = await _db.ProgressReports
                .FirstOrDefaultAsync(
                    r => r.StudentId == student.Id && r.WeekOf.Date == weekStart.Date
                      && r.ReportType == ReportType.StudentProgress
                      && r.CohortId == resolvedCohortId,
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
                CohortId = resolvedCohortId,
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
                var activeCourse = ProgressReportPromptBuilder.GetActiveCourse(student.CourseEnrollments);
                attendanceByStudent.TryGetValue(student.Id, out var studentAttendance);
                var prompt = ProgressReportPromptBuilder.BuildStudentPrompt(student, weekStart, activeCourse, studentAttendance ?? new List<Attendance>());
                report.Content = await _claude.GenerateAsync(ProgressReportPromptBuilder.StudentSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
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

    public async Task ExecuteSingleStudentAsync(Guid studentId, DateTime weekOf, Guid? cohortId, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        var (resolvedCohortId, _) = await ResolveCohortScopeAsync(cohortId, cancellationToken);

        var student = await _db.Users
            .Where(u => u.Id == studentId && u.IsActive && u.Role == UserRole.Student)
            .Include(u => u.Submissions).ThenInclude(s => s.Assignment).ThenInclude(a => a.Module)
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
              && r.ReportType == ReportType.StudentProgress
              && r.CohortId == resolvedCohortId, cancellationToken);

        var report = existingReport ?? new ProgressReport
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CohortId = resolvedCohortId,
            ReportType = ReportType.StudentProgress,
            WeekOf = weekStart,
            CreatedAt = DateTime.UtcNow,
            Model = _options.DefaultModel,
        };

        report.Status = ProgressReportStatus.Generating;
        if (existingReport is null) _db.ProgressReports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);

        var singleCutoff = DateOnly.FromDateTime(weekStart.AddDays(-30));
        var singleThrough = DateOnly.FromDateTime(weekStart.AddDays(6));
        var singleStudentAttendance = await _db.Attendances
            .AsNoTracking()
            .Where(a => a.StudentId == studentId && a.Date >= singleCutoff && a.Date <= singleThrough)
            .ToListAsync(cancellationToken);

        try
        {
            var activeCourse = ProgressReportPromptBuilder.GetActiveCourse(student.CourseEnrollments);
            var prompt = ProgressReportPromptBuilder.BuildStudentPrompt(student, weekStart, activeCourse, singleStudentAttendance);
            report.Content = await _claude.GenerateAsync(ProgressReportPromptBuilder.StudentSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
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

    public async Task ExecuteClassReportAsync(DateTime weekOf, Guid? cohortId, CancellationToken cancellationToken)
    {
        var weekStart = weekOf.Date.AddDays(-(int)weekOf.DayOfWeek + 1);

        var (resolvedCohortId, cohortCourseIds) = await ResolveCohortScopeAsync(cohortId, cancellationToken);

        _logger.LogInformation(
            "ExecuteClassReportAsync starting for week of {WeekOf}, cohort {CohortId}",
            weekStart, resolvedCohortId);

        var existingReport = await _db.ProgressReports.FirstOrDefaultAsync(
            r => r.StudentId == null && r.WeekOf.Date == weekStart.Date
              && r.ReportType == ReportType.ClassSummary
              && r.CohortId == resolvedCohortId, cancellationToken);

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
            CohortId = resolvedCohortId,
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
            var studentsQuery = _db.Users
                .Where(u => u.IsActive && u.Role == UserRole.Student);

            if (cohortCourseIds is not null)
                studentsQuery = studentsQuery.Where(u =>
                    u.CourseEnrollments.Any(e => cohortCourseIds.Contains(e.CourseId)));

            var students = await studentsQuery
                .Include(u => u.Submissions).ThenInclude(s => s.Assignment).ThenInclude(a => a.Module)
                .Include(u => u.Submissions).ThenInclude(s => s.Grade)
                .Include(u => u.CourseEnrollments).ThenInclude(e => e.Course)
                .ToListAsync(cancellationToken);

            var classCutoff = DateOnly.FromDateTime(weekStart.AddDays(-30));
            var classThrough = DateOnly.FromDateTime(weekStart.AddDays(6));
            var classAttendanceRecs = await _db.Attendances
                .AsNoTracking()
                .Where(a => a.Date >= classCutoff && a.Date <= classThrough)
                .ToListAsync(cancellationToken);
            var classAttendanceByStudent = classAttendanceRecs
                .GroupBy(a => a.StudentId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var prompt = ProgressReportPromptBuilder.BuildClassPrompt(students, weekStart, classAttendanceByStudent);
            report.Content = await _claude.GenerateAsync(ProgressReportPromptBuilder.ClassSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
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

    // ── Cohort scoping ──────────────────────────────────────────────────────────

    /// <summary>
    /// Resolves the cohort to generate reports for. When <paramref name="cohortId"/>
    /// is null, the currently active cohort is used. Returns the resolved cohort id
    /// (null only when no cohort exists at all) and the set of course ids belonging
    /// to it (null means "no cohort scope — include all students").
    /// </summary>
    private async Task<(Guid? CohortId, List<Guid>? CourseIds)> ResolveCohortScopeAsync(
        Guid? cohortId, CancellationToken cancellationToken)
    {
        var resolved = cohortId;
        if (resolved is null)
        {
            resolved = await _db.Cohorts
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.StartDate)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (resolved is null)
            return (null, null);

        var courseIds = await _db.CohortCourses
            .AsNoTracking()
            .Where(cc => cc.CohortId == resolved.Value)
            .Select(cc => cc.CourseId)
            .ToListAsync(cancellationToken);

        return (resolved, courseIds);
    }

}
