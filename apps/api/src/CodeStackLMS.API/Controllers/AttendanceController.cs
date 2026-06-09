using CodeStackLMS.Application.Attendance;
using CodeStackLMS.Application.Attendance.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/admin/attendance")]
[Authorize(Roles = "Admin")]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(IAttendanceService attendanceService)
    {
        _attendanceService = attendanceService;
    }

    // GET /api/admin/attendance?courseId=&year=&month=
    [HttpGet]
    [ProducesResponseType(typeof(AttendanceGridDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMonthGrid(
        [FromQuery] string courseId,
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        var grid = await _attendanceService.GetMonthGridAsync(courseId, year, month, cancellationToken);
        return Ok(grid);
    }

    // POST /api/admin/attendance
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveAttendance(
        [FromBody] SaveAttendanceRequestDto dto,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("User ID not found in token.");

        await _attendanceService.SaveAttendanceAsync(dto, currentUserId, cancellationToken);
        return NoContent();
    }
}
