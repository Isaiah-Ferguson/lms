using CodeStackLMS.Domain.Common;
using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Domain.Entities;

public class ProgressReport : BaseEntity
{
    public Guid? StudentId { get; set; }
    public ReportType ReportType { get; set; } = ReportType.StudentProgress;
    public DateTime WeekOf { get; set; }
    public ProgressReportStatus Status { get; set; } = ProgressReportStatus.Pending;
    public string? Content { get; set; }
    public string Model { get; set; } = string.Empty;
    public DateTime? GeneratedAt { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? Student { get; set; }
}
