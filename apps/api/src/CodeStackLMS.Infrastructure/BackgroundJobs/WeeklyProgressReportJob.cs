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
        ## Attendance
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
        ## Attendance
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
                var activeCourse = GetActiveCourse(student.CourseEnrollments);
                attendanceByStudent.TryGetValue(student.Id, out var studentAttendance);
                var prompt = BuildStudentPrompt(student, weekStart, activeCourse, studentAttendance ?? new List<Attendance>());
                report.Content = await _claude.GenerateAsync(StudentSystemPrompt, prompt, _options.DefaultModel, cancellationToken);
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
            var activeCourse = GetActiveCourse(student.CourseEnrollments);
            var prompt = BuildStudentPrompt(student, weekStart, activeCourse, singleStudentAttendance);
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

            var prompt = BuildClassPrompt(students, weekStart, classAttendanceByStudent);
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

    // ── Level helpers ─────────────────────────────────────────────────────────

    private static int GetCourseLevel(string title)
    {
        var t = title.ToLowerInvariant().Trim();
        if (t.Contains("combine")) return 0;
        var m = System.Text.RegularExpressions.Regex.Match(t, @"level\s*(\d+)");
        if (m.Success && int.TryParse(m.Groups[1].Value, out var lvl)) return lvl;
        return -1;
    }

    private static Course? GetActiveCourse(IEnumerable<UserCourseEnrollment> enrollments)
        => enrollments
            .Select(e => e.Course)
            .OrderByDescending(c => GetCourseLevel(c.Title))
            .FirstOrDefault();

    // ── Student prompt ────────────────────────────────────────────────────────

    private static string BuildStudentPrompt(User student, DateTime weekStart, Course? activeCourse, List<Attendance> recentAttendance)
    {
        // Filter all submission data to only the student's highest-level enrolled course.
        // If no active course is determined, fall back to all submissions.
        var activeSubmissions = activeCourse is not null
            ? student.Submissions
                .Where(s => s.Assignment.Module.CourseId == activeCourse.Id)
                .ToList()
            : student.Submissions.ToList();

        var gradedSubmissions = activeSubmissions
            .Where(s => s.Grade != null)
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        var recentSubmissions = activeSubmissions
            .Where(s => s.CreatedAt >= weekStart.AddDays(-30))
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        double? averageScore = gradedSubmissions.Any()
            ? gradedSubmissions.Average(s => (double)s.Grade!.TotalScore)
            : null;

        var lastSubmission = activeSubmissions.MaxBy(s => s.CreatedAt);

        var scoreHistory = gradedSubmissions
            .Take(5)
            .Select(s => $"  - {s.Assignment.Title}: {s.Grade!.TotalScore}/100")
            .ToList();

        var allEnrolledCourses = student.CourseEnrollments
            .Select(e => e.Course.Title)
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Student: {student.Name}");
        sb.AppendLine($"Week of: {weekStart:yyyy-MM-dd}");
        sb.AppendLine($"All enrolled courses: {(allEnrolledCourses.Any() ? string.Join(", ", allEnrolledCourses) : "None")}");
        sb.AppendLine($"Active course (report scoped to this level): {activeCourse?.Title ?? "Unknown"}");
        sb.AppendLine();
        sb.AppendLine("=== Academic Performance (current level only) ===");
        sb.AppendLine($"Total graded submissions: {gradedSubmissions.Count}");
        sb.AppendLine($"Average score: {(averageScore.HasValue ? $"{averageScore:F1}/100" : "N/A")}");
        sb.AppendLine("Recent scores (most recent first):");
        if (scoreHistory.Any())
            sb.AppendLine(string.Join(Environment.NewLine, scoreHistory));
        else
            sb.AppendLine("  None");
        sb.AppendLine();
        sb.AppendLine("=== Submission Activity — last 30 days (current level only) ===");
        sb.AppendLine($"Submissions in last 30 days: {recentSubmissions.Count}");
        sb.AppendLine($"Last submission date: {(lastSubmission != null ? lastSubmission.CreatedAt.ToString("yyyy-MM-dd") : "Never")}");
        sb.AppendLine();
        sb.AppendLine("=== Attendance (last 30 days, current level only) ===");
        var courseAttendance = activeCourse is not null
            ? recentAttendance.Where(a => a.CourseId == activeCourse.Id).ToList()
            : recentAttendance;
        int attPresent   = courseAttendance.Count(a => a.Status == AttendanceStatus.Present);
        int attLate      = courseAttendance.Count(a => a.Status == AttendanceStatus.Late);
        int attExcused   = courseAttendance.Count(a => a.Status == AttendanceStatus.Excused);
        int attUnexcused = courseAttendance.Count(a => a.Status == AttendanceStatus.Unexcused);
        int attZoom      = courseAttendance.Count(a => a.Status == AttendanceStatus.Zoom);
        int attTotal     = courseAttendance.Count;
        int attAttended  = attPresent + attLate + attZoom;
        if (attTotal == 0)
        {
            sb.AppendLine("No attendance data recorded for this period.");
        }
        else
        {
            double attRate = (double)attAttended / attTotal * 100;
            int inPersonTotal    = courseAttendance.Count(a => a.SessionType == SessionType.InPerson);
            int inPersonAttended = courseAttendance.Count(a => a.SessionType == SessionType.InPerson && (a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late || a.Status == AttendanceStatus.Zoom));
            int remoteTotal      = courseAttendance.Count(a => a.SessionType == SessionType.Remote);
            int remoteAttended   = courseAttendance.Count(a => a.SessionType == SessionType.Remote && (a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late || a.Status == AttendanceStatus.Zoom));
            sb.AppendLine($"Total class days marked: {attTotal}");
            sb.AppendLine($"Present (P): {attPresent}  |  Late (L): {attLate}  |  Excused (E): {attExcused}  |  Unexcused (U): {attUnexcused}  |  Zoom (Z): {attZoom}");
            sb.AppendLine($"Attendance rate (P+L+Z = attended): {attRate:F1}%");
            if (inPersonTotal > 0)
                sb.AppendLine($"In-person days: {inPersonAttended}/{inPersonTotal} attended");
            if (remoteTotal > 0)
                sb.AppendLine($"Remote days: {remoteAttended}/{remoteTotal} attended");
            if (attUnexcused >= 3)
                sb.AppendLine($"ALERT: {attUnexcused} unexcused absence(s) — may require follow-up.");
        }
        sb.AppendLine();
        sb.AppendLine("=== Probation Status ===");
        sb.AppendLine($"On probation: {(student.IsOnProbation ? "YES" : "No")}");
        if (student.IsOnProbation && !string.IsNullOrWhiteSpace(student.ProbationReason))
            sb.AppendLine($"Reason: {student.ProbationReason}");

        return sb.ToString();
    }

    private static string BuildClassPrompt(List<User> students, DateTime weekStart, Dictionary<Guid, List<Attendance>> attendanceByStudent)
    {
        // For each student, scope submissions to their highest-level enrolled course only.
        var studentData = students.Select(s =>
        {
            var activeCourse = GetActiveCourse(s.CourseEnrollments);
            var activeSubs = activeCourse is not null
                ? s.Submissions.Where(sub => sub.Assignment.Module.CourseId == activeCourse.Id).ToList()
                : s.Submissions.ToList();
            return (Student: s, ActiveCourse: activeCourse, ActiveSubs: activeSubs);
        }).ToList();

        // Level distribution
        var levelGroups = studentData
            .GroupBy(x => x.ActiveCourse?.Title ?? "Unknown")
            .OrderByDescending(g => GetCourseLevel(g.Key))
            .Select(g => (Level: g.Key, Count: g.Count()))
            .ToList();

        // Graded submissions scoped per student
        var allGraded = studentData
            .SelectMany(x => x.ActiveSubs.Where(sub => sub.Grade != null))
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

        var recentSubmissions = studentData
            .SelectMany(x => x.ActiveSubs.Where(sub => sub.CreatedAt >= weekStart.AddDays(-7)))
            .ToList();

        var studentsWithNoRecentActivity = studentData
            .Where(x => !x.ActiveSubs.Any(sub => sub.CreatedAt >= weekStart.AddDays(-30)))
            .Select(x => $"{x.Student.Name} ({x.ActiveCourse?.Title ?? "no course"})")
            .ToList();

        var studentsOnProbation = students
            .Where(s => s.IsOnProbation)
            .Select(s => $"{s.Name}{(string.IsNullOrWhiteSpace(s.ProbationReason) ? "" : $" ({s.ProbationReason})")}")
            .ToList();

        var topStudents = studentData
            .Select(x => new
            {
                x.Student.Name,
                Level = x.ActiveCourse?.Title ?? "Unknown",
                Avg = x.ActiveSubs.Where(sub => sub.Grade != null).Any()
                    ? x.ActiveSubs.Where(sub => sub.Grade != null).Average(sub => (double)sub.Grade!.TotalScore)
                    : (double?)null
            })
            .Where(x => x.Avg.HasValue)
            .OrderByDescending(x => x.Avg)
            .Take(5)
            .Select(x => $"{x.Name} ({x.Level}): {x.Avg:F1}/100")
            .ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Week of: {weekStart:yyyy-MM-dd}");
        sb.AppendLine($"Total active students: {students.Count}");
        sb.AppendLine("Note: each student's data is scoped to their highest enrolled level only.");
        sb.AppendLine();
        sb.AppendLine("=== Level Distribution ===");
        foreach (var (level, count) in levelGroups)
            sb.AppendLine($"  {level}: {count} student(s)");
        sb.AppendLine();
        sb.AppendLine("=== Grade Statistics (per-student, scoped to active level) ===");
        sb.AppendLine($"Total graded submissions across all students: {allGraded.Count}");
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
        sb.AppendLine("=== Attendance (last 30 days, scoped to active level) ===");
        var attendanceSummaries = studentData.Select(x =>
        {
            var recs = attendanceByStudent.TryGetValue(x.Student.Id, out var a) ? a : new List<Attendance>();
            var scoped = x.ActiveCourse is not null
                ? recs.Where(r => r.CourseId == x.ActiveCourse.Id).ToList()
                : recs;
            int total    = scoped.Count;
            int attended = scoped.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late || r.Status == AttendanceStatus.Zoom);
            int unexcused = scoped.Count(r => r.Status == AttendanceStatus.Unexcused);
            double rate  = total > 0 ? (double)attended / total * 100 : -1;
            return (Name: x.Student.Name, Level: x.ActiveCourse?.Title ?? "Unknown", Total: total, Attended: attended, Unexcused: unexcused, Rate: rate);
        }).ToList();
        var withData = attendanceSummaries.Where(x => x.Total > 0).ToList();
        if (withData.Count == 0)
        {
            sb.AppendLine("No attendance data recorded for this period.");
        }
        else
        {
            double classAttRate = withData.Average(x => x.Rate);
            int attExcellent  = withData.Count(x => x.Rate >= 90);
            int attGood       = withData.Count(x => x.Rate >= 75 && x.Rate < 90);
            int attConcerning = withData.Count(x => x.Rate < 75);
            var multiUnexcused = withData
                .Where(x => x.Unexcused >= 2)
                .OrderByDescending(x => x.Unexcused)
                .Take(10)
                .ToList();
            sb.AppendLine($"Class average attendance rate: {classAttRate:F1}%");
            sb.AppendLine($"Distribution — Excellent (≥90%): {attExcellent}  |  Good (75-89%): {attGood}  |  Concerning (<75%): {attConcerning}");
            if (multiUnexcused.Count > 0)
            {
                sb.AppendLine($"Students with 2+ unexcused absences ({multiUnexcused.Count}):");
                foreach (var x in multiUnexcused)
                    sb.AppendLine($"  - {x.Name} ({x.Level}): {x.Unexcused} unexcused, {x.Rate:F1}% overall");
            }
            else
            {
                sb.AppendLine("No students with multiple unexcused absences.");
            }
        }
        sb.AppendLine();
        sb.AppendLine("=== Top Performers (scoped to active level) ===");
        if (topStudents.Any())
            foreach (var s in topStudents)
                sb.AppendLine($"  - {s}");
        else
            sb.AppendLine("  None with graded submissions yet");

        return sb.ToString();
    }
}
