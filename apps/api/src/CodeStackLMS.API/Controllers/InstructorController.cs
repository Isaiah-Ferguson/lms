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
    private readonly IGradingService _grading;
    private readonly ISubmissionQueueService _queue;
    private readonly IGradebookService _gradebook;
    private readonly ILogger<InstructorController> _logger;

    public InstructorController(
        IGradingService grading,
        ISubmissionQueueService queue,
        IGradebookService gradebook,
        ILogger<InstructorController> logger)
    {
        _grading = grading;
        _queue = queue;
        _gradebook = gradebook;
        _logger = logger;
    }

    [HttpGet("submissions/{submissionId:guid}")]
    [ProducesResponseType(typeof(SubmissionDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubmissionDetail(
        [FromRoute] Guid submissionId,
        CancellationToken cancellationToken)
    {
        var result = await _grading.GetSubmissionDetailAsync(
            submissionId, cancellationToken);

        return Ok(result);
    }

    [HttpGet("submissions")]
    [ProducesResponseType(typeof(SubmissionQueuePageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubmissionQueue(
        [FromQuery] string? courseId,
        [FromQuery] string? status,
        [FromQuery] string? yearId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _queue.GetSubmissionQueueAsync(courseId, status, yearId, page, pageSize, cancellationToken);
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
        var result = await _grading.GradeSubmissionAsync(
            submissionId, dto, cancellationToken);

        _logger.LogInformation(
            "Submission {SubmissionId} graded. Score={Score} InstructorId={InstructorId}",
            submissionId, result.TotalScore, result.InstructorId);

        return Ok(result);
    }

    [HttpPost("assignments/{assignmentId:guid}/students/{studentId:guid}/grade")]
    [ProducesResponseType(typeof(ExistingGradeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GradeByStudent(
        [FromRoute] Guid assignmentId,
        [FromRoute] Guid studentId,
        [FromBody] GradeSubmissionDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _grading.GradeByStudentAsync(
            assignmentId, studentId, dto, cancellationToken);

        _logger.LogInformation(
            "Assignment {AssignmentId} graded for student {StudentId}. Score={Score} InstructorId={InstructorId}",
            assignmentId, studentId, result.TotalScore, result.InstructorId);

        return Ok(result);
    }

    [HttpPost("submissions/{submissionId:guid}/return")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReturnSubmission(
        [FromRoute] Guid submissionId,
        [FromBody] ReturnSubmissionDto dto,
        CancellationToken cancellationToken)
    {
        await _grading.ReturnSubmissionAsync(
            submissionId, dto.Reason, cancellationToken);

        _logger.LogInformation(
            "Submission {SubmissionId} returned to student. Reason: {Reason}",
            submissionId, dto.Reason);

        return Ok();
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
        var result = await _gradebook.GetAssignmentSubmissionsRosterAsync(
            assignmentId, cancellationToken);

        return Ok(result);
    }
}
