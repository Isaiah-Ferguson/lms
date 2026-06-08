namespace CodeStackLMS.Application.Reports.DTOs;

public sealed record ProgressReportSummaryDto(
    Guid Id,
    Guid? StudentId,
    string? StudentName,
    string ReportType,
    DateTime WeekOf,
    string Status,
    string Model,
    DateTime? GeneratedAt,
    string? FailureReason
);
