using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Grade : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Guid InstructorId { get; set; }
    public decimal TotalScore { get; set; }
    public string RubricBreakdownJson { get; set; } = string.Empty;
    public string OverallComment { get; set; } = string.Empty;
    public DateTime GradedAt { get; set; }

    public Submission Submission { get; set; } = null!;
    public User Instructor { get; set; } = null!;
}
