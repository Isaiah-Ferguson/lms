using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Courses.DTOs;

public record CourseDetailDto(
    string Id,
    string Title,
    string Description,
    string AccentColor,
    string CourseMeta,
    string ZoomUrl,
    IReadOnlyList<CourseWeekDto> Weeks,
    IReadOnlyList<CourseAnnouncementDto> Announcements,
    CoursePermissionsDto Permissions);

public record CourseWeekDto(
    string Id,
    int WeekNumber,
    string Title,
    string DateRange,
    string ZoomUrl,
    IReadOnlyList<string> Topics,
    string DetailsHref);

public record CourseAnnouncementDto(
    string Id,
    string Title,
    string Body,
    string? Tag,
    string AnnouncedAt);

public record CoursePermissionsDto(
    bool CanEditContent);

public record UpsertAnnouncementDto(
    [property: Required, StringLength(300, MinimumLength = 1)] string Title,
    [property: Required, StringLength(20000, MinimumLength = 1)] string Body,
    [property: StringLength(100)] string? Tag,
    [property: Required] string AnnouncedAt);

public record CreateWeekDto(
    int WeekNumber,
    string Title,
    string DateRange,
    string ZoomUrl,
    IReadOnlyList<string> Topics);

public record UpdateWeekDto(
    string Title,
    string DateRange,
    string ZoomUrl,
    IReadOnlyList<string> Topics);
