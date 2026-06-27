using CodeStackLMS.Application.Reports.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IProgressReportService
{
    Task<IEnumerable<ProgressReportSummaryDto>> GetReportsAsync(DateTime? weekOf, string? reportType, Guid? cohortId, CancellationToken cancellationToken = default);
    Task<ProgressReportDetailDto?> GetReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task PublishReportAsync(Guid reportId, CancellationToken cancellationToken = default);
    Task<string> TriggerWeeklyRunAsync(Guid? cohortId, CancellationToken cancellationToken = default);
    Task<string> TriggerStudentReportAsync(Guid studentId, Guid? cohortId, CancellationToken cancellationToken = default);
    Task<string> TriggerClassReportAsync(Guid? cohortId, CancellationToken cancellationToken = default);
    Task<IEnumerable<StudentOptionDto>> GetStudentsAsync(Guid? cohortId = null, CancellationToken cancellationToken = default);
}
