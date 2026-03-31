using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Application.Instructor.DTOs;

public record SubmissionDetailDto(
    Guid SubmissionId,
    int AttemptNumber,
    SubmissionType Type,
    SubmissionStatus Status,
    DateTime CreatedAt,
    string? FigmaUrl,
    string? GithubRepoUrl,
    string? HostedUrl,
    string? Note,
    StudentInfoDto Student,
    AssignmentInfoDto Assignment,
    IReadOnlyList<ArtifactDto>? Artifacts,
    GitHubInfoDto? GitHubInfo,
    ExistingGradeDto? ExistingGrade);

public record StudentInfoDto(
    Guid Id,
    string Name,
    string Email);

public record AssignmentInfoDto(
    Guid Id,
    string Title,
    string Instructions,
    string RubricJson,
    decimal MaxScore);

public record ArtifactDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string ReadUrl);

public record GitHubInfoDto(
    string RepoUrl,
    string Branch,
    string? CommitHash);

public record ExistingGradeDto(
    Guid GradeId,
    decimal TotalScore,
    string RubricBreakdownJson,
    string OverallComment,
    DateTime GradedAt,
    Guid InstructorId);
