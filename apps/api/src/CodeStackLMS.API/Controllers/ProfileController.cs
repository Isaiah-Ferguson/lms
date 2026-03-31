using CodeStackLMS.Application.AdminParticipants.DTOs;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(ProfileDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var data = await _profileService.GetMyProfileAsync(cancellationToken);
        return Ok(data);
    }

    [HttpGet("admin/participants/{userId}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProfileDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetParticipantProfileForAdmin(
        [FromRoute] string userId,
        CancellationToken cancellationToken)
    {
        var data = await _profileService.GetProfileForAdminAsync(userId, cancellationToken);
        if (data is null)
            return NotFound();

        return Ok(data);
    }

    [HttpPut("users/{userId}")]
    [ProducesResponseType(typeof(ProfileUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(
        [FromRoute] string userId,
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _profileService.UpdateProfileAsync(
            userId,
            request.Name,
            request.Town,
            request.PhoneNumber,
            request.GitHubUsername,
            request.AvatarBlobPath,
            cancellationToken);

        return Ok(updated);
    }

    [HttpPost("users/{userId}/avatar-upload-slot")]
    [ProducesResponseType(typeof(AvatarUploadSlotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateAvatarUploadSlot(
        [FromRoute] string userId,
        [FromBody] GenerateAvatarUploadSlotRequest request,
        CancellationToken cancellationToken)
    {
        var slot = await _profileService.GenerateAvatarUploadSlotAsync(
            userId,
            request.FileName,
            request.ContentType,
            request.SizeBytes,
            cancellationToken);

        return Ok(slot);
    }

    [HttpPut("preferences")]
    [ProducesResponseType(typeof(UserPreferencesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdatePreferences(
        [FromBody] UpdatePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _profileService.UpdatePreferencesAsync(
            request.EmailNotificationsEnabled,
            request.DarkModeEnabled,
            cancellationToken);

        return Ok(updated);
    }

    [HttpPost("admin/participants/{userId}/notes")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveAdminNote(
        [FromRoute] string userId,
        [FromBody] SaveAdminNoteRequest request,
        CancellationToken cancellationToken)
    {
        await _profileService.SaveAdminNoteAsync(userId, request.Text, cancellationToken);
        return NoContent();
    }

    [HttpPost("admin/participants/{userId}/probation")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetProbationStatus(
        [FromRoute] string userId,
        [FromBody] SetProbationRequest request,
        CancellationToken cancellationToken)
    {
        await _profileService.SetProbationStatusAsync(userId, request.IsOnProbation, request.Reason, cancellationToken);
        return NoContent();
    }
}

public sealed record UpdatePreferencesRequest(
    bool EmailNotificationsEnabled,
    bool DarkModeEnabled);

public sealed record SaveAdminNoteRequest(string Text);

public sealed record SetProbationRequest(
    bool IsOnProbation,
    string Reason);

public sealed record UpdateProfileRequest(
    string Name,
    string Town,
    string PhoneNumber,
    string GitHubUsername,
    string? AvatarBlobPath = null);

public sealed record GenerateAvatarUploadSlotRequest(
    string FileName,
    string ContentType,
    long SizeBytes);
