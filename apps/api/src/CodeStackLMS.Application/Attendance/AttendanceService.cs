using CodeStackLMS.Application.Attendance.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using AttendanceEntity = CodeStackLMS.Domain.Entities.Attendance;

namespace CodeStackLMS.Application.Attendance;

public class AttendanceService : IAttendanceService
{
    private readonly IApplicationDbContext _db;

    public AttendanceService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<AttendanceGridDto> GetMonthGridAsync(
        string courseId,
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var courseGuid = ParseGuid(courseId);

        if (month < 1 || month > 12)
            throw new ValidationException("Month must be between 1 and 12.");
        if (year < 2000 || year > 2100)
            throw new ValidationException("Invalid year.");

        var course = await _db.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == courseGuid, cancellationToken)
            ?? throw new NotFoundException("Course", courseGuid);

        // Build the class-day columns (weekdays only).
        var firstDay = new DateOnly(year, month, 1);
        var lastDay = firstDay.AddMonths(1).AddDays(-1);

        var days = new List<AttendanceDayDto>();
        for (var d = firstDay; d <= lastDay; d = d.AddDays(1))
        {
            if (!IsClassDay(d.DayOfWeek))
                continue;

            days.Add(new AttendanceDayDto(
                d.ToString("yyyy-MM-dd"),
                ShortDayName(d.DayOfWeek),
                GetSessionType(d.DayOfWeek).ToString()));
        }

        // Roster: active students enrolled in this level.
        var students = await _db.UserCourseEnrollments
            .AsNoTracking()
            .Where(e => e.CourseId == courseGuid)
            .Join(_db.Users, e => e.UserId, u => u.Id, (e, u) => u)
            .Where(u => u.Role == UserRole.Student && u.IsActive)
            .Distinct()
            .OrderBy(u => u.Name)
            .Select(u => new { u.Id, u.Name })
            .ToListAsync(cancellationToken);

        // Existing marks for the month.
        var records = await _db.Attendances
            .AsNoTracking()
            .Where(a => a.CourseId == courseGuid && a.Date >= firstDay && a.Date <= lastDay)
            .ToListAsync(cancellationToken);

        var marksByStudent = records
            .GroupBy(a => a.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var rows = new List<AttendanceStudentRowDto>(students.Count);
        foreach (var student in students)
        {
            marksByStudent.TryGetValue(student.Id, out var studentMarks);
            studentMarks ??= new List<AttendanceEntity>();

            var cells = studentMarks
                .Select(a => new AttendanceCellDto(a.Date.ToString("yyyy-MM-dd"), ToCode(a.Status)))
                .ToList();

            rows.Add(new AttendanceStudentRowDto(
                student.Id.ToString(),
                student.Name,
                cells,
                PresentCount: studentMarks.Count(a => a.Status == AttendanceStatus.Present),
                LateCount: studentMarks.Count(a => a.Status == AttendanceStatus.Late),
                ExcusedCount: studentMarks.Count(a => a.Status == AttendanceStatus.Excused),
                UnexcusedCount: studentMarks.Count(a => a.Status == AttendanceStatus.Unexcused),
                ZoomCount: studentMarks.Count(a => a.Status == AttendanceStatus.Zoom)));
        }

        return new AttendanceGridDto(
            course.Id.ToString(),
            course.Title,
            year,
            month,
            days,
            rows);
    }

