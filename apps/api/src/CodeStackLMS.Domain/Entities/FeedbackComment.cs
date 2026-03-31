using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class FeedbackComment : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Guid AuthorId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    
    public string? FilePath { get; set; }
    public int? LineStart { get; set; }
    public int? LineEnd { get; set; }

    public Submission Submission { get; set; } = null!;
    public User Author { get; set; } = null!;
}
