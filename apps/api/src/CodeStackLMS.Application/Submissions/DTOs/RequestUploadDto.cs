using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record RequestUploadDto(
    CodeStackLMS.Domain.Enums.SubmissionType Type,
    [Required, MinLength(1)] List<FileMetaDto> Files,
    [StringLength(1000)] string? FigmaUrl = null,
    [StringLength(1000)] string? GitHubRepoUrl = null,
    [StringLength(1000)] string? HostedUrl = null,
    [StringLength(4000)] string? Note = null
);

public record FileMetaDto(
    [Required, StringLength(255)] string FileName,
    [Required, StringLength(255)] string ContentType,
    [Range(1, 100L * 1024 * 1024)] long SizeBytes
);
