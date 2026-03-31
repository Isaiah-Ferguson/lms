using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class CohortCourse : BaseEntity
{
    public Guid CohortId { get; set; }
    public Guid CourseId { get; set; }

    public Cohort Cohort { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
