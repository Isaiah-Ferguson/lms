namespace CodeStackLMS.Application.Submissions.DTOs;

public record RequestUploadDto(
    CodeStackLMS.Domain.Enums.SubmissionType Type,
    List<FileMetaDto> Files,
    string? FigmaUrl = null,
    string? GitHubRepoUrl = null,
    string? HostedUrl = null,
    string? Note = null
);

public record FileMetaDto(
    string FileName,
    string ContentType,
    long SizeBytes
);
