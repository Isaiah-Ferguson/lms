using CodeStackLMS.Application.BackgroundJobs;
using CodeStackLMS.Application.Common.Interfaces;
using CodeStackLMS.Application.Reports.DTOs;
using CodeStackLMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Infrastructure.Reports;

public sealed class ProgressReportService : IProgressReportService
{
    private readonly IApplicationDbContext _db;
    private readonly IBackgroundJobService _jobs;

    public ProgressReportService(IApplicationDbContext db, IBackgroundJobService jobs)
    {
        _db = db;
        _jobs = jobs;
    }

    public async Task<IEnumerable<ProgressReportSummaryDto>> GetReportsAsync(
        DateTime? weekOf,
        string? reportType,
        CancellationToken cancellationToken = default)
    {
        var query = _db.ProgressReports
            .Include(r => r.Student)
            .AsQueryable();

        if (weekOf.HasValue)
            query = query.Where(r => r.WeekOf.Date == weekOf.Value.Date);

        if (!string.IsNullOrWhiteSpace(reportType) &&
            Enum.TryParse<ReportType>(reportType, true, out var rt))
            query = query.Where(r => r.ReportType == rt);

        var reports = await query
            .OrderByDescending(r => r.WeekOf)
            .ThenBy(r => r.Student != null ? r.Student.Name : "")
            .ToListAsync(cancellationToken);

        return reports.Select(r => new ProgressReportSummaryDto(
            r.Id,
            r.StudentId,
            r.Student?.Name,
            r.ReportType.ToString(),
            r.WeekOf,
            r.Status.ToString(),
            r.Model,
            r.GeneratedAt,
            r.FailureReason));
    }

    public async Task<ProgressReportDetailDto?> GetReportAsync(
        Guid reportId,
        CancellationToken cancellationToken = default)
    {
        var r = await _db.ProgressReports
            .Include(r => r.Student)
            .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken);

        if (r is null) return null;

        return new ProgressReportDetailDto(
            r.Id,
            r.StudentId,
            r.Student?.Name,
            r.ReportType.ToString(),
            r.WeekOf,
            r.Status.ToString(),
            r.Content,
            r.Model,
            r.GeneratedAt,
            r.FailureReason);
    }

    public async Task PublishReportAsync(Guid reportId, CancellationToken cancellationToken = default)
    {
        var report = await _db.ProgressReports
            .FirstOrDefaultAsync(r => r.Id == reportId, cancellationToken)
            ?? throw new KeyNotFoundException($"ProgressReport {reportId} not found.");

        if (report.Status != ProgressReportStatus.Generated)
            throw new InvalidOperationException("Only Generated reports can be published.");

        report.Status = ProgressReportStatus.Published;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<string> TriggerWeeklyRunAsync(CancellationToken cancellationToken = default)
    {
        var weekOf = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1);
        var jobId = _jobs.EnqueueWeeklyProgressReport(weekOf);
        return Task.FromResult(jobId);
    }

    public Task<string> TriggerStudentReportAsync(Guid studentId, CancellationToken cancellationToken = default)
    {
        var weekOf = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1);
        var jobId = _jobs.EnqueueSingleStudentReport(studentId, weekOf);
        return Task.FromResult(jobId);
    }

    public Task<string> TriggerClassReportAsync(CancellationToken cancellationToken = default)
    {
        var weekOf = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1);
        var jobId = _jobs.EnqueueClassReport(weekOf);
        return Task.FromResult(jobId);
    }

    public async Task<IEnumerable<StudentOptionDto>> GetStudentsAsync(CancellationToken cancellationToken = default)
    {
        var students = await _db.Users
            .Where(u => u.IsActive && u.Role == UserRole.Student)
            .OrderBy(u => u.Name)
            .Select(u => new StudentOptionDto(u.Id, u.Name))
            .ToListAsync(cancellationToken);

        return students;
    }
}
