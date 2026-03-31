using CodeStackLMS.Domain.Common;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Domain.Entities;

public class Submission : BaseEntity, IAuditableEntity
{
    public Guid AssignmentId { get; set; }
    public Guid StudentId { get; set; }
    public int AttemptNumber { get; set; }
    public SubmissionType Type { get; set; }
    public SubmissionStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // External links for the submission
    public string? FigmaUrl { get; set; }
    public string? GitHubRepoUrl { get; set; }
    public string? HostedUrl { get; set; }
    public string? Note { get; set; }

    public Assignment Assignment { get; set; } = null!;
    public User Student { get; set; } = null!;
    public ICollection<SubmissionArtifact> Artifacts { get; set; } = new List<SubmissionArtifact>();
    public GitHubSubmissionInfo? GitHubInfo { get; set; }
    public Grade? Grade { get; set; }
    public ICollection<FeedbackComment> FeedbackComments { get; set; } = new List<FeedbackComment>();
}
