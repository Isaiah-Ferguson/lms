namespace CodeStackLMS.Application.Home.DTOs;

public record HomeDashboardDto(
    IReadOnlyList<HomeAcademicYearDto> Years,
    IReadOnlyList<HomeCourseLevelDto> Levels,
    IReadOnlyDictionary<string, IReadOnlyList<string>> EnrollmentsByYear,
    HomeCurrentUserDto User,
    HomePermissionsDto Permissions);

public record HomeAcademicYearDto(
    string Id,
    string Label,
    string StartDate,
    string EndDate,
    bool IsActive);

public record HomeCourseLevelDto(
    string Id,
    string YearId,
    string Key,
    string Title,
    string Description,
    bool IsArchived);

public record HomeCurrentUserDto(
    string Id,
    string Name,
    string Role,
    string? AvatarUrl,
    bool IsOnProbation);

public record HomePermissionsDto(
    bool CanManageYears,
    bool CanViewAllLevels,
    bool CanViewEnrolledOnly);
