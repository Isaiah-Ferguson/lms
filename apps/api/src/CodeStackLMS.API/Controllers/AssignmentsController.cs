using CodeStackLMS.Application.Assignments.DTOs;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;

    public AssignmentsController(IAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    [HttpGet("{assignmentId}")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssignment(
        [FromRoute] string assignmentId,
        CancellationToken cancellationToken)
    {
        var assignment = await _assignmentService.GetAssignmentAsync(assignmentId, cancellationToken);
        return Ok(assignment);
    }

    [HttpGet("course/{courseId}")]
    [ProducesResponseType(typeof(IReadOnlyList<AssignmentListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssignmentsByCourse(
        [FromRoute] string courseId,
        CancellationToken cancellationToken)
    {
        var assignments = await _assignmentService.GetAssignmentsByCourseAsync(courseId, cancellationToken);
        return Ok(assignments);
    }

    [HttpGet("module/{moduleId}")]
    [ProducesResponseType(typeof(IReadOnlyList<AssignmentListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssignmentsByModule(
        [FromRoute] string moduleId,
        CancellationToken cancellationToken)
    {
        var assignments = await _assignmentService.GetAssignmentsByModuleAsync(moduleId, cancellationToken);
        return Ok(assignments);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateAssignment(
        [FromBody] CreateAssignmentDto dto,
        CancellationToken cancellationToken)
    {
        var assignment = await _assignmentService.CreateAssignmentAsync(dto, cancellationToken);
        return CreatedAtAction(
            nameof(GetAssignment),
            new { assignmentId = assignment.Id },
            assignment);
    }

    [HttpPut("{assignmentId}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(AssignmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateAssignment(
        [FromRoute] string assignmentId,
        [FromBody] UpdateAssignmentDto dto,
        CancellationToken cancellationToken)
    {
        var assignment = await _assignmentService.UpdateAssignmentAsync(assignmentId, dto, cancellationToken);
        return Ok(assignment);
    }

    [HttpDelete("{assignmentId}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteAssignment(
        [FromRoute] string assignmentId,
        CancellationToken cancellationToken)
    {
        await _assignmentService.DeleteAssignmentAsync(assignmentId, cancellationToken);
        return NoContent();
    }

    [HttpGet("{assignmentId}/my-submission")]
    [ProducesResponseType(typeof(StudentSubmissionStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMySubmission(
        [FromRoute] string assignmentId,
        CancellationToken cancellationToken)
    {
        var submission = await _assignmentService.GetMySubmissionAsync(assignmentId, cancellationToken);
        return Ok(submission);
    }
}
