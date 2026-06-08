namespace CodeStackLMS.Application.Reports.DTOs;

public sealed record ProgressReportDetailDto(
    Guid Id,
    Guid? StudentId,
    string? StudentName,
    string ReportType,
    DateTime WeekOf,
    string Status,
    string? Content,
    string Model,
    DateTime? GeneratedAt,
    string? FailureReason
);
