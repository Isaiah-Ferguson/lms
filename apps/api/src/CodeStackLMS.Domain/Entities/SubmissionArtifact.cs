using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class SubmissionArtifact : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Checksum { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Submission Submission { get; set; } = null!;
}
