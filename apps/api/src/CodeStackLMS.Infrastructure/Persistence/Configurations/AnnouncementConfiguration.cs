using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.ToTable("Announcements");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.CourseId)
            .IsRequired();

        builder.Property(a => a.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(a => a.Body)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(a => a.Tag)
            .IsRequired(false)
            .HasMaxLength(50);

        builder.Property(a => a.AnnouncedAt)
            .IsRequired();

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(a => a.CourseId)
            .HasDatabaseName("IX_Announcements_CourseId");

        builder.HasIndex(a => new { a.CourseId, a.AnnouncedAt })
            .HasDatabaseName("IX_Announcements_CourseId_AnnouncedAt");

        builder.HasOne(a => a.Course)
            .WithMany(c => c.Announcements)
            .HasForeignKey(a => a.CourseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
