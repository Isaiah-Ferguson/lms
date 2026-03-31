using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record SubmissionResponseDto(
    Guid Id,
    Guid AssignmentId,
    Guid StudentId,
    int AttemptNumber,
    SubmissionType Type,
    SubmissionStatus Status,
    DateTime CreatedAt,
    string? FigmaUrl,
    string? GitHubRepoUrl,
    string? HostedUrl
);
