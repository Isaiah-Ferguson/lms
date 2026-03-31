using CodeStackLMS.Application.Comments.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ICommentService
{
    Task<IReadOnlyList<CommentDto>> GetCommentsForAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default);
    Task<CommentDto> AddCommentAsync(string assignmentId, CreateCommentDto dto, CancellationToken cancellationToken = default);
}
