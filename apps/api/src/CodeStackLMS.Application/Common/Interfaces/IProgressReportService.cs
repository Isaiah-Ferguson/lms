using CodeStackLMS.Application.Reports.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IProgressReportService
{
    Task<IEnumerable<ProgressReportSummaryDto>> GetReportsAsync(DateTime? weekOf, string? reportType, CancellationToken cancellationToken = default);
    Task<ProgressReportDetailDto?> GetReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task PublishReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task<string> TriggerWeeklyRunAsync(CancellationToken cancellationToken = default);
    Task<string> TriggerStudentReportAsync(Guid studentId, CancellationToken cancellationToken = default);
    Task<string> TriggerClassReportAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<StudentOptionDto>> GetStudentsAsync(CancellationToken cancellationToken = default);
}
