using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Announcement : BaseEntity, IAuditableEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Tag { get; set; }
    public DateTime AnnouncedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Course Course { get; set; } = null!;
}
