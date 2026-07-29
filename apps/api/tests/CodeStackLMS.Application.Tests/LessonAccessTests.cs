using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Lessons;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Xunit;

namespace CodeStackLMS.Application.Tests;

/// <summary>
/// Lesson reads hand out read SAS URLs for course materials, and the SAS is the
/// only access control on those blobs once it leaves the API. Enrollment must
/// therefore gate the listing exactly as it gates the video token — otherwise
/// knowing a module id is enough to download another cohort's materials.
/// </summary>
public class LessonAccessTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly FakeCurrentUserService _currentUser = new() { Role = "Student" };
    private readonly LessonService _sut;

    private readonly Course _course;
    private readonly Module _module;
    private readonly Lesson _lesson;

    public LessonAccessTests()
    {
        _sut = new LessonService(_db.Context, new FakeBlobStorageService(), _currentUser);

        _course = new Course { Id = Guid.NewGuid(), Title = "Level 1", CreatedAt = DateTime.UtcNow };
        _module = new Module { Id = Guid.NewGuid(), CourseId = _course.Id, Title = "Week 1", Order = 1, CreatedAt = DateTime.UtcNow };
        _lesson = new Lesson
        {
            Id = Guid.NewGuid(),
            ModuleId = _module.Id,
            Title = "Intro",
            Order = 1,
            Type = LessonType.Video,
            VideoSource = VideoSourceType.External,
            VideoUrl = "https://example.com/video",
            CreatedAt = DateTime.UtcNow,
        };

        _db.Context.Users.Add(new User
        {
            Id = _currentUser.UserId,
            Name = "Student One",
            Email = "student1@example.com",
            PasswordHash = "hash",
            Role = UserRole.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });
        _db.Context.Courses.Add(_course);
        _db.Context.Modules.Add(_module);
        _db.Context.Lessons.Add(_lesson);
        _db.Context.LessonArtifacts.Add(new LessonArtifact
        {
            Id = Guid.NewGuid(),
            LessonId = _lesson.Id,
            BlobPath = $"lessons/{_module.Id}/{_lesson.Id}/slides.pdf",
            FileName = "slides.pdf",
            ContentType = "application/pdf",
            SizeBytes = 1024,
            CreatedAt = DateTime.UtcNow,
        });
        _db.Context.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task GetModuleLessons_ForUnenrolledStudent_IsForbidden()
    {
        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.GetModuleLessonsAsync(_module.Id));
    }

    [Fact]
    public async Task GetModuleLessons_ForEnrolledStudent_ReturnsLessonsWithArtifactUrls()
    {
        Enroll(_currentUser.UserId);

        var lessons = await _sut.GetModuleLessonsAsync(_module.Id);

        var lesson = Assert.Single(lessons);
        var artifact = Assert.Single(lesson.Artifacts);
        Assert.False(string.IsNullOrWhiteSpace(artifact.DownloadUrl));
    }

    [Fact]
    public async Task GetModuleLessons_ForInstructor_IsAllowedWithoutEnrollment()
    {
        _currentUser.Role = "Instructor";

        var lessons = await _sut.GetModuleLessonsAsync(_module.Id);

        Assert.Single(lessons);
    }

    [Fact]
    public async Task GetModuleLessons_ForAdmin_IsAllowedWithoutEnrollment()
    {
        _currentUser.Role = "Admin";

        var lessons = await _sut.GetModuleLessonsAsync(_module.Id);

        Assert.Single(lessons);
    }

    [Fact]
    public async Task GetModuleLessons_ForUnknownModule_IsNotFound()
    {
        _currentUser.Role = "Admin";

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.GetModuleLessonsAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetVideoToken_ForUnenrolledStudent_IsForbidden()
    {
        await Assert.ThrowsAsync<ForbiddenException>(
            () => _sut.GetVideoTokenAsync(_lesson.Id));
    }

    [Fact]
    public async Task GetVideoToken_ForEnrolledStudent_ReturnsToken()
    {
        Enroll(_currentUser.UserId);

        var token = await _sut.GetVideoTokenAsync(_lesson.Id);

        Assert.Equal("https://example.com/video", token.StreamUrl);
    }

    private void Enroll(Guid userId)
    {
        _db.Context.UserCourseEnrollments.Add(new UserCourseEnrollment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CourseId = _course.Id,
            EnrolledAt = DateTime.UtcNow,
        });
        _db.Context.SaveChanges();
    }
}
