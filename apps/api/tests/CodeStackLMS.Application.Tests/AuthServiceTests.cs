using System.Text.RegularExpressions;
using CodeStackLMS.Application.Auth;
using CodeStackLMS.Application.Auth.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CodeStackLMS.Application.Tests;

public class AuthServiceTests : IDisposable
{
    private const string Password = "correct-horse-battery";

    private readonly TestDb _db = new();
    private readonly FakeEmailService _email = new();
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "unit-test-signing-secret-at-least-32-bytes!",
                ["Jwt:Issuer"] = "codestack-lms",
                ["Jwt:Audience"] = "codestack-lms",
            })
            .Build();

        _sut = new AuthService(_db.Context, config, _email, NullLogger<AuthService>.Instance);
    }

    public void Dispose() => _db.Dispose();

    private async Task<User> SeedUserAsync(bool isActive = true, bool mustChangePassword = false)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Test Student",
            Email = "student@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
            Role = UserRole.Student,
            IsActive = isActive,
            MustChangePassword = mustChangePassword,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Context.Users.Add(user);
        await _db.Context.SaveChangesAsync(CancellationToken.None);
        return user;
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokenAndUpdatesLastLogin()
    {
        var user = await SeedUserAsync();

        var result = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
        Assert.False(result.MustChangePassword);

        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.NotNull(saved!.LastLoginAt);
        Assert.True(saved.LastLoginAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task Login_IsCaseInsensitiveOnEmail()
    {
        await SeedUserAsync();

        var result = await _sut.LoginAsync(new LoginDto("STUDENT@Example.COM", Password));

        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
    }

    [Fact]
    public async Task Login_WithWrongPassword_Throws()
    {
        await SeedUserAsync();

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.LoginAsync(new LoginDto("student@example.com", "wrong-password")));
    }

    [Fact]
    public async Task Login_WithUnknownEmail_Throws()
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.LoginAsync(new LoginDto("nobody@example.com", Password)));
    }

    [Fact]
    public async Task Login_WithDeactivatedAccount_Throws()
    {
        await SeedUserAsync(isActive: false);

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.LoginAsync(new LoginDto("student@example.com", Password)));
    }

    [Fact]
    public async Task Login_SignalsMustChangePassword()
    {
        await SeedUserAsync(mustChangePassword: true);

        var result = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        Assert.True(result.MustChangePassword);
    }

    // ── Refresh tokens ────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_IssuesARefreshToken()
    {
        await SeedUserAsync();

        var result = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        Assert.False(string.IsNullOrWhiteSpace(result.RefreshToken));
        Assert.True(result.RefreshExpiresIn > result.ExpiresIn);
    }

    [Fact]
    public async Task Refresh_WithValidToken_ReturnsNewAccessToken()
    {
        await SeedUserAsync();
        var login = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        var refreshed = await _sut.RefreshAsync(login.RefreshToken);

        Assert.False(string.IsNullOrWhiteSpace(refreshed.AccessToken));
        Assert.Equal(login.RefreshToken, refreshed.RefreshToken);
    }

    [Fact]
    public async Task Refresh_WithUnknownToken_ThrowsUnauthorized()
    {
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.RefreshAsync("not-a-real-token"));
    }

    [Fact]
    public async Task Refresh_AfterRevocation_ThrowsUnauthorized()
    {
        await SeedUserAsync();
        var login = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        await _sut.RevokeRefreshTokenAsync(login.RefreshToken);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.RefreshAsync(login.RefreshToken));
    }

    [Fact]
    public async Task Refresh_AfterPasswordChange_ThrowsUnauthorized()
    {
        var user = await SeedUserAsync();
        var login = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        await _sut.ChangePasswordAsync(user.Id, new ChangePasswordDto(Password, "new-password-123"));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.RefreshAsync(login.RefreshToken));
    }

    // ── ChangePasswordAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_WithCorrectCurrent_UpdatesHashAndClearsFlag()
    {
        var user = await SeedUserAsync(mustChangePassword: true);

        await _sut.ChangePasswordAsync(user.Id, new ChangePasswordDto(Password, "new-password-123"));

        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password-123", saved!.PasswordHash));
        Assert.False(saved.MustChangePassword);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrent_Throws()
    {
        var user = await SeedUserAsync();

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ChangePasswordAsync(user.Id, new ChangePasswordDto("wrong", "new-password-123")));
    }

    [Fact]
    public async Task ChangePassword_WithShortNewPassword_Throws()
    {
        var user = await SeedUserAsync();

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ChangePasswordAsync(user.Id, new ChangePasswordDto(Password, "short")));
    }

    // ── ForgotPasswordAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ForgotPassword_ForUnknownEmail_DoesNotThrowOrSendEmail()
    {
        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("nobody@example.com"));

        Assert.Empty(_email.Sent);
    }

    [Fact]
    public async Task ForgotPassword_ForDeactivatedAccount_IsIndistinguishableFromUnknown()
    {
        await SeedUserAsync(isActive: false);

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        Assert.Empty(_email.Sent);
    }

    [Fact]
    public async Task ForgotPassword_ForKnownEmail_SendsLinkButLeavesPasswordIntact()
    {
        var user = await SeedUserAsync();

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        // Requesting a reset must not mutate the account — the endpoint is
        // unauthenticated, so doing so would let anyone lock out any user.
        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify(Password, saved!.PasswordHash));
        Assert.False(saved.MustChangePassword);

        var sent = Assert.Single(_email.Sent);
        Assert.Equal("student@example.com", sent.To);
        Assert.Contains("/reset-password?token=", sent.Body);
        Assert.DoesNotContain(Password, sent.Body);
    }

    [Fact]
    public async Task ForgotPassword_WhenEmailSendFails_LeavesAccountUsable()
    {
        var user = await SeedUserAsync();
        _email.ThrowOnSend = true;

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        // A failed send must not brick the account: the old password still works.
        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify(Password, saved!.PasswordHash));
    }

    [Fact]
    public async Task ForgotPassword_DoesNotRevokeExistingSessions()
    {
        var user = await SeedUserAsync();
        var tokens = await _sut.LoginAsync(new LoginDto("student@example.com", Password));

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        // Merely asking for a link must not log the real user out.
        var refreshed = await _sut.RefreshAsync(tokens.RefreshToken);
        Assert.NotNull(refreshed.AccessToken);
    }

    // ── ResetPasswordAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task ResetPassword_WithEmailedToken_SetsNewPassword()
    {
        var user = await SeedUserAsync();
        var token = await RequestResetTokenAsync();

        await _sut.ResetPasswordAsync(new ResetPasswordDto(token, "brand-new-pass-1"));

        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("brand-new-pass-1", saved!.PasswordHash));
        Assert.False(saved.MustChangePassword);
    }

    [Fact]
    public async Task ResetPassword_RevokesExistingSessions()
    {
        await SeedUserAsync();
        var tokens = await _sut.LoginAsync(new LoginDto("student@example.com", Password));
        var token = await RequestResetTokenAsync();

        await _sut.ResetPasswordAsync(new ResetPasswordDto(token, "brand-new-pass-1"));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _sut.RefreshAsync(tokens.RefreshToken));
    }

    [Fact]
    public async Task ResetPassword_CannotReuseTheSameToken()
    {
        await SeedUserAsync();
        var token = await RequestResetTokenAsync();
        await _sut.ResetPasswordAsync(new ResetPasswordDto(token, "brand-new-pass-1"));

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ResetPasswordAsync(new ResetPasswordDto(token, "another-pass-2")));
    }

    [Fact]
    public async Task ResetPassword_RequestingASecondLinkInvalidatesTheFirst()
    {
        await SeedUserAsync();
        var first = await RequestResetTokenAsync();
        var second = await RequestResetTokenAsync();

        Assert.NotEqual(first, second);
        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ResetPasswordAsync(new ResetPasswordDto(first, "another-pass-2")));
    }

    [Fact]
    public async Task ResetPassword_WithExpiredToken_IsRejected()
    {
        var user = await SeedUserAsync();
        var token = await RequestResetTokenAsync();

        var row = await _db.Context.PasswordResetTokens.SingleAsync(t => t.UserId == user.Id);
        row.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await _db.Context.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ResetPasswordAsync(new ResetPasswordDto(token, "another-pass-2")));
    }

    [Fact]
    public async Task ResetPassword_WithUnknownToken_IsRejected()
    {
        await SeedUserAsync();

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.ResetPasswordAsync(new ResetPasswordDto("not-a-real-token", "another-pass-2")));
    }

    // Drives the real request flow and lifts the token out of the emailed link,
    // so these tests exercise exactly what a user would click.
    private async Task<string> RequestResetTokenAsync(string email = "student@example.com")
    {
        _email.Sent.Clear();
        await _sut.ForgotPasswordAsync(new ForgotPasswordDto(email));

        var body = Assert.Single(_email.Sent).Body;
        var match = Regex.Match(body, @"/reset-password\?token=([a-f0-9]+)");
        Assert.True(match.Success, $"No reset token found in email body: {body}");
        return match.Groups[1].Value;
    }
}
