using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/grades")]
[Authorize]
public class GradesController : ControllerBase
{
    private readonly IInstructorService _instructorService;

    public GradesController(IInstructorService instructorService)
    {
        _instructorService = instructorService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/grades/my?courseId=level-1
    // Returns the current user's grades for a given course
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("my")]
    [ProducesResponseType(typeof(StudentGradesDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyGrades(
        [FromQuery] string courseId,
        CancellationToken cancellationToken)
    {
        var result = await _instructorService.GetMyGradesAsync(courseId, cancellationToken);
        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/grades/admin?courseId=level-1
    // Returns all enrolled students' grades for a course (admin/instructor only)
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("admin")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(AdminGradesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAdminGrades(
        [FromQuery] string courseId,
        CancellationToken cancellationToken)
    {
        var result = await _instructorService.GetAdminGradesAsync(courseId, cancellationToken);
        return Ok(result);
    }
}
