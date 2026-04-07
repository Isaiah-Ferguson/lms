using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeStackLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceRubricWithAttachment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RubricJson",
                table: "Assignments");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "Assignments",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "Assignments");

            migrationBuilder.AddColumn<string>(
                name: "RubricJson",
                table: "Assignments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
