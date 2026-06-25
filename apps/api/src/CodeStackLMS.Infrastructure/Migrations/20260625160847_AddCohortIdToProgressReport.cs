using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeStackLMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCohortIdToProgressReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CohortId",
                table: "ProgressReports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressReports_CohortId",
                table: "ProgressReports",
                column: "CohortId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressReports_Cohorts_CohortId",
                table: "ProgressReports",
                column: "CohortId",
                principalTable: "Cohorts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Backfill: associate each existing report with the cohort/year whose
            // date range contains its WeekOf (most recent matching year wins).
            migrationBuilder.Sql(@"
                UPDATE pr
                SET pr.CohortId = (
                    SELECT TOP 1 c.Id
                    FROM Cohorts c
                    WHERE pr.WeekOf >= c.StartDate AND pr.WeekOf <= c.EndDate
                    ORDER BY c.StartDate DESC
                )
                FROM ProgressReports pr
                WHERE pr.CohortId IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProgressReports_Cohorts_CohortId",
                table: "ProgressReports");

            migrationBuilder.DropIndex(
                name: "IX_ProgressReports_CohortId",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "CohortId",
                table: "ProgressReports");
        }
    }
}
