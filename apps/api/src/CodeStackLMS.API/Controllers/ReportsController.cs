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

    public ReportsController(IProgressReportService reports)
    {
        _reports = reports;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProgressReportSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReports(
        [FromQuery] DateTime? weekOf,
        CancellationToken cancellationToken)
    {
        var results = await _reports.GetReportsAsync(weekOf, cancellationToken);
        return Ok(results);
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

    [HttpPost("trigger")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> TriggerWeeklyRun(CancellationToken cancellationToken)
    {
        var jobId = await _reports.TriggerWeeklyRunAsync(cancellationToken);
        return Accepted(new { jobId, message = "Weekly progress report job enqueued." });
    }
}
