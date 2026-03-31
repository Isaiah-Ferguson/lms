using CodeStackLMS.Application.Courses.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ICourseDetailService
{
    Task<CourseDetailDto> GetCourseDetailAsync(string courseId, CancellationToken cancellationToken = default);
    Task<CourseWeekDto> CreateWeekAsync(string courseId, CreateWeekDto dto, CancellationToken cancellationToken = default);
    Task<CourseWeekDto> UpdateWeekAsync(string courseId, string weekId, UpdateWeekDto dto, CancellationToken cancellationToken = default);
    Task<CourseAnnouncementDto> CreateAnnouncementAsync(string courseId, UpsertAnnouncementDto dto, CancellationToken cancellationToken = default);
    Task<CourseAnnouncementDto> UpdateAnnouncementAsync(string courseId, string announcementId, UpsertAnnouncementDto dto, CancellationToken cancellationToken = default);
    Task DeleteAnnouncementAsync(string courseId, string announcementId, CancellationToken cancellationToken = default);
}
