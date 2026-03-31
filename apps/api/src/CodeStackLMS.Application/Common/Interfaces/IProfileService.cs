using CodeStackLMS.Application.AdminParticipants.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IProfileService
{
    Task<ProfileDataDto> GetMyProfileAsync(CancellationToken cancellationToken = default);
    Task<ProfileDataDto?> GetProfileForAdminAsync(string userId, CancellationToken cancellationToken = default);
    Task<ProfileUserDto> UpdateProfileAsync(string userId, string name, string town, string phoneNumber, string gitHubUsername, string? avatarBlobPath = null, CancellationToken cancellationToken = default);
    Task<UserPreferencesDto> UpdatePreferencesAsync(bool emailNotificationsEnabled, bool darkModeEnabled, CancellationToken cancellationToken = default);
    Task<AvatarUploadSlotDto> GenerateAvatarUploadSlotAsync(string userId, string fileName, string contentType, long sizeBytes, CancellationToken cancellationToken = default);
    Task SaveAdminNoteAsync(string userId, string text, CancellationToken cancellationToken = default);
    Task SetProbationStatusAsync(string userId, bool isOnProbation, string reason, CancellationToken cancellationToken = default);
}
