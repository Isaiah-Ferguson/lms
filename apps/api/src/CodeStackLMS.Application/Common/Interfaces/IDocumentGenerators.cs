using CodeStackLMS.Application.Reports.DTOs;
using CodeStackLMS.Application.Transcript.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IWordDocumentGenerator
{
    byte[] Generate(ProgressReportDetailDto report);
    byte[] BuildSimpleDocument(string title, IReadOnlyList<string> lines);
}

public interface ITranscriptPdfGenerator
{
    byte[] Generate(TranscriptDto transcript);
}
