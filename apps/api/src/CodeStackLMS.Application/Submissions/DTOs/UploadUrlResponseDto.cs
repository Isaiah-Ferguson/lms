namespace CodeStackLMS.Application.Submissions.DTOs;

public record UploadUrlResponseDto(
    Guid SubmissionId,
    List<FileUploadSlot> UploadSlots,
    DateTimeOffset ExpiresAt
);

public record FileUploadSlot(
    string FileName,
    string BlobPath,
    string SasUrl,
    string ContentType,
    long MaxSizeBytes
);
