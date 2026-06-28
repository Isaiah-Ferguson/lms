namespace CodeStackLMS.Application.Submissions.DTOs;

public record GitHubSubmitDto(
    string RepoUrl,
    string? Branch = null,
    string? CommitHash = null,
    string? FigmaUrl = null,
    string? HostedUrl = null,
    string? Note = null
);
