using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class GitHubSubmissionInfo : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public string RepoUrl { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Submission Submission { get; set; } = null!;
}
