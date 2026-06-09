using CodeStackLMS.Application.Attendance.DTOs;

namespace CodeStackLMS.Application.Attendance;

public interface IAttendanceService
{
    Task<AttendanceGridDto> GetMonthGridAsync(
        string courseId,
        int year,
        int month,
        CancellationToken cancellationToken = default);

    Task SaveAttendanceAsync(
        SaveAttendanceRequestDto dto,
        string currentUserId,
        CancellationToken cancellationToken = default);
}
