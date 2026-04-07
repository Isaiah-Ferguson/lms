using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class AssignmentConfiguration : IEntityTypeConfiguration<Assignment>
{
    public void Configure(EntityTypeBuilder<Assignment> builder)
    {
        builder.ToTable("Assignments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.ModuleId)
            .IsRequired();

        builder.Property(a => a.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(a => a.AssignmentType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("Challenge");

        builder.Property(a => a.Instructions)
            .IsRequired();

        builder.Property(a => a.DueDate)
            .IsRequired();

        builder.Property(a => a.AttachmentUrl)
            .HasMaxLength(2048);

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .IsRequired(false);

        // Indexes
        builder.HasIndex(a => a.ModuleId)
            .HasDatabaseName("IX_Assignments_ModuleId");

        builder.HasIndex(a => a.DueDate)
            .HasDatabaseName("IX_Assignments_DueDate");

        // Relationships
        builder.HasMany(a => a.Submissions)
            .WithOne(s => s.Assignment)
            .HasForeignKey(s => s.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
