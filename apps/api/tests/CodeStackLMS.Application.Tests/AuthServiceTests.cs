using CodeStackLMS.Application.Auth;
using CodeStackLMS.Application.Auth.DTOs;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
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
    public async Task ForgotPassword_ForKnownEmail_ResetsPasswordAndSendsEmail()
    {
        var user = await SeedUserAsync();

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(saved!.MustChangePassword);
        Assert.False(BCrypt.Net.BCrypt.Verify(Password, saved.PasswordHash));
        var sent = Assert.Single(_email.Sent);
        Assert.Equal("student@example.com", sent.To);
    }

    [Fact]
    public async Task ForgotPassword_WhenEmailSendFails_StillResetsPasswordWithoutThrowing()
    {
        var user = await SeedUserAsync();
        _email.ThrowOnSend = true;

        await _sut.ForgotPasswordAsync(new ForgotPasswordDto("student@example.com"));

        var saved = await _db.Context.Users.FindAsync(user.Id);
        Assert.True(saved!.MustChangePassword);
    }
}
