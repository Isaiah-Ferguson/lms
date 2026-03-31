using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Domain.Entities.User> Users { get; }
    DbSet<Cohort> Cohorts { get; }
    DbSet<Course> Courses { get; }
    DbSet<Announcement> Announcements { get; }
    DbSet<CohortCourse> CohortCourses { get; }
    DbSet<UserCourseEnrollment> UserCourseEnrollments { get; }
    DbSet<UserAdminNote> UserAdminNotes { get; }
    DbSet<CodeStackLMS.Domain.Entities.Module> Modules { get; }
    DbSet<Lesson> Lessons { get; }
    DbSet<LessonArtifact> LessonArtifacts { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<Submission> Submissions { get; }
    DbSet<SubmissionArtifact> SubmissionArtifacts { get; }
    DbSet<GitHubSubmissionInfo> GitHubSubmissionInfos { get; }
    DbSet<Grade> Grades { get; }
    DbSet<FeedbackComment> FeedbackComments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    DatabaseFacade Database { get; }
}
