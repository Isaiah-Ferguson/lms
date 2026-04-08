using CodeStackLMS.Application.AdminParticipants.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IAdminParticipantsService
{
    Task<AdminParticipantsDataDto> GetParticipantsAsync(CancellationToken cancellationToken = default);
    Task EnrollUsersAsync(EnrollUsersRequestDto dto, CancellationToken cancellationToken = default);
    Task ToggleUserActiveAsync(string userId, CancellationToken cancellationToken = default);
    Task ToggleUserAdminAsync(string userId, CancellationToken cancellationToken = default);
}
