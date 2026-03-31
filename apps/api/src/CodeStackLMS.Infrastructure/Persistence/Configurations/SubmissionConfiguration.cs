using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class SubmissionConfiguration : IEntityTypeConfiguration<Submission>
{
    public void Configure(EntityTypeBuilder<Submission> builder)
    {
        builder.ToTable("Submissions");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.AssignmentId)
            .IsRequired();

        builder.Property(s => s.StudentId)
            .IsRequired();

        builder.Property(s => s.AttemptNumber)
            .IsRequired()
            .HasDefaultValue(1);

        builder.Property(s => s.Type)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(s => s.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(s => s.CreatedAt)
            .IsRequired();

        builder.Property(s => s.UpdatedAt)
            .IsRequired(false);

        builder.Property(s => s.FigmaUrl)
            .IsRequired(false);

        builder.Property(s => s.GitHubRepoUrl)
            .IsRequired(false);

        builder.Property(s => s.HostedUrl)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(s => s.AssignmentId)
            .HasDatabaseName("IX_Submissions_AssignmentId");

        builder.HasIndex(s => s.StudentId)
            .HasDatabaseName("IX_Submissions_StudentId");

        builder.HasIndex(s => new { s.AssignmentId, s.StudentId, s.AttemptNumber })
            .IsUnique()
            .HasDatabaseName("IX_Submissions_AssignmentId_StudentId_AttemptNumber");

        builder.HasIndex(s => s.Status)
            .HasDatabaseName("IX_Submissions_Status");

        builder.HasIndex(s => s.CreatedAt)
            .HasDatabaseName("IX_Submissions_CreatedAt");

        // Relationships
        builder.HasMany(s => s.Artifacts)
            .WithOne(sa => sa.Submission)
            .HasForeignKey(sa => sa.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.GitHubInfo)
            .WithOne(gi => gi.Submission)
            .HasForeignKey<GitHubSubmissionInfo>(gi => gi.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Grade)
            .WithOne(g => g.Submission)
            .HasForeignKey<Grade>(g => g.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.FeedbackComments)
            .WithOne(fc => fc.Submission)
            .HasForeignKey(fc => fc.SubmissionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
