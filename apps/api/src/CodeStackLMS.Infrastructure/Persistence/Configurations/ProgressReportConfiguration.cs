using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class ProgressReportConfiguration : IEntityTypeConfiguration<ProgressReport>
{
    public void Configure(EntityTypeBuilder<ProgressReport> builder)
    {
        builder.ToTable("ProgressReports");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.StudentId)
            .IsRequired();

        builder.Property(r => r.WeekOf)
            .IsRequired();

        builder.Property(r => r.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(r => r.Content)
            .IsRequired(false)
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(r => r.Model)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.GeneratedAt)
            .IsRequired(false);

        builder.Property(r => r.FailureReason)
            .IsRequired(false)
            .HasMaxLength(2000);

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        // Indexes
        builder.HasIndex(r => r.StudentId)
            .HasDatabaseName("IX_ProgressReports_StudentId");

        builder.HasIndex(r => r.WeekOf)
            .HasDatabaseName("IX_ProgressReports_WeekOf");

        builder.HasIndex(r => new { r.StudentId, r.WeekOf })
            .IsUnique()
            .HasDatabaseName("IX_ProgressReports_StudentId_WeekOf");

        // Relationships
        builder.HasOne(r => r.Student)
            .WithMany()
            .HasForeignKey(r => r.StudentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
