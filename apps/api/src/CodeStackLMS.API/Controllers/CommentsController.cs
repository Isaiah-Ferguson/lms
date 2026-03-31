using CodeStackLMS.Application.Comments.DTOs;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/assignments/{assignmentId}/comments")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentsController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CommentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetComments(
        [FromRoute] string assignmentId,
        CancellationToken cancellationToken)
    {
        var comments = await _commentService.GetCommentsForAssignmentAsync(assignmentId, cancellationToken);
        return Ok(comments);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddComment(
        [FromRoute] string assignmentId,
        [FromBody] CreateCommentDto dto,
        CancellationToken cancellationToken)
    {
        var comment = await _commentService.AddCommentAsync(assignmentId, dto, cancellationToken);
        return CreatedAtAction(
            nameof(GetComments),
            new { assignmentId },
            comment);
    }
}
