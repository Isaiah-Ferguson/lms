namespace CodeStackLMS.Application.Comments.DTOs;

public record CreateCommentDto(
    string Message
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
