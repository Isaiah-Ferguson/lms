using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace CodeStackLMS.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        // Suppress pending model changes warning to allow EF to create new tables
        optionsBuilder.ConfigureWarnings(warnings =>
            warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Cohort> Cohorts => Set<Cohort>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<CohortCourse> CohortCourses => Set<CohortCourse>();
    public DbSet<UserCourseEnrollment> UserCourseEnrollments => Set<UserCourseEnrollment>();
    public DbSet<UserAdminNote> UserAdminNotes => Set<UserAdminNote>();
    public DbSet<CodeStackLMS.Domain.Entities.Module> Modules => Set<CodeStackLMS.Domain.Entities.Module>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonArtifact> LessonArtifacts => Set<LessonArtifact>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionArtifact> SubmissionArtifacts => Set<SubmissionArtifact>();
    public DbSet<GitHubSubmissionInfo> GitHubSubmissionInfos => Set<GitHubSubmissionInfo>();
    public DbSet<Grade> Grades => Set<Grade>();
    public DbSet<FeedbackComment> FeedbackComments => Set<FeedbackComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the current assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateAuditableEntities();
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        UpdateAuditableEntities();
        return base.SaveChanges();
    }

    private void UpdateAuditableEntities()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is Domain.Common.IAuditableEntity &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

        foreach (var entry in entries)
        {
            var entity = (Domain.Common.IAuditableEntity)entry.Entity;

            if (entry.State == EntityState.Added)
            {
                entity.CreatedAt = DateTime.UtcNow;
            }

            if (entry.State == EntityState.Modified)
            {
                entity.UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}
