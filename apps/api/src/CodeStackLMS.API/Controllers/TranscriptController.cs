using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeStackLMS.API.Controllers;

[ApiController]
[Route("api/transcript")]
[Authorize]
public class TranscriptController : ControllerBase
{
    private readonly ITranscriptService _transcripts;
    private readonly ITranscriptPdfGenerator _pdfGen;

    public TranscriptController(ITranscriptService transcripts, ITranscriptPdfGenerator pdfGen)
    {
        _transcripts = transcripts;
        _pdfGen = pdfGen;
    }

    [HttpGet("{userId}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DownloadTranscript(
        [FromRoute] string userId,
        CancellationToken cancellationToken)
    {
        var transcript = await _transcripts.GetTranscriptAsync(userId, cancellationToken);
        if (transcript is null) return NotFound();

        var bytes = _pdfGen.Generate(transcript);

        var safeName = $"transcript-{transcript.StudentName.Replace(" ", "-")}.pdf";

        return File(bytes, "application/pdf", safeName);
    }
}
