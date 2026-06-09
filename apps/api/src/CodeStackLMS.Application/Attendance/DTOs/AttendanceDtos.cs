namespace CodeStackLMS.Application.Attendance.DTOs;

/// <summary>A single class day column in the attendance grid.</summary>
public sealed record AttendanceDayDto(
    string Date,        // ISO yyyy-MM-dd
    string DayOfWeek,   // Mon, Tue, ...
    string SessionType  // "InPerson" | "Remote"
);

/// <summary>A status mark for one student on one date.</summary>
public sealed record AttendanceCellDto(
    string Date,        // ISO yyyy-MM-dd
    string Status       // P | L | E | U | Z
);

/// <summary>One student row in the grid, with per-day marks and summary counts.</summary>
public sealed record AttendanceStudentRowDto(
    string StudentId,
    string Name,
    IReadOnlyList<AttendanceCellDto> Marks,
    int PresentCount,
    int LateCount,
    int ExcusedCount,
    int UnexcusedCount,
    int ZoomCount
);

/// <summary>The full month grid for one level (course).</summary>
public sealed record AttendanceGridDto(
    string CourseId,
    string CourseTitle,
    int Year,
    int Month,
    IReadOnlyList<AttendanceDayDto> Days,
    IReadOnlyList<AttendanceStudentRowDto> Students
);

/// <summary>A single mark to persist. A null/empty Status clears the mark.</summary>
public sealed record AttendanceMarkDto(
    string StudentId,
    string Date,        // ISO yyyy-MM-dd
    string? Status,     // P | L | E | U | Z, or null/empty to clear
    string? Note
);

/// <summary>Batch upsert of attendance marks for a level.</summary>
public sealed record SaveAttendanceRequestDto(
    string CourseId,
    IReadOnlyList<AttendanceMarkDto> Marks
);
