using CodeStackLMS.Domain.Common;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Domain.Entities;

public class Attendance : BaseEntity, IAuditableEntity
{
    public Guid CourseId { get; set; }
    public Guid StudentId { get; set; }
    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; }
    public SessionType SessionType { get; set; }
    public Guid RecordedByUserId { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Course Course { get; set; } = null!;
    public User Student { get; set; } = null!;
}
