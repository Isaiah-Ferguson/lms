using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class CohortCourseConfiguration : IEntityTypeConfiguration<CohortCourse>
{
    public void Configure(EntityTypeBuilder<CohortCourse> builder)
    {
        builder.ToTable("CohortCourses");

        builder.HasKey(cc => cc.Id);

        builder.Property(cc => cc.CohortId)
            .IsRequired();

        builder.Property(cc => cc.CourseId)
            .IsRequired();

        // Indexes
        builder.HasIndex(cc => new { cc.CohortId, cc.CourseId })
            .IsUnique()
            .HasDatabaseName("IX_CohortCourses_CohortId_CourseId");

        builder.HasIndex(cc => cc.CourseId)
            .HasDatabaseName("IX_CohortCourses_CourseId");

        // Relationships configured in Cohort and Course configurations
    }
}
