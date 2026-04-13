using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using CodeStackLMS.Application.Auth.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CodeStackLMS.Application.Auth;

public class AuthService : IAuthService
{
    private const int TokenExpirySeconds = 86400; // 24 hours

    private readonly IApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IApplicationDbContext db, IConfiguration config, IEmailService emailService, ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<AuthTokenDto> LoginAsync(
        LoginDto dto,
        CancellationToken cancellationToken = default)
    {
        var emailLower = dto.Email.Trim().ToLower();

        var user = await _db.Users
            .FirstOrDefaultAsync(
                u => u.Email == emailLower,
                cancellationToken);

        // Check if user exists
        if (user == null)
            throw new ValidationException("Invalid email or password.");

        // Check if account is deactivated
        if (!user.IsActive)
            throw new ValidationException("Your account has been deactivated. Please contact an administrator for assistance.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new ValidationException("Invalid email or password.");

        // Update last login timestamp
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var token = GenerateJwt(user);
        return new AuthTokenDto(token, TokenExpirySeconds, user.MustChangePassword);
    }

    public async Task RegisterAsync(
        RegisterDto dto,
        CancellationToken cancellationToken = default)
    {
        await CreateUserInternalAsync(
            dto.Name,
            dto.Email,
            string.Empty,
            dto.Password,
            UserRole.Student,
            false,
            cancellationToken);
    }

    public async Task CreateUserAsync(
        CreateUserDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var role))
            throw new ValidationException("Role must be Student, Instructor, or Admin.");

        var temporaryPassword = GenerateTemporaryPassword();

        await CreateUserInternalAsync(
            dto.Name,
            dto.Email,
            dto.Town,
            temporaryPassword,
            role,
            true,
            cancellationToken);

        // Attempt to send welcome email, but don't fail user creation if email fails
        try
        {
            var subject = "Your CodeStack LMS account is ready";
            var htmlBody = BuildWelcomeEmailBody(dto.Name, dto.Email, temporaryPassword);
            await _emailService.SendAsync(dto.Email.Trim(), subject, htmlBody, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log the error but don't throw - user was created successfully
            _logger.LogError(ex, "Failed to send welcome email to {Email}", dto.Email);
        }
    }

    public async Task ChangePasswordAsync(
        Guid userId,
        ChangePasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, cancellationToken)
            ?? throw new ValidationException("User account not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new ValidationException("Current password is incorrect.");

        if (dto.NewPassword.Length < 8)
            throw new ValidationException("New password must be at least 8 characters.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.MustChangePassword = false;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ForgotPasswordAsync(
        ForgotPasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var emailLower = dto.Email.Trim().ToLower();

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == emailLower, cancellationToken);

        // Silently return if email doesn't exist to prevent email enumeration attacks
        if (user == null)
            return;

        // Check if account is deactivated - throw error instead of silently returning
        if (!user.IsActive)
            throw new ValidationException("Your account has been deactivated. Please contact an administrator for assistance.");

        // Generate temporary password
        var temporaryPassword = GenerateTemporaryPassword();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword);
        user.MustChangePassword = true;

        await _db.SaveChangesAsync(cancellationToken);

        // Send password reset email - don't throw if email fails to prevent enumeration
        try
        {
            var subject = "Password Reset - CodeStack LMS";
            var htmlBody = BuildPasswordResetEmailBody(user.Name, user.Email, temporaryPassword);
            await _emailService.SendAsync(user.Email, subject, htmlBody, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log the error but don't throw - password was reset successfully
            _logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
        }
    }

    private async Task CreateUserInternalAsync(
        string name,
        string email,
        string? town,
        string password,
        UserRole role,
        bool mustChangePassword,
        CancellationToken cancellationToken)
    {
        var emailLower = email.Trim().ToLower();

        var exists = await _db.Users
            .AnyAsync(u => u.Email == emailLower, cancellationToken);

        if (exists)
            throw new ValidationException("An account with this email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Email = emailLower,
            Town = town?.Trim() ?? string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            IsActive = true,
            MustChangePassword = mustChangePassword,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateTemporaryPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string symbols = "!@#$%";

        var all = upper + lower + digits + symbols;
        var chars = new char[12];

        chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        chars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

        for (var i = 4; i < chars.Length; i++)
        {
            chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
        }

        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars);
    }

    private string BuildWelcomeEmailBody(string name, string email, string temporaryPassword)
    {
        var configuredUrls = _config["Frontend:Url"] ?? "http://localhost:3000";
        // Use the last URL (production) if multiple URLs are configured
        var appUrl = configuredUrls.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault() 
                     ?? "http://localhost:3000";
        var safeName = System.Net.WebUtility.HtmlEncode(name.Trim());
        var safeEmail = System.Net.WebUtility.HtmlEncode(email.Trim());
        var safePassword = System.Net.WebUtility.HtmlEncode(temporaryPassword);

        return $"""
            <p>Hello {safeName},</p>
            <p>Your CodeStack LMS account has been created.</p>
            <p><strong>Email:</strong> {safeEmail}<br/>
            <strong>Temporary password:</strong> {safePassword}</p>
            <p>Sign in at <a href=\"{appUrl}/login\">{appUrl}/login</a>.</p>
            <p>Please change your password after your first login.</p>
            """;
    }

    private string BuildPasswordResetEmailBody(string name, string email, string temporaryPassword)
    {
        var configuredUrls = _config["Frontend:Url"] ?? "http://localhost:3000";
        // Use the last URL (production) if multiple URLs are configured
        var appUrl = configuredUrls.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault() 
                     ?? "http://localhost:3000";
        var safeName = System.Net.WebUtility.HtmlEncode(name.Trim());
        var safeEmail = System.Net.WebUtility.HtmlEncode(email.Trim());
        var safePassword = System.Net.WebUtility.HtmlEncode(temporaryPassword);

        return $"""
            <p>Hello {safeName},</p>
            <p>We received a request to reset your password for your CodeStack LMS account.</p>
            <p><strong>Email:</strong> {safeEmail}<br/>
            <strong>Temporary password:</strong> {safePassword}</p>
            <p>Sign in at <a href=\"{appUrl}/login\">{appUrl}/login</a> using this temporary password.</p>
            <p><strong>Important:</strong> You will be required to change your password after logging in.</p>
            <p>If you did not request this password reset, please contact support immediately.</p>
            """;
    }

    private string GenerateJwt(User user)
    {
        var secret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("name", user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "codestack-lms",
            audience: _config["Jwt:Audience"] ?? "codestack-lms",
            claims: claims,
            expires: DateTime.UtcNow.AddSeconds(TokenExpirySeconds),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
