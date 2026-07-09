using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record RequestUploadDto(
    CodeStackLMS.Domain.Enums.SubmissionType Type,
    [property: Required, MinLength(1)] List<FileMetaDto> Files,
    [property: StringLength(1000)] string? FigmaUrl = null,
    [property: StringLength(1000)] string? GitHubRepoUrl = null,
    [property: StringLength(1000)] string? HostedUrl = null,
    [property: StringLength(4000)] string? Note = null
);

public record FileMetaDto(
    [property: Required, StringLength(255)] string FileName,
    [property: Required, StringLength(255)] string ContentType,
    [property: Range(1, 100L * 1024 * 1024)] long SizeBytes
);
