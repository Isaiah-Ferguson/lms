using CodeStackLMS.Domain.Entities;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> builder)
    {
        builder.ToTable("Lessons");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.ModuleId)
            .IsRequired();

        builder.Property(l => l.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(l => l.Order)
            .IsRequired();

        builder.Property(l => l.Type)
            .IsRequired()
            .HasConversion<int>();

        // Video fields
        builder.Property(l => l.VideoUrl)
            .HasMaxLength(1000);

        builder.Property(l => l.VideoBlobPath)
            .HasMaxLength(1000);

        builder.Property(l => l.DurationSeconds);

        // Text content field
        builder.Property(l => l.TextContent)
            .HasColumnType("TEXT");

        // Link fields
        builder.Property(l => l.LinkUrl)
            .HasMaxLength(1000);

        builder.Property(l => l.LinkDescription)
            .HasMaxLength(500);

        builder.Property(l => l.CreatedAt)
            .IsRequired();

        builder.Property(l => l.UpdatedAt)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(l => l.ModuleId)
            .HasDatabaseName("IX_Lessons_ModuleId");

        builder.HasIndex(l => new { l.ModuleId, l.Order })
            .HasDatabaseName("IX_Lessons_ModuleId_Order");

        builder.HasIndex(l => l.Type)
            .HasDatabaseName("IX_Lessons_Type");
    }
}
