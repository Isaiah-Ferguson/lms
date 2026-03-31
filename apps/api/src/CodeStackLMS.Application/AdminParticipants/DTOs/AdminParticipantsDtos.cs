namespace CodeStackLMS.Application.AdminParticipants.DTOs;

public record AdminParticipantsDataDto(
    IReadOnlyList<ParticipantUserDto> Users,
    IReadOnlyList<CourseOptionDto> Courses,
    AdminParticipantsPermissionsDto Permissions);

public record ParticipantUserDto(
    string Id,
    string FirstName,
    string LastName,
    string Username,
    string Email,
    string Town,
    string Role,
    string Status,
    IReadOnlyList<string> Enrollments,
    string? LastLoginAt,
    string AvatarInitials);

public record CourseOptionDto(string Id, string Label, string YearId, string YearLabel);

public record AdminParticipantsPermissionsDto(bool CanManageUsers);

public record EnrollUsersRequestDto(
    IReadOnlyList<string> UserIds,
    IReadOnlyList<string> CourseIds);

public record ProfileDataDto(
    ProfileUserDto User,
    GradesOverviewDto GradesOverview,
    IReadOnlyList<EnrollmentDto> Enrollments,
    LoginActivityDto LoginActivity,
    UserPreferencesDto Preferences,
    AdminNotesDto? AdminNotes,
    ProfilePermissionsDto Permissions);

public record UserPreferencesDto(
    bool EmailNotificationsEnabled,
    bool DarkModeEnabled);

public record ProfileUserDto(
    string Id,
    string Name,
    string Email,
    string Town,
    string PhoneNumber,
    string GitHubUsername,
    string? AvatarUrl,
    bool IsOnProbation,
    string ProbationReason);

public record GradesOverviewDto(
    int OverallPercent,
    int GradedCount,
    int TotalCount,
    string? LastGradedAt,
    IReadOnlyList<CourseGradeDto> CourseGrades);

public record CourseGradeDto(
    string CourseId,
    string CourseName,
    int Percent,
    string LetterGrade,
    int GradedCount,
    int TotalCount);

public record EnrollmentDto(
    string CourseId,
    string Title,
    string Status);

public record LoginActivityDto(
    string FirstSiteAccessAt,
    string LastSiteAccessAt);

public record AdminNotesDto(
    string Text,
    string UpdatedAt,
    string UpdatedBy,
    IReadOnlyList<AdminNoteHistoryItemDto> PreviousNotes);

public record AdminNoteHistoryItemDto(
    string Text,
    string UpdatedAt,
    string UpdatedBy);

public record ProfilePermissionsDto(
    bool CanEditProfile,
    bool CanViewAdminNotes,
    bool CanEditAdminNotes);

public record AvatarUploadSlotDto(
    string BlobPath,
    string SasUrl,
    string ReadUrl,
    string ExpiresAt);
