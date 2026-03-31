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
    string Title,
    string Body,
    string? Tag,
    string AnnouncedAt);

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
