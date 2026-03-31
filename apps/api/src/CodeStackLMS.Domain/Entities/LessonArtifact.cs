using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class LessonArtifact : BaseEntity
{
    public Guid LessonId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
