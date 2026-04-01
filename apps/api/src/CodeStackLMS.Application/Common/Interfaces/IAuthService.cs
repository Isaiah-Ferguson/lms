using CodeStackLMS.Application.Auth.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthTokenDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task CreateUserAsync(CreateUserDto dto, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default);
}
