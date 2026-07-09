using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

/// <summary>
/// An opaque, long-lived session token used to mint new short-lived access
/// tokens. Only a SHA-256 hash is stored — the raw token exists solely in the
/// client's httpOnly cookie.
/// </summary>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public User User { get; set; } = null!;
}
