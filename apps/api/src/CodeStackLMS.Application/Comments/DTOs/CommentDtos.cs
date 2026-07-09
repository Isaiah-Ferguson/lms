using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Comments.DTOs;

public record CreateCommentDto(
    [property: Required, StringLength(4000, MinimumLength = 1)] string Message
);

public record CommentDto(
    string Id,
    string SubmissionId,
    string AuthorId,
    string AuthorName,
    string Message,
    DateTime CreatedAt,
    string? FilePath,
    int? LineStart,
    int? LineEnd
);
