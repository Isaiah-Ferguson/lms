using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class SubmissionArtifactConfiguration : IEntityTypeConfiguration<SubmissionArtifact>
{
    public void Configure(EntityTypeBuilder<SubmissionArtifact> builder)
    {
        builder.ToTable("SubmissionArtifacts");

        builder.HasKey(sa => sa.Id);

        builder.Property(sa => sa.SubmissionId)
            .IsRequired();

        builder.Property(sa => sa.BlobPath)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(sa => sa.FileName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(sa => sa.Size)
            .IsRequired();

        builder.Property(sa => sa.ContentType)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(sa => sa.Checksum)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(sa => sa.CreatedAt)
            .IsRequired();

        // Indexes
        builder.HasIndex(sa => sa.SubmissionId)
            .HasDatabaseName("IX_SubmissionArtifacts_SubmissionId");

        builder.HasIndex(sa => sa.BlobPath)
            .HasDatabaseName("IX_SubmissionArtifacts_BlobPath");

        builder.HasIndex(sa => sa.Checksum)
            .HasDatabaseName("IX_SubmissionArtifacts_Checksum");
    }
}
