namespace CodeStackLMS.Application.Auth.DTOs;

public record LoginDto(string Email, string Password);

public record RegisterDto(string Name, string Email, string Password);

public record CreateUserDto(string Name, string Email, string Role, string? Town);

public record ChangePasswordDto(string CurrentPassword, string NewPassword);

public record ForgotPasswordDto(string Email);

public record AuthTokenDto(string AccessToken, int ExpiresIn, bool MustChangePassword);
