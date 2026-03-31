namespace CodeStackLMS.Application.Submissions.DTOs;

public record ArtifactDownloadDto(
    Guid ArtifactId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Checksum,
    string DownloadUrl,
    DateTimeOffset UrlExpiresAt);

public record ArtifactListDto(
    Guid SubmissionId,
    IReadOnlyList<ArtifactDownloadDto> Artifacts,
    DateTimeOffset UrlsExpireAt);
