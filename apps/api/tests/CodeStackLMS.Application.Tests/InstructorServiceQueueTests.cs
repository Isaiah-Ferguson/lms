using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Instructor;
using CodeStackLMS.Application.Tests.TestSupport;
using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Xunit;

namespace CodeStackLMS.Application.Tests;

/// <summary>
/// Exercises the SQL-translated submission queue and gradebook queries against
/// a real relational provider, so the latest-attempt subquery and pagination
/// are verified as actual SQL rather than in-memory LINQ.
/// </summary>
public class InstructorServiceQueueTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly FakeCurrentUserService _currentUser = new() { Role = "Admin" };
    private readonly SubmissionQueueService _queue;
    private readonly GradebookService _gradebook;

    private readonly Course _course = new() { Id = Guid.NewGuid(), Title = "Level 1", CreatedAt = DateTime.UtcNow };
    private readonly Module _module;
    private readonly Assignment _assignment;
    private readonly User _student;
    private readonly User _instructor;

    public InstructorServiceQueueTests()
    {
        _queue = new SubmissionQueueService(_db.Context);
        _gradebook = new GradebookService(_db.Context, _currentUser);

        _module = new Module { Id = Guid.NewGuid(), CourseId = _course.Id, Title = "Week 1", Order = 1, CreatedAt = DateTime.UtcNow };
        _assignment = new Assignment
        {
            Id = Guid.NewGuid(),
            ModuleId = _module.Id,
            Title = "Challenge 1",
            DueDate = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        };
        _student = NewUser("Student One", "student1@example.com", UserRole.Student);
        _instructor = NewUser("Instructor", "instructor@example.com", UserRole.Instructor);

        _db.Context.Courses.Add(_course);
        _db.Context.Modules.Add(_module);
        _db.Context.Assignments.Add(_assignment);
        _db.Context.Users.Add(_student);
        _db.Context.Users.Add(_instructor);
        _db.Context.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private static User NewUser(string name, string email, UserRole role) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = email,
        PasswordHash = "hash",
        Role = role,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
    };

    private Submission NewSubmission(
        int attempt,
        SubmissionStatus status,
        User? student = null,
        Assignment? assignment = null,
        DateTime? createdAt = null) => new()
    {
        Id = Guid.NewGuid(),
        AssignmentId = (assignment ?? _assignment).Id,
        StudentId = (student ?? _student).Id,
        AttemptNumber = attempt,
        Type = SubmissionType.Upload,
        Status = status,
        CreatedAt = createdAt ?? DateTime.UtcNow,
    };

    [Fact]
    public async Task Queue_ReturnsOnlyLatestAttemptPerStudentAndAssignment()
    {
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.Returned));
        _db.Context.Submissions.Add(NewSubmission(2, SubmissionStatus.Graded));
        _db.Context.Submissions.Add(NewSubmission(3, SubmissionStatus.ReadyToGrade));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, null, null);

        var item = Assert.Single(page.Items);
        Assert.Equal(SubmissionStatus.ReadyToGrade, item.Status);
        Assert.Equal(1, page.TotalCount);
    }

    [Fact]
    public async Task Queue_ExcludesIntermediateStatuses()
    {
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.PendingUpload));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, null, null);

        Assert.Empty(page.Items);
        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task Queue_LatestAttemptWithIntermediateStatus_HidesTheGroup()
    {
        // Attempt 1 was graded, but attempt 2 is still uploading: the group's
        // latest attempt is not actionable, so nothing should be listed.
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.Graded));
        _db.Context.Submissions.Add(NewSubmission(2, SubmissionStatus.PendingUpload));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, null, null);

        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task Queue_FiltersByStatus()
    {
        var student2 = NewUser("Student Two", "student2@example.com", UserRole.Student);
        _db.Context.Users.Add(student2);
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.ReadyToGrade));
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.Graded, student2));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, "Graded", null);

        var item = Assert.Single(page.Items);
        Assert.Equal(SubmissionStatus.Graded, item.Status);
    }

    [Fact]
    public async Task Queue_FiltersByCourseId()
    {
        var otherCourse = new Course { Id = Guid.NewGuid(), Title = "Level 2", CreatedAt = DateTime.UtcNow };
        var otherModule = new Module { Id = Guid.NewGuid(), CourseId = otherCourse.Id, Title = "Week 1", Order = 1, CreatedAt = DateTime.UtcNow };
        var otherAssignment = new Assignment
        {
            Id = Guid.NewGuid(),
            ModuleId = otherModule.Id,
            Title = "Other Challenge",
            DueDate = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        };
        _db.Context.Courses.Add(otherCourse);
        _db.Context.Modules.Add(otherModule);
        _db.Context.Assignments.Add(otherAssignment);
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.ReadyToGrade));
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.ReadyToGrade, assignment: otherAssignment));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(otherCourse.Id.ToString(), null, null);

        var item = Assert.Single(page.Items);
        Assert.Equal("Other Challenge", item.AssignmentTitle);
    }

    [Fact]
    public async Task Queue_PaginatesAndCountsInSql()
    {
        for (var i = 0; i < 5; i++)
        {
            var student = NewUser($"S{i}", $"s{i}@example.com", UserRole.Student);
            _db.Context.Users.Add(student);
            _db.Context.Submissions.Add(NewSubmission(
                1, SubmissionStatus.ReadyToGrade, student,
                createdAt: DateTime.UtcNow.AddMinutes(-i)));
        }
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, null, null, page: 2, pageSize: 2);

        Assert.Equal(5, page.TotalCount);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(2, page.Page);
    }

    [Fact]
    public async Task Queue_UnknownYearId_ReturnsEmpty()
    {
        _db.Context.Submissions.Add(NewSubmission(1, SubmissionStatus.ReadyToGrade));
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var page = await _queue.GetSubmissionQueueAsync(null, null, Guid.NewGuid().ToString());

        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task AdminGrades_ReturnsLatestAttemptGradeAndMissingRows()
    {
        var enrollment = new UserCourseEnrollment
        {
            Id = Guid.NewGuid(),
            UserId = _student.Id,
            CourseId = _course.Id,
        };
        _db.Context.UserCourseEnrollments.Add(enrollment);

        var attempt1 = NewSubmission(1, SubmissionStatus.Graded);
        var attempt2 = NewSubmission(2, SubmissionStatus.Graded);
        _db.Context.Submissions.Add(attempt1);
        _db.Context.Submissions.Add(attempt2);
        _db.Context.Grades.Add(new Grade
        {
            Id = Guid.NewGuid(),
            SubmissionId = attempt1.Id,
            InstructorId = _instructor.Id,
            TotalScore = 50m,
            GradedAt = DateTime.UtcNow,
        });
        _db.Context.Grades.Add(new Grade
        {
            Id = Guid.NewGuid(),
            SubmissionId = attempt2.Id,
            InstructorId = _instructor.Id,
            TotalScore = 90m,
            GradedAt = DateTime.UtcNow,
        });
        await _db.Context.SaveChangesAsync(CancellationToken.None);

        var grades = await _gradebook.GetAdminGradesAsync(_course.Id.ToString(), null);

        var studentRow = Assert.Single(grades.Students);
        var row = Assert.Single(studentRow.Rows);
        Assert.Equal(90m, row.TotalScore); // latest attempt's grade, not the first
        Assert.Equal("Graded", row.Status);
    }

    [Fact]
    public async Task AdminGrades_AsStudent_IsForbidden()
    {
        _currentUser.Role = "Student";

        await Assert.ThrowsAsync<ForbiddenException>(
            () => _gradebook.GetAdminGradesAsync(_course.Id.ToString(), null));
    }
}
