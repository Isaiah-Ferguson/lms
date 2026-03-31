using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Course : BaseEntity, IAuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<CohortCourse> CohortCourses { get; set; } = new List<CohortCourse>();
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<UserCourseEnrollment> UserEnrollments { get; set; } = new List<UserCourseEnrollment>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
}
