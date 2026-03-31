using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Cohort : BaseEntity, IAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<CohortCourse> CohortCourses { get; set; } = new List<CohortCourse>();
}
