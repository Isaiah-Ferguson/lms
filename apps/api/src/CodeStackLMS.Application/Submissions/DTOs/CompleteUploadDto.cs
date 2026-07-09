using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Submissions.DTOs;

public record CompleteUploadDto(
    [Required, MinLength(1)] List<CompletedFileDto> Files
);

public record CompletedFileDto(
    [Required, StringLength(1024)] string BlobPath,
    [Required, StringLength(255)] string FileName,
    [Required, StringLength(255)] string ContentType,
    [Range(1, 100L * 1024 * 1024)] long SizeBytes,
    [Required(AllowEmptyStrings = true), StringLength(128)] string Checksum
);
