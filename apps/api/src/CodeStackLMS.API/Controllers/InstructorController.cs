using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Instructor.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/instructor")]
[Authorize(Roles = "Instructor,Admin")]
public class InstructorController : ControllerBase
{
    private readonly IInstructorService _instructorService;
    private readonly ILogger<InstructorController> _logger;

    public InstructorController(
        IInstructorService instructorService,
        ILogger<InstructorController> logger)
    {
        _instructorService = instructorService;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/submissions/{submissionId}
    //
    // Returns full submission detail for grading:
    //  - student info
    //  - assignment instructions + rubric
    //  - artifacts (with 30-min read SAS URLs) or GitHub info
    //  - existing grade if already graded
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("submissions/{submissionId:guid}")]
    [ProducesResponseType(typeof(SubmissionDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubmissionDetail(
        [FromRoute] Guid submissionId,
        CancellationToken cancellationToken)
    {
        var result = await _instructorService.GetSubmissionDetailAsync(
            submissionId, cancellationToken);

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/submissions — submission queue
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("submissions")]
    [ProducesResponseType(typeof(SubmissionQueuePageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubmissionQueue(
        [FromQuery] string? courseId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _instructorService.GetSubmissionQueueAsync(courseId, status, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPost("submissions/{submissionId:guid}/grade")]
    [ProducesResponseType(typeof(ExistingGradeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GradeSubmission(
        [FromRoute] Guid submissionId,
        [FromBody] GradeSubmissionDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _instructorService.GradeSubmissionAsync(
            submissionId, dto, cancellationToken);

        _logger.LogInformation(
            "Submission {SubmissionId} graded. Score={Score} InstructorId={InstructorId}",
            submissionId, result.TotalScore, result.InstructorId);

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/instructor/assignments/{assignmentId}/submissions-roster
    // Returns all enrolled students and their submission status for an assignment
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("assignments/{assignmentId:guid}/submissions-roster")]
    [ProducesResponseType(typeof(AssignmentSubmissionsRosterDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAssignmentSubmissionsRoster(
        [FromRoute] Guid assignmentId,
        CancellationToken cancellationToken)
    {
        var result = await _instructorService.GetAssignmentSubmissionsRosterAsync(
            assignmentId, cancellationToken);

        return Ok(result);
    }
}
