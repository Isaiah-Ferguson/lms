using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Submissions.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// GitHubSubmitDto is in the same DTOs namespace — no extra using needed

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/submissions")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;
    private readonly ILogger<SubmissionsController> _logger;

    public SubmissionsController(
        ISubmissionService submissionService,
        ILogger<SubmissionsController> logger)
    {
        _submissionService = submissionService;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{assignmentId}/request-upload
    //
    // Student calls this first. Returns one SAS URL per file (write-only,
    // 15-minute expiry). The client uploads directly to Azure Blob using
    // each SAS URL via HTTP PUT, then calls complete-upload.
    //
    // Request body:
    // {
    //   "type": "Upload",
    //   "files": [
    //     { "fileName": "solution.zip", "contentType": "application/zip", "sizeBytes": 204800 }
    //   ]
    // }
    //
    // Response:
    // {
    //   "submissionId": "guid",
    //   "uploadSlots": [
    //     {
    //       "fileName": "solution.zip",
    //       "blobPath": "submissions/{cohortId}/{assignmentId}/{studentId}/{submissionId}/solution.zip",
    //       "sasUrl": "https://....blob.core.windows.net/...?sv=...&sig=...",
    //       "contentType": "application/zip",
    //       "maxSizeBytes": 104857600
    //     }
    //   ],
    //   "expiresAt": "2026-02-20T17:00:00Z"
    // }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{assignmentId:guid}/request-upload")]
    [ProducesResponseType(typeof(UploadUrlResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RequestUpload(
        [FromRoute] Guid assignmentId,
        [FromBody] RequestUploadDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _submissionService.RequestUploadAsync(
            assignmentId, dto, cancellationToken);

        _logger.LogInformation(
            "Upload requested for assignment {AssignmentId} by student. SubmissionId={SubmissionId}",
            assignmentId, result.SubmissionId);

        return CreatedAtAction(
            nameof(GetUploadStatus),
            new { submissionId = result.SubmissionId },
            result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{submissionId}/complete-upload
    //
    // Student calls this after all files are uploaded to Azure Blob.
    // API verifies each blob exists, persists SubmissionArtifacts, and
    // transitions status: PendingUpload → Processing.
    // A background job will then move it to ReadyToGrade.
    //
    // Request body:
    // {
    //   "files": [
    //     {
    //       "blobPath": "submissions/.../solution.zip",
    //       "fileName": "solution.zip",
    //       "contentType": "application/zip",
    //       "sizeBytes": 204800,
    //       "checksum": "sha256:abc123..."
    //     }
    //   ]
    // }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{submissionId:guid}/complete-upload")]
    [ProducesResponseType(typeof(SubmissionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteUpload(
        [FromRoute] Guid submissionId,
        [FromBody] CompleteUploadDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _submissionService.CompleteUploadAsync(
            submissionId, dto, cancellationToken);

        _logger.LogInformation(
            "Upload completed for submission {SubmissionId}. Status={Status}",
            submissionId, result.Status);

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/submissions/{assignmentId}/github-submit
    //
    // Student submits a GitHub repository reference.
    // Body: { "repoUrl": "https://github.com/org/repo", "branch": "main", "commitHash": "abc1234" }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost("{assignmentId:guid}/github-submit")]
    [ProducesResponseType(typeof(SubmissionResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GitHubSubmit(
        [FromRoute] Guid assignmentId,
        [FromBody] GitHubSubmitDto dto,
        CancellationToken cancellationToken)
    {
        var result = await _submissionService.GitHubSubmitAsync(
            assignmentId, dto, cancellationToken);

        _logger.LogInformation(
            "GitHub submission created for assignment {AssignmentId}. SubmissionId={SubmissionId}",
            assignmentId, result.Id);

        return CreatedAtAction(
            nameof(GetUploadStatus),
            new { submissionId = result.Id },
            result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/submissions/{submissionId}/artifacts
    //
    // Returns all artifacts for a submission with short-lived (10 min) read-only
    // SAS download URLs. Blobs are private — URLs are the only access path.
    //
    // Authorization:
    //   - Student: only their own submission
    //   - Instructor / Admin: any submission
    //
    // Response:
    // {
    //   "submissionId": "guid",
    //   "urlsExpireAt": "2026-02-21T18:10:00Z",
    //   "artifacts": [
    //     {
    //       "artifactId": "guid",
    //       "fileName": "solution.zip",
    //       "contentType": "application/zip",
    //       "sizeBytes": 204800,
    //       "checksum": "sha256:abc...",
    //       "downloadUrl": "https://....blob.core.windows.net/...?sv=...&sig=...",
    //       "urlExpiresAt": "2026-02-21T18:10:00Z"
    //     }
    //   ]
    // }
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("{submissionId:guid}/artifacts")]
    [ProducesResponseType(typeof(ArtifactListDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetArtifacts(
        [FromRoute] Guid submissionId,
        CancellationToken cancellationToken)
    {
        var result = await _submissionService.GetArtifactsAsync(
            submissionId, cancellationToken);

        return Ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/submissions/{submissionId}/status
    // Used as the CreatedAtAction target and for polling upload status.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("{submissionId:guid}/status")]
    [ProducesResponseType(typeof(SubmissionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUploadStatus(
        [FromRoute] Guid submissionId,
        CancellationToken cancellationToken)
    {
        var result = await _submissionService.GetSubmissionStatusAsync(submissionId, cancellationToken);
        return Ok(result);
    }
}
