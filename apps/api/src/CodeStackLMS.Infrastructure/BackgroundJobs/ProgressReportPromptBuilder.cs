using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Infrastructure.BackgroundJobs;

/// <summary>
/// Builds the system and user prompts for AI-generated progress reports.
/// Pure functions over already-loaded entities — no I/O — so the report
/// content is unit-testable independently of the Hangfire job orchestration.
/// </summary>
public static class ProgressReportPromptBuilder
{
    public const string StudentSystemPrompt = """
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

    public const string ClassSystemPrompt = """
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

    // ── Level helpers ─────────────────────────────────────────────────────────

    public static int GetCourseLevel(string title)
    {
        var t = title.ToLowerInvariant().Trim();
        if (t.Contains("combine")) return 0;
        var m = System.Text.RegularExpressions.Regex.Match(t, @"level\s*(\d+)");
        if (m.Success && int.TryParse(m.Groups[1].Value, out var lvl)) return lvl;
        return -1;
    }

    public static Course? GetActiveCourse(IEnumerable<UserCourseEnrollment> enrollments)
        => enrollments
            .Select(e => e.Course)
            .OrderByDescending(c => GetCourseLevel(c.Title))
            .FirstOrDefault();

    // ── Student prompt ────────────────────────────────────────────────────────

    public static string BuildStudentPrompt(User student, DateTime weekStart, Course? activeCourse, List<Attendance> recentAttendance)
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

    public static string BuildClassPrompt(List<User> students, DateTime weekStart, Dictionary<Guid, List<Attendance>> attendanceByStudent)
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
