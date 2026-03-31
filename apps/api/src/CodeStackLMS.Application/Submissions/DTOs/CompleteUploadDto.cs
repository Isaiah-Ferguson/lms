namespace CodeStackLMS.Application.Submissions.DTOs;

public record CompleteUploadDto(
    List<CompletedFileDto> Files
);

public record CompletedFileDto(
    string BlobPath,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Checksum
);
