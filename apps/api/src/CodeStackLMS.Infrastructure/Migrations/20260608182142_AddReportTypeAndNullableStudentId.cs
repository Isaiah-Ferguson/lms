using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeStackLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReportTypeAndNullableStudentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProgressReports_StudentId_WeekOf",
                table: "ProgressReports");

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "ProgressReports",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<int>(
                name: "ReportType",
                table: "ProgressReports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressReports_StudentId_WeekOf_ReportType",
                table: "ProgressReports",
                columns: new[] { "StudentId", "WeekOf", "ReportType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProgressReports_StudentId_WeekOf_ReportType",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "ReportType",
                table: "ProgressReports");

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "ProgressReports",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressReports_StudentId_WeekOf",
                table: "ProgressReports",
                columns: new[] { "StudentId", "WeekOf" },
                unique: true);
        }
    }
}
