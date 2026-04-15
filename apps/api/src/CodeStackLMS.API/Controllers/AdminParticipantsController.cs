using CodeStackLMS.API.Documents;
using CodeStackLMS.Application.AdminParticipants.DTOs;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/admin/participants")]
[Authorize(Roles = "Admin")]
public class AdminParticipantsController : ControllerBase
{
    private readonly IAdminParticipantsService _adminParticipantsService;

    public AdminParticipantsController(IAdminParticipantsService adminParticipantsService)
    {
        _adminParticipantsService = adminParticipantsService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminParticipantsDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetParticipants(CancellationToken cancellationToken)
    {
        var data = await _adminParticipantsService.GetParticipantsAsync(cancellationToken);
        return Ok(data);
    }

    [HttpPost("enrollments")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> EnrollUsers(
        [FromBody] EnrollUsersRequestDto dto,
        CancellationToken cancellationToken)
    {
        await _adminParticipantsService.EnrollUsersAsync(dto, cancellationToken);
        return NoContent();
    }

    [HttpDelete("enrollments")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UnenrollUsers(
        [FromBody] EnrollUsersRequestDto dto,
        CancellationToken cancellationToken)
    {
        await _adminParticipantsService.UnenrollUsersAsync(dto, cancellationToken);
        return NoContent();
    }

    [HttpPatch("{userId}/toggle-active")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleUserActive(
        [FromRoute] string userId,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        
        await _adminParticipantsService.ToggleUserActiveAsync(userId, currentUserId, cancellationToken);
        return NoContent();
    }

    [HttpPatch("{userId}/toggle-admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleUserAdmin(
        [FromRoute] string userId,
        CancellationToken cancellationToken)
    {
        await _adminParticipantsService.ToggleUserAdminAsync(userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("{userId}/notes/export-docx")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [Produces("application/vnd.openxmlformats-officedocument.wordprocessingml.document")]
    public IActionResult ExportPreviousNotesDocx(
        [FromRoute] string userId,
        [FromBody] ExportPreviousNotesRequest request)
    {
        if (request.PreviousNotes.Count == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No previous notes to export",
                Detail = "At least one previous note is required to export a document.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var rows = request.PreviousNotes
            .Select(note => $"{note.UpdatedAt} by {note.UpdatedBy} - {note.Text}")
            .ToArray();

        var title = string.IsNullOrWhiteSpace(request.UserName)
            ? "Previous Admin Notes"
            : $"Previous Admin Notes - {request.UserName}";

        var bytes = DocxDocumentBuilder.BuildSimpleDocument(title, rows);
        var safeUserId = userId.Replace("/", "-").Replace("\\", "-");
        var fileName = $"previous-admin-notes-{safeUserId}-{DateTime.UtcNow:yyyy-MM-dd}.docx";

        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileName);
    }
}

public sealed record ExportPreviousNotesRequest(
    string? UserName,
    IReadOnlyList<PreviousNoteExportItem> PreviousNotes);

public sealed record PreviousNoteExportItem(
    string Text,
    string UpdatedAt,
    string UpdatedBy);
