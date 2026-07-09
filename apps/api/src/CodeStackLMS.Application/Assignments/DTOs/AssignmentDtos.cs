using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Assignments.DTOs;

public record CreateAssignmentDto(
    [property: Required, StringLength(300, MinimumLength = 1)] string Title,
    [property: Required, StringLength(100)] string AssignmentType,
    [property: Required(AllowEmptyStrings = true), StringLength(20000)] string Instructions,
    DateTime DueDate,
    [property: StringLength(1000)] string? AttachmentUrl,
    Guid ModuleId
);

public record UpdateAssignmentDto(
    [property: Required, StringLength(300, MinimumLength = 1)] string Title,
    [property: Required, StringLength(100)] string AssignmentType,
    [property: Required(AllowEmptyStrings = true), StringLength(20000)] string Instructions,
    DateTime DueDate,
    [property: StringLength(1000)] string? AttachmentUrl
);

public record AssignmentDto(
    string Id,
    string Title,
    string AssignmentType,
    string Instructions,
    DateTime DueDate,
    string? AttachmentUrl,
    string ModuleId,
    string ModuleTitle,
    string CourseId,
    string CourseTitle,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record AssignmentListDto(
    string Id,
    string Title,
    string AssignmentType,
    DateTime DueDate,
    string ModuleTitle,
    string CourseTitle,
    int SubmissionCount,
    DateTime CreatedAt
);

public record StudentSubmissionStatusDto(
    bool HasSubmitted,
    string? SubmissionId,
    DateTime? SubmittedAt,
    string? FileName,
    long? FileSize,
    string? Status,
    string? Type = null,
    string? GitHubRepoUrl = null,
    string? Branch = null,
    string? CommitHash = null
);
