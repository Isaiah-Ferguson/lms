using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("Attendances");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Date)
            .IsRequired();

        builder.Property(a => a.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(a => a.SessionType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(a => a.RecordedByUserId)
            .IsRequired();

        builder.Property(a => a.Note)
            .IsRequired(false)
            .HasMaxLength(1000);

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.HasIndex(a => new { a.CourseId, a.StudentId, a.Date })
            .IsUnique()
            .HasDatabaseName("IX_Attendances_CourseId_StudentId_Date");

        builder.HasIndex(a => new { a.CourseId, a.Date })
            .HasDatabaseName("IX_Attendances_CourseId_Date");

        builder.HasOne(a => a.Course)
            .WithMany()
            .HasForeignKey(a => a.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.Student)
            .WithMany()
            .HasForeignKey(a => a.StudentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
