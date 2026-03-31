using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class FeedbackCommentConfiguration : IEntityTypeConfiguration<FeedbackComment>
{
    public void Configure(EntityTypeBuilder<FeedbackComment> builder)
    {
        builder.ToTable("FeedbackComments");

        builder.HasKey(fc => fc.Id);

        builder.Property(fc => fc.SubmissionId)
            .IsRequired();

        builder.Property(fc => fc.AuthorId)
            .IsRequired();

        builder.Property(fc => fc.Message)
            .IsRequired()
            .HasColumnType("TEXT");

        builder.Property(fc => fc.CreatedAt)
            .IsRequired();

        builder.Property(fc => fc.FilePath)
            .HasMaxLength(1000);

        builder.Property(fc => fc.LineStart);

        builder.Property(fc => fc.LineEnd);

        // Indexes
        builder.HasIndex(fc => fc.SubmissionId)
            .HasDatabaseName("IX_FeedbackComments_SubmissionId");

        builder.HasIndex(fc => fc.AuthorId)
            .HasDatabaseName("IX_FeedbackComments_AuthorId");

        builder.HasIndex(fc => fc.CreatedAt)
            .HasDatabaseName("IX_FeedbackComments_CreatedAt");

        builder.HasIndex(fc => new { fc.SubmissionId, fc.FilePath })
            .HasDatabaseName("IX_FeedbackComments_SubmissionId_FilePath");
    }
}
