using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class GradeConfiguration : IEntityTypeConfiguration<Grade>
{
    public void Configure(EntityTypeBuilder<Grade> builder)
    {
        builder.ToTable("Grades");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.SubmissionId)
            .IsRequired();

        builder.Property(g => g.InstructorId)
            .IsRequired();

        builder.Property(g => g.TotalScore)
            .IsRequired()
            .HasPrecision(10, 2);

        builder.Property(g => g.RubricBreakdownJson)
            .IsRequired()
            .HasColumnType("NVARCHAR(MAX)");

        builder.Property(g => g.OverallComment)
            .IsRequired()
            .HasColumnType("TEXT");

        builder.Property(g => g.GradedAt)
            .IsRequired();

        // Indexes
        builder.HasIndex(g => g.SubmissionId)
            .IsUnique()
            .HasDatabaseName("IX_Grades_SubmissionId");

        builder.HasIndex(g => g.InstructorId)
            .HasDatabaseName("IX_Grades_InstructorId");

        builder.HasIndex(g => g.GradedAt)
            .HasDatabaseName("IX_Grades_GradedAt");
    }
}
