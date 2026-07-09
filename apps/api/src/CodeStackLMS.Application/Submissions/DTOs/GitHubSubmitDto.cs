using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record GitHubSubmitDto(
    [Required, StringLength(500)] string RepoUrl,
    [StringLength(255)] string? Branch = null,
    [StringLength(64)] string? CommitHash = null,
    [StringLength(1000)] string? FigmaUrl = null,
    [StringLength(1000)] string? HostedUrl = null,
    [StringLength(4000)] string? Note = null
);
