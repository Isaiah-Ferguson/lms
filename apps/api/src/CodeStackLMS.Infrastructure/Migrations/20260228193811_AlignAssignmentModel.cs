using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeStackLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlignAssignmentModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SQL Server cannot ALTER COLUMN directly from json/TEXT to nvarchar(max).
            // We add new columns, copy data with CONVERT, drop old columns, then rename.
            migrationBuilder.Sql("ALTER TABLE [Assignments] ADD [RubricJson_new] nvarchar(max) NOT NULL DEFAULT ''");
            migrationBuilder.Sql("UPDATE [Assignments] SET [RubricJson_new] = CONVERT(nvarchar(max), [RubricJson])");
            migrationBuilder.Sql("ALTER TABLE [Assignments] DROP COLUMN [RubricJson]");
            migrationBuilder.Sql("EXEC sp_rename 'Assignments.RubricJson_new', 'RubricJson', 'COLUMN'");

            migrationBuilder.Sql("ALTER TABLE [Assignments] ADD [Instructions_new] nvarchar(max) NOT NULL DEFAULT ''");
            migrationBuilder.Sql("UPDATE [Assignments] SET [Instructions_new] = CONVERT(nvarchar(max), [Instructions])");
            migrationBuilder.Sql("ALTER TABLE [Assignments] DROP COLUMN [Instructions]");
            migrationBuilder.Sql("EXEC sp_rename 'Assignments.Instructions_new', 'Instructions', 'COLUMN'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "RubricJson",
                table: "Assignments",
                type: "JSON",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Instructions",
                table: "Assignments",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
