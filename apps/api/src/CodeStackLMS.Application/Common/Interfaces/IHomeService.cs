using CodeStackLMS.Application.Home.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IHomeService
{
    Task<HomeDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default);
    Task<HomeAcademicYearDto> CreateYearAsync(string label, string startDate, string endDate, bool setActive, CancellationToken cancellationToken = default);
    Task<HomeAcademicYearDto> SetActiveYearAsync(string yearId, CancellationToken cancellationToken = default);
}
