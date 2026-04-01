using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Module : BaseEntity, IAuditableEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public int? WeekNumber { get; set; }
    public string? DateRange { get; set; }
    public string? ZoomUrl { get; set; }
    public string? Topics { get; set; } // JSON array of topic strings
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Course Course { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
