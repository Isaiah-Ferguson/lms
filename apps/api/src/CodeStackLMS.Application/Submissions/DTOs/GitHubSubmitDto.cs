using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record GitHubSubmitDto(
    [property: Required, StringLength(500)] string RepoUrl,
    [property: StringLength(255)] string? Branch = null,
    [property: StringLength(64)] string? CommitHash = null,
    [property: StringLength(1000)] string? FigmaUrl = null,
    [property: StringLength(1000)] string? HostedUrl = null,
    [property: StringLength(4000)] string? Note = null
);
