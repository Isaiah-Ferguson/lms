using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeStackLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTopicsToModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Topics",
                table: "Modules",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Topics",
                table: "Modules");
        }
    }
}
