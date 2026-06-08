using CodeStackLMS.Application.Reports.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IProgressReportService
{
    Task<IEnumerable<ProgressReportSummaryDto>> GetReportsAsync(DateTime? weekOf, CancellationToken cancellationToken = default);
    Task<ProgressReportDetailDto?> GetReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task PublishReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task<string> TriggerWeeklyRunAsync(CancellationToken cancellationToken = default);
}
