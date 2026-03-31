using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

public class UserAdminNote : BaseEntity, IAuditableEntity
{
    public Guid TargetUserId { get; set; }
    public Guid AuthorUserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public User TargetUser { get; set; } = null!;
    public User AuthorUser { get; set; } = null!;
}
