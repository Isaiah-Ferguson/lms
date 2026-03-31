using CodeStackLMS.Domain.Common;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Domain.Entities;

public class Lesson : BaseEntity, IAuditableEntity
{
    public Guid ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public LessonType Type { get; set; }
    
    public string? VideoUrl { get; set; }
    public string? VideoBlobPath { get; set; }
    public VideoSourceType VideoSource { get; set; } = VideoSourceType.None;
    public string? VideoMimeType { get; set; }
    public int? DurationSeconds { get; set; }
    
    public string? TextContent { get; set; }
    
    public string? LinkUrl { get; set; }
    public string? LinkDescription { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Module Module { get; set; } = null!;
    public ICollection<LessonArtifact> Artifacts { get; set; } = new List<LessonArtifact>();
}
