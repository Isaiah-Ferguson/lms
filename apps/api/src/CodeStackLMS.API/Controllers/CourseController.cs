using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Courses.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/courses")]
[Authorize]
public class CourseController : ControllerBase
{
    private readonly ICourseDetailService _courseDetailService;

    public CourseController(ICourseDetailService courseDetailService)
    {
        _courseDetailService = courseDetailService;
    }

    [HttpGet("{courseId}")]
    [ProducesResponseType(typeof(CourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseDetail(
        [FromRoute] string courseId,
        CancellationToken cancellationToken)
    {
        try
        {
            var data = await _courseDetailService.GetCourseDetailAsync(courseId, cancellationToken);
            return Ok(data);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
    }

    [HttpPost("{courseId}/weeks")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(CourseWeekDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateWeek(
        [FromRoute] string courseId,
        [FromBody] CreateWeekDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _courseDetailService.CreateWeekAsync(courseId, dto, cancellationToken);
            return StatusCode(201, result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new ProblemDetails { Title = "Forbidden", Detail = ex.Message, Status = 403 });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Bad request", Detail = ex.Message, Status = 400 });
        }
    }

    [HttpPatch("{courseId}/weeks/{weekId}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(CourseWeekDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateWeek(
        [FromRoute] string courseId,
        [FromRoute] string weekId,
        [FromBody] UpdateWeekDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _courseDetailService.UpdateWeekAsync(courseId, weekId, dto, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new ProblemDetails { Title = "Forbidden", Detail = ex.Message, Status = 403 });
        }
    }

    [HttpPost("{courseId}/announcements")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(CourseAnnouncementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateAnnouncement(
        [FromRoute] string courseId,
        [FromBody] UpsertAnnouncementDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _courseDetailService.CreateAnnouncementAsync(courseId, dto, cancellationToken);
            return StatusCode(201, result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new ProblemDetails { Title = "Forbidden", Detail = ex.Message, Status = 403 });
        }
    }

    [HttpPut("{courseId}/announcements/{announcementId}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(CourseAnnouncementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAnnouncement(
        [FromRoute] string courseId,
        [FromRoute] string announcementId,
        [FromBody] UpsertAnnouncementDto dto,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _courseDetailService.UpdateAnnouncementAsync(courseId, announcementId, dto, cancellationToken);
            return Ok(result);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new ProblemDetails { Title = "Forbidden", Detail = ex.Message, Status = 403 });
        }
    }

    [HttpDelete("{courseId}/announcements/{announcementId}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAnnouncement(
        [FromRoute] string courseId,
        [FromRoute] string announcementId,
        CancellationToken cancellationToken)
    {
        try
        {
            await _courseDetailService.DeleteAnnouncementAsync(courseId, announcementId, cancellationToken);
            return NoContent();
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Not found", Detail = ex.Message, Status = 404 });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new ProblemDetails { Title = "Forbidden", Detail = ex.Message, Status = 403 });
        }
    }
}
