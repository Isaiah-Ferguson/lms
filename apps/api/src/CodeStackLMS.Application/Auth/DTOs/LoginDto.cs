using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Auth.DTOs;

public record LoginDto(
    [property: Required, EmailAddress, StringLength(320)] string Email,
    [property: Required, StringLength(128)] string Password);

public record CreateUserDto(
    [property: Required, StringLength(200, MinimumLength = 1)] string Name,
    [property: Required, EmailAddress, StringLength(320)] string Email,
    [property: Required] string Role,
    [property: StringLength(200)] string? Town);

public record ChangePasswordDto(
    [property: Required, StringLength(128)] string CurrentPassword,
    [property: Required, StringLength(128, MinimumLength = 8)] string NewPassword);

public record ForgotPasswordDto(
    [property: Required, EmailAddress, StringLength(320)] string Email);

public record AuthTokenDto(
    string AccessToken,
    int ExpiresIn,
    bool MustChangePassword,
    string RefreshToken,
    int RefreshExpiresIn);

public record RefreshRequestDto(
    [property: Required, StringLength(512)] string RefreshToken);

public record LogoutRequestDto(
    [property: StringLength(512)] string? RefreshToken);
