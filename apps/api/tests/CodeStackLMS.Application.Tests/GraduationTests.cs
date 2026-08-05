using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Profile;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CodeStackLMS.Application.Tests;

/// <summary>
/// Covers the program-completion flow: marking a student as graduated and the
/// certificate upload lifecycle (slot → SAS PUT → save → replace/remove).
///
/// Same trust boundary as submissions: a SAS cannot cap size or pin content
/// type, so SaveCertificate must verify what storage reports, not what the
/// client declared.
/// </summary>
public class GraduationTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly FakeBlobStorageService _blob = new();
    private readonly FakeCurrentUserService _currentUser = new() { Role = "Admin" };
    private readonly ProfileService _sut;

    private readonly User _student;

    public GraduationTests()
    {
        _sut = new ProfileService(_db.Context, _currentUser, _blob);

        _student = new User
        {
            Id = Guid.NewGuid(),
            Name = "Student One",
            Email = "student1@example.com",
            PasswordHash = "hash",
            Role = UserRole.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Context.Users.Add(_student);
        _db.Context.Users.Add(new User
        {
            Id = _currentUser.UserId,
            Name = "Admin",
            Email = "admin@example.com",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        _db.Context.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private string StudentId => _student.Id.ToString();

    private string CertPath(string name = "cert") => $"certificates/{_student.Id}/{name}.pdf";

    private void StoreAsPdf(string blobPath, long size = 1024)
        => _blob.Properties[blobPath] = new StoredBlobInfo(size, "application/pdf");

    // ── Marking complete ──────────────────────────────────────────────────────

    [Fact]
    public async Task SetGraduationStatus_MarksComplete_StampsTimestamp_AndWritesAuditNote()
    {
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true);

        var user = await _db.Context.Users.SingleAsync(u => u.Id == _student.Id);
        Assert.True(user.HasGraduated);
        Assert.NotNull(user.GraduatedAt);

        var note = await _db.Context.UserAdminNotes.SingleAsync(n => n.TargetUserId == _student.Id);
        Assert.Contains("[Program Completion]", note.Text);
        Assert.Equal(_currentUser.UserId, note.AuthorUserId);
    }

    [Fact]
    public async Task SetGraduationStatus_Unmark_ClearsTimestamp()
    {
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true);
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: false);

        var user = await _db.Context.Users.SingleAsync(u => u.Id == _student.Id);
        Assert.False(user.HasGraduated);
        Assert.Null(user.GraduatedAt);
    }

    [Fact]
    public async Task SetGraduationStatus_NoChange_WritesNoDuplicateAuditNote()
    {
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true);
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true);

        Assert.Equal(1, await _db.Context.UserAdminNotes.CountAsync(n => n.TargetUserId == _student.Id));
    }

    [Fact]
    public async Task SetGraduationStatus_NonAdmin_IsForbidden()
    {
        _currentUser.Role = "Student";

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true));
    }

    // ── Upload slot ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GenerateCertificateUploadSlot_ScopesPathToStudent()
    {
        var slot = await _sut.GenerateCertificateUploadSlotAsync(
            StudentId, "certificate.pdf", "application/pdf", 1024);

        Assert.StartsWith($"certificates/{_student.Id}/", slot.BlobPath);
        Assert.EndsWith(".pdf", slot.BlobPath);
    }

    [Theory]
    [InlineData("certificate.pdf", "image/png", 1024)]           // wrong content type
    [InlineData("certificate.png", "application/pdf", 1024)]     // wrong extension
    [InlineData("certificate.pdf", "application/pdf", 0)]        // empty
    [InlineData("certificate.pdf", "application/pdf", 11 * 1024 * 1024)] // too large
    public async Task GenerateCertificateUploadSlot_RejectsInvalidFiles(
        string fileName, string contentType, long sizeBytes)
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.GenerateCertificateUploadSlotAsync(StudentId, fileName, contentType, sizeBytes));
    }

    [Fact]
    public async Task GenerateCertificateUploadSlot_NonAdmin_IsForbidden()
    {
        _currentUser.Role = "Instructor";

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.GenerateCertificateUploadSlotAsync(StudentId, "certificate.pdf", "application/pdf", 1024));
    }

    // ── Saving the uploaded certificate ───────────────────────────────────────

    [Fact]
    public async Task SaveCertificate_PersistsPathAndFileName_AndWritesAuditNote()
    {
        var path = CertPath();
        StoreAsPdf(path);

        await _sut.SaveCertificateAsync(StudentId, path, "Jane Doe - Certificate.pdf");

        var user = await _db.Context.Users.SingleAsync(u => u.Id == _student.Id);
        Assert.Equal(path, user.CertificateBlobPath);
        Assert.Equal("Jane Doe - Certificate.pdf", user.CertificateFileName);

        var note = await _db.Context.UserAdminNotes.SingleAsync(n => n.TargetUserId == _student.Id);
        Assert.Contains("Certificate uploaded", note.Text);
    }

    [Fact]
    public async Task SaveCertificate_RejectsPathOutsideStudentFolder()
    {
        var foreignPath = $"certificates/{Guid.NewGuid()}/cert.pdf";
        StoreAsPdf(foreignPath);

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.SaveCertificateAsync(StudentId, foreignPath, "cert.pdf"));
    }

    [Fact]
    public async Task SaveCertificate_TrustsStorageOverClientDeclaration()
    {
        // Client declared a PDF at slot time but actually uploaded a zip.
        var path = CertPath();
        _blob.Properties[path] = new StoredBlobInfo(1024, "application/zip");

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.SaveCertificateAsync(StudentId, path, "cert.pdf"));
    }

    [Fact]
    public async Task SaveCertificate_RejectsOversizedStoredBlob()
    {
        var path = CertPath();
        StoreAsPdf(path, size: 11 * 1024 * 1024);

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.SaveCertificateAsync(StudentId, path, "cert.pdf"));
    }

    [Fact]
    public async Task SaveCertificate_MissingBlob_IsRejected()
    {
        var path = CertPath();
        _blob.DefaultProperties = null; // storage reports nothing uploaded

        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.SaveCertificateAsync(StudentId, path, "cert.pdf"));
    }

    [Fact]
    public async Task SaveCertificate_Replace_DeletesPreviousBlob()
    {
        var first = CertPath("first");
        var second = CertPath("second");
        StoreAsPdf(first);
        StoreAsPdf(second);

        await _sut.SaveCertificateAsync(StudentId, first, "first.pdf");
        await _sut.SaveCertificateAsync(StudentId, second, "second.pdf");

        Assert.Contains(first, _blob.Deleted);

        var user = await _db.Context.Users.SingleAsync(u => u.Id == _student.Id);
        Assert.Equal(second, user.CertificateBlobPath);
    }

    [Fact]
    public async Task SaveCertificate_NonAdmin_IsForbidden()
    {
        var path = CertPath();
        StoreAsPdf(path);
        _currentUser.Role = "Student";

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.SaveCertificateAsync(StudentId, path, "cert.pdf"));
    }

    // ── Removing the certificate ──────────────────────────────────────────────

    [Fact]
    public async Task RemoveCertificate_ClearsReference_AndDeletesBlob()
    {
        var path = CertPath();
        StoreAsPdf(path);
        await _sut.SaveCertificateAsync(StudentId, path, "cert.pdf");

        await _sut.RemoveCertificateAsync(StudentId);

        var user = await _db.Context.Users.SingleAsync(u => u.Id == _student.Id);
        Assert.Null(user.CertificateBlobPath);
        Assert.Null(user.CertificateFileName);
        Assert.Contains(path, _blob.Deleted);
    }

    [Fact]
    public async Task RemoveCertificate_WhenNoneExists_IsANoOp()
    {
        await _sut.RemoveCertificateAsync(StudentId);

        Assert.Empty(_blob.Deleted);
        Assert.Empty(await _db.Context.UserAdminNotes.Where(n => n.TargetUserId == _student.Id).ToListAsync());
    }

    // ── Profile exposure ──────────────────────────────────────────────────────

    [Fact]
    public async Task Profile_ExposesGraduationAndCertificate_ToTheStudent()
    {
        var path = CertPath();
        StoreAsPdf(path);
        await _sut.SetGraduationStatusAsync(StudentId, hasGraduated: true);
        await _sut.SaveCertificateAsync(StudentId, path, "cert.pdf");

        _currentUser.Role = "Student";
        _currentUser.UserId = _student.Id;

        var profile = await _sut.GetMyProfileAsync();

        Assert.True(profile.User.HasGraduated);
        Assert.NotNull(profile.User.GraduatedAt);
        Assert.NotNull(profile.User.CertificateUrl);
        Assert.Equal("cert.pdf", profile.User.CertificateFileName);
        Assert.False(profile.Permissions.CanManageGraduation);
    }

    [Fact]
    public async Task AdminProfileView_GrantsManageGraduationPermission()
    {
        var profile = await _sut.GetProfileForAdminAsync(StudentId);

        Assert.NotNull(profile);
        Assert.True(profile!.Permissions.CanManageGraduation);
    }
}
