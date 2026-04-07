using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class Assignment : BaseEntity, IAuditableEntity
{
    public Guid ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AssignmentType { get; set; } = "Challenge";
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string? AttachmentUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Module Module { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
