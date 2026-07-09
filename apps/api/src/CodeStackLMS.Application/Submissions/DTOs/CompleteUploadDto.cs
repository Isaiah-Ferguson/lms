using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record CompleteUploadDto(
    [property: Required, MinLength(1)] List<CompletedFileDto> Files
);

public record CompletedFileDto(
    [property: Required, StringLength(1024)] string BlobPath,
    [property: Required, StringLength(255)] string FileName,
    [property: Required, StringLength(255)] string ContentType,
    [property: Range(1, 100L * 1024 * 1024)] long SizeBytes,
    [property: Required(AllowEmptyStrings = true), StringLength(128)] string Checksum
);
