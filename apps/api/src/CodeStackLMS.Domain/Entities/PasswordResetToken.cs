using CodeStackLMS.Domain.Common;

namespace CodeStackLMS.Domain.Entities;

/// <summary>
/// A single-use, short-lived token proving the holder controls the account's
/// email address. Only a SHA-256 hash is stored — the raw token exists solely
/// in the reset link that was emailed.
///
/// Requesting one must never mutate the account: an unauthenticated caller can
/// trigger issuance for any address, so the password only changes when the
/// token is redeemed.
/// </summary>
public class PasswordResetToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }

    public User User { get; set; } = null!;
}
