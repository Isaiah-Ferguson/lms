namespace CodeStackLMS.Application.Assignments.DTOs;

public record CreateAssignmentDto(
    string Title,
    string AssignmentType,
    string Instructions,
    DateTime DueDate,
    string? AttachmentUrl,
    Guid ModuleId
);

public record UpdateAssignmentDto(
    string Title,
    string AssignmentType,
    string Instructions,
    DateTime DueDate,
    string? AttachmentUrl
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
    string? Status
);
