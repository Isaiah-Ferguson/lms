namespace CodeStackLMS.Application.Submissions.DTOs;

public record GitHubSubmitDto(
    string RepoUrl,
    string? Branch,
    string? CommitHash,
    string? FigmaUrl = null,
    string? HostedUrl = null
);
