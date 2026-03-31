using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class GitHubSubmissionInfoConfiguration : IEntityTypeConfiguration<GitHubSubmissionInfo>
{
    public void Configure(EntityTypeBuilder<GitHubSubmissionInfo> builder)
    {
        builder.ToTable("GitHubSubmissionInfos");

        builder.HasKey(gi => gi.Id);

        builder.Property(gi => gi.SubmissionId)
            .IsRequired();

        builder.Property(gi => gi.RepoUrl)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(gi => gi.Branch)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(gi => gi.CommitHash)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(gi => gi.CreatedAt)
            .IsRequired();

        // Indexes
        builder.HasIndex(gi => gi.SubmissionId)
            .IsUnique()
            .HasDatabaseName("IX_GitHubSubmissionInfos_SubmissionId");

        builder.HasIndex(gi => gi.CommitHash)
            .HasDatabaseName("IX_GitHubSubmissionInfos_CommitHash");
    }
}
