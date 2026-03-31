using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class ModuleConfiguration : IEntityTypeConfiguration<Module>
{
    public void Configure(EntityTypeBuilder<Module> builder)
    {
        builder.ToTable("Modules");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.CourseId)
            .IsRequired();

        builder.Property(m => m.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(m => m.Order)
            .IsRequired();

        builder.Property(m => m.WeekNumber)
            .IsRequired(false);

        builder.Property(m => m.DateRange)
            .IsRequired(false)
            .HasMaxLength(100);

        builder.Property(m => m.ZoomUrl)
            .IsRequired(false)
            .HasMaxLength(500);

        builder.Property(m => m.CreatedAt)
            .IsRequired();

        builder.Property(m => m.UpdatedAt)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(m => m.CourseId)
            .HasDatabaseName("IX_Modules_CourseId");

        builder.HasIndex(m => new { m.CourseId, m.Order })
            .HasDatabaseName("IX_Modules_CourseId_Order");

        // Relationships
        builder.HasMany(m => m.Lessons)
            .WithOne(l => l.Module)
            .HasForeignKey(l => l.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(m => m.Assignments)
            .WithOne(a => a.Module)
            .HasForeignKey(a => a.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