    public async Task SaveAttendanceAsync(
        SaveAttendanceRequestDto dto,
        string currentUserId,
        CancellationToken cancellationToken = default)
    {
        var courseGuid = ParseGuid(dto.CourseId);
        var recordedBy = ParseGuid(currentUserId);

        var courseExists = await _db.Courses
            .AnyAsync(c => c.Id == courseGuid, cancellationToken);
        if (!courseExists)
            throw new NotFoundException("Course", courseGuid);

        if (dto.Marks is null || dto.Marks.Count == 0)
            return;

        // Normalise the incoming marks.
        var parsed = new List<(Guid StudentId, DateOnly Date, AttendanceStatus? Status, string? Note)>();
        foreach (var mark in dto.Marks)
        {
            var studentId = ParseGuid(mark.StudentId);

            if (!DateOnly.TryParse(mark.Date, out var date))
                throw new ValidationException($"Invalid date: {mark.Date}");

            if (!IsClassDay(date.DayOfWeek))
                throw new ValidationException($"{mark.Date} is not a scheduled class day.");

            var status = FromCode(mark.Status);
            parsed.Add((studentId, date, status, mark.Note?.Trim()));
        }

        var studentIds = parsed.Select(p => p.StudentId).Distinct().ToList();
        var dates = parsed.Select(p => p.Date).Distinct().ToList();

        // Load existing rows that could be affected.
        var existing = await _db.Attendances
            .Where(a => a.CourseId == courseGuid
                && studentIds.Contains(a.StudentId)
                && dates.Contains(a.Date))
            .ToListAsync(cancellationToken);

        var existingLookup = existing
            .ToDictionary(a => (a.StudentId, a.Date));

        var now = DateTime.UtcNow;

        foreach (var (studentId, date, status, note) in parsed)
        {
            existingLookup.TryGetValue((studentId, date), out var row);

            // No status => clear any existing mark.
            if (status is null)
            {
                if (row is not null)
                    _db.Attendances.Remove(row);
                continue;
            }

            if (row is null)
            {
                _db.Attendances.Add(new AttendanceEntity
                {
                    Id = Guid.NewGuid(),
                    CourseId = courseGuid,
                    StudentId = studentId,
                    Date = date,
                    Status = status.Value,
                    SessionType = GetSessionType(date.DayOfWeek),
                    RecordedByUserId = recordedBy,
                    Note = note,
                    CreatedAt = now,
                });
            }
            else
            {
                row.Status = status.Value;
                row.SessionType = GetSessionType(date.DayOfWeek);
                row.RecordedByUserId = recordedBy;
                row.Note = note;
                row.UpdatedAt = now;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    // ── Schedule rules: M/W/F in-person, T/Th remote ────────────────────────────
    private static bool IsClassDay(DayOfWeek day) =>
        day is DayOfWeek.Monday or DayOfWeek.Tuesday or DayOfWeek.Wednesday
            or DayOfWeek.Thursday or DayOfWeek.Friday;

    private static SessionType GetSessionType(DayOfWeek day) =>
        day is DayOfWeek.Tuesday or DayOfWeek.Thursday
            ? SessionType.Remote
            : SessionType.InPerson;

    private static string ShortDayName(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => "Mon",
        DayOfWeek.Tuesday => "Tue",
        DayOfWeek.Wednesday => "Wed",
        DayOfWeek.Thursday => "Thu",
        DayOfWeek.Friday => "Fri",
        DayOfWeek.Saturday => "Sat",
        _ => "Sun",
    };

    private static string ToCode(AttendanceStatus status) => status switch
    {
        AttendanceStatus.Present => "P",
        AttendanceStatus.Late => "L",
        AttendanceStatus.Excused => "E",
        AttendanceStatus.Unexcused => "U",
        AttendanceStatus.Zoom => "Z",
        _ => "",
    };

    private static AttendanceStatus? FromCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        return code.Trim().ToUpperInvariant() switch
        {
            "P" => AttendanceStatus.Present,
            "L" => AttendanceStatus.Late,
            "E" => AttendanceStatus.Excused,
            "U" => AttendanceStatus.Unexcused,
            "Z" => AttendanceStatus.Zoom,
            _ => throw new ValidationException($"Invalid attendance status: {code}"),
        };
    }

    private static Guid ParseGuid(string raw)
    {
        if (!Guid.TryParse(raw, out var parsed))
            throw new ValidationException("Invalid identifier provided.");
        return parsed;
    }
}
