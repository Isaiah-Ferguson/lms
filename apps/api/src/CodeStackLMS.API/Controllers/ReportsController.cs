using CodeStackLMS.API.Services;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Reports.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Instructor")]
public class ReportsController : ControllerBase
{
    private readonly IProgressReportService _reports;
    private readonly WordDocumentGenerator _wordGen;

    public ReportsController(IProgressReportService reports, WordDocumentGenerator wordGen)
    {
        _reports = reports;
        _wordGen = wordGen;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProgressReportSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReports(
        [FromQuery] DateTime? weekOf,
        [FromQuery] string? reportType,
        [FromQuery] Guid? cohortId,
        CancellationToken cancellationToken)
    {
        var results = await _reports.GetReportsAsync(weekOf, reportType, cohortId, cancellationToken);
        return Ok(results);
    }

    [HttpGet("students")]
    [ProducesResponseType(typeof(IEnumerable<StudentOptionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudents(
        [FromQuery] Guid? cohortId,
        CancellationToken cancellationToken)
    {
        var students = await _reports.GetStudentsAsync(cohortId, cancellationToken);
        return Ok(students);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProgressReportDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReport(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var report = await _reports.GetReportAsync(id, cancellationToken);
        if (report is null) return NotFound();
        return Ok(report);
    }

    [HttpPatch("{id:guid}/publish")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PublishReport(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await _reports.PublishReportAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadReport(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var report = await _reports.GetReportAsync(id, cancellationToken);
        if (report is null) return NotFound();

        var bytes = _wordGen.Generate(report);

        var safeName = report.ReportType == "ClassSummary"
            ? $"class-report-{report.WeekOf:yyyy-MM-dd}.docx"
            : $"report-{(report.StudentName ?? "student").Replace(" ", "-")}-{report.WeekOf:yyyy-MM-dd}.docx";

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            safeName);
    }

    [HttpPost("trigger")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> TriggerWeeklyRun(
        [FromQuery] Guid? cohortId,
        CancellationToken cancellationToken)
    {
        var jobId = await _reports.TriggerWeeklyRunAsync(cohortId, cancellationToken);
        return Accepted(new { jobId, message = "Weekly progress report job enqueued." });
    }

    [HttpPost("trigger/student/{studentId:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> TriggerStudentReport(
        [FromRoute] Guid studentId,
        [FromQuery] Guid? cohortId,
        CancellationToken cancellationToken)
    {
        var jobId = await _reports.TriggerStudentReportAsync(studentId, cohortId, cancellationToken);
        return Accepted(new { jobId, message = "Student report job enqueued." });
    }

    [HttpPost("trigger/class")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> TriggerClassReport(
        [FromQuery] Guid? cohortId,
        CancellationToken cancellationToken)
    {
        var jobId = await _reports.TriggerClassReportAsync(cohortId, cancellationToken);
        return Accepted(new { jobId, message = "Class summary report job enqueued." });
    }
}
