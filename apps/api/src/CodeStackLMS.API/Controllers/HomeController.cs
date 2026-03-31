using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Home.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/home")]
[Authorize]
public class HomeController : ControllerBase
{
    private readonly IHomeService _homeService;

    public HomeController(IHomeService homeService)
    {
        _homeService = homeService;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(HomeDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var data = await _homeService.GetDashboardAsync(cancellationToken);
        return Ok(data);
    }

    [HttpPost("years")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(HomeAcademicYearDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateYear(
        [FromBody] CreateYearRequest request,
        CancellationToken cancellationToken)
    {
        var year = await _homeService.CreateYearAsync(
            request.Label,
            request.StartDate,
            request.EndDate,
            request.SetActive,
            cancellationToken);

        return CreatedAtAction(nameof(GetDashboard), year);
    }

    [HttpPost("years/{yearId}/set-active")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(HomeAcademicYearDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActiveYear(
        [FromRoute] string yearId,
        CancellationToken cancellationToken)
    {
        var year = await _homeService.SetActiveYearAsync(yearId, cancellationToken);
        return Ok(year);
    }
}

public sealed record CreateYearRequest(
    string Label,
    string StartDate,
    string EndDate,
    bool SetActive);
