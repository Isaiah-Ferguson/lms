using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Lessons.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/lessons")]
[Authorize]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;
    private readonly ILogger<LessonsController> _logger;

    public LessonsController(
        ILessonService lessonService,
        ILogger<LessonsController> logger)
    {
        _lessonService = lessonService;
        _logger = logger;
    }


    [HttpGet("{lessonId:guid}/video-token")]
    [ProducesResponseType(typeof(VideoTokenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVideoToken(
        [FromRoute] Guid lessonId,
        CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetVideoTokenAsync(lessonId, cancellationToken);

        _logger.LogInformation(
            "Video token issued for lesson {LessonId}. Source={Source} ExpiresAt={ExpiresAt}",
            lessonId, result.VideoSource, result.ExpiresAt);

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateLesson(
        [FromBody] CreateLessonDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _lessonService.CreateLessonAsync(dto, cancellationToken);

        _logger.LogInformation(
            "Lesson created. LessonId={LessonId} ModuleId={ModuleId} Title={Title}",
            result.Id, result.ModuleId, result.Title);

        return StatusCode(201, result);
    }


    [HttpPut("{lessonId:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLesson(
        [FromRoute] Guid lessonId,
        [FromBody] UpdateLessonDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _lessonService.UpdateLessonAsync(lessonId, dto, cancellationToken);

        _logger.LogInformation(
            "Lesson updated. LessonId={LessonId} Title={Title}",
            result.Id, result.Title);

        return Ok(result);
    }


    [HttpDelete("{lessonId:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLesson(
        [FromRoute] Guid lessonId,
        CancellationToken cancellationToken)
    {
        await _lessonService.DeleteLessonAsync(lessonId, cancellationToken);

        _logger.LogInformation("Lesson deleted. LessonId={LessonId}", lessonId);

        return NoContent();
    }

    [HttpPost("{lessonId:guid}/artifacts")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(typeof(LessonArtifactDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadArtifact(
        [FromRoute] Guid lessonId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new ProblemDetails { Title = "Bad Request", Detail = "No file uploaded", Status = 400 });

        await using var stream = file.OpenReadStream();
        var result = await _lessonService.UploadArtifactAsync(
            lessonId,
            file.FileName,
            file.ContentType,
            stream,
            cancellationToken);

        _logger.LogInformation(
            "Artifact uploaded. ArtifactId={ArtifactId} LessonId={LessonId} FileName={FileName}",
            result.Id, lessonId, result.FileName);

        return StatusCode(201, result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/lessons/artifacts/{artifactId}
    // Delete a lesson artifact
    // ─────────────────────────────────────────────────────────────────────────
    [HttpDelete("artifacts/{artifactId:guid}")]
    [Authorize(Roles = "Admin,Instructor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteArtifact(
        [FromRoute] Guid artifactId,
        CancellationToken cancellationToken)
    {
        await _lessonService.DeleteArtifactAsync(artifactId, cancellationToken);

        _logger.LogInformation("Artifact deleted. ArtifactId={ArtifactId}", artifactId);

        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/lessons?moduleId={moduleId}
    // Get all lessons for a module
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<LessonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetModuleLessons(
        [FromQuery] Guid moduleId,
        CancellationToken cancellationToken)
    {
        var result = await _lessonService.GetModuleLessonsAsync(moduleId, cancellationToken);
        return Ok(result);
    }
}
