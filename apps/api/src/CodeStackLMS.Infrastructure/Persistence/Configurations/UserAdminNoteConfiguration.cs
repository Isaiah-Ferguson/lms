using CodeStackLMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeStackLMS.Infrastructure.Persistence.Configurations;

public class UserAdminNoteConfiguration : IEntityTypeConfiguration<UserAdminNote>
{
    public void Configure(EntityTypeBuilder<UserAdminNote> builder)
    {
        builder.ToTable("UserAdminNotes");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Text)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(n => n.CreatedAt)
            .IsRequired();

        builder.Property(n => n.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(n => n.TargetUserId)
            .HasDatabaseName("IX_UserAdminNotes_TargetUserId");

        builder.HasIndex(n => n.AuthorUserId)
            .HasDatabaseName("IX_UserAdminNotes_AuthorUserId");

        builder.HasIndex(n => new { n.TargetUserId, n.CreatedAt })
            .HasDatabaseName("IX_UserAdminNotes_TargetUserId_CreatedAt");

        builder.HasOne(n => n.TargetUser)
            .WithMany(u => u.AdminNotesReceived)
            .HasForeignKey(n => n.TargetUserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.AuthorUser)
            .WithMany(u => u.AdminNotesAuthored)
            .HasForeignKey(n => n.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
