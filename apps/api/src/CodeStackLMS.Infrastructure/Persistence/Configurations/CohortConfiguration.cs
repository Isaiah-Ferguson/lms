using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class CohortConfiguration : IEntityTypeConfiguration<Cohort>
{
    public void Configure(EntityTypeBuilder<Cohort> builder)
    {
        builder.ToTable("Cohorts");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.StartDate)
            .IsRequired();

        builder.Property(c => c.EndDate)
            .IsRequired();

        builder.Property(c => c.IsActive)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(c => c.IsActive)
            .HasDatabaseName("IX_Cohorts_IsActive");

        builder.HasIndex(c => c.Name)
            .HasDatabaseName("IX_Cohorts_Name");

        builder.HasIndex(c => new { c.StartDate, c.EndDate })
            .HasDatabaseName("IX_Cohorts_DateRange");

        // Relationships
        builder.HasMany(c => c.CohortCourses)
            .WithOne(cc => cc.Cohort)
            .HasForeignKey(cc => cc.CohortId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
