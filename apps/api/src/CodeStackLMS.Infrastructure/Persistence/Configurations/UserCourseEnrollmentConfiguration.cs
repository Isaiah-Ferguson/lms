using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class UserCourseEnrollmentConfiguration : IEntityTypeConfiguration<UserCourseEnrollment>
{
    public void Configure(EntityTypeBuilder<UserCourseEnrollment> builder)
    {
        builder.ToTable("UserCourseEnrollments");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.EnrolledAt)
            .IsRequired();

        builder.HasIndex(e => new { e.UserId, e.CourseId })
            .IsUnique()
            .HasDatabaseName("IX_UserCourseEnrollments_UserId_CourseId");

        builder.HasOne(e => e.User)
            .WithMany(u => u.CourseEnrollments)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Course)
            .WithMany(c => c.UserEnrollments)
            .HasForeignKey(e => e.CourseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
