using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class UserCourseEnrollment : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public DateTime EnrolledAt { get; set; }

    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
