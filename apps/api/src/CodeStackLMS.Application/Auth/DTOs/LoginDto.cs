using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Auth.DTOs;

public record LoginDto(
    [Required, EmailAddress, StringLength(320)] string Email,
    [Required, StringLength(128)] string Password);

public record CreateUserDto(
    [Required, StringLength(200, MinimumLength = 1)] string Name,
    [Required, EmailAddress, StringLength(320)] string Email,
    [Required] string Role,
    [StringLength(200)] string? Town);

public record ChangePasswordDto(
    [Required, StringLength(128)] string CurrentPassword,
    [Required, StringLength(128, MinimumLength = 8)] string NewPassword);

public record ForgotPasswordDto(
    [Required, EmailAddress, StringLength(320)] string Email);

public record AuthTokenDto(
    string AccessToken,
    int ExpiresIn,
    bool MustChangePassword,
    string RefreshToken,
    int RefreshExpiresIn);

public record RefreshRequestDto(
    [Required, StringLength(512)] string RefreshToken);

public record LogoutRequestDto(
    [StringLength(512)] string? RefreshToken);
