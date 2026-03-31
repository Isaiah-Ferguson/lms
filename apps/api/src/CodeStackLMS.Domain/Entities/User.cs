using CodeStackLMS.Domain.Common;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Domain.Entities;

public class User : BaseEntity, IAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Town { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string GitHubUsername { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = false;
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool DarkModeEnabled { get; set; } = false;
    public bool IsOnProbation { get; set; } = false;
    public string ProbationReason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<Grade> GradesGiven { get; set; } = new List<Grade>();
    public ICollection<FeedbackComment> FeedbackComments { get; set; } = new List<FeedbackComment>();
    public ICollection<UserCourseEnrollment> CourseEnrollments { get; set; } = new List<UserCourseEnrollment>();
    public ICollection<UserAdminNote> AdminNotesReceived { get; set; } = new List<UserAdminNote>();
    public ICollection<UserAdminNote> AdminNotesAuthored { get; set; } = new List<UserAdminNote>();
}
