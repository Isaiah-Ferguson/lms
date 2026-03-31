using CodeStackLMS.Domain.Enums;

namespace CodeStackLMS.Application.Instructor.DTOs;

// ── Submission queue (instructor) ─────────────────────────────────────────────

public record SubmissionQueuePageDto(
    IReadOnlyList<SubmissionQueueItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record SubmissionQueueItemDto(
    Guid SubmissionId,
    string StudentName,
    string StudentEmail,
    string AssignmentTitle,
    string CourseTitle,
    SubmissionType Type,
    SubmissionStatus Status,
    DateTime SubmittedAt,
    DateTime? GradedAt,
    decimal? TotalScore,
    decimal MaxScore);

// ── Student grade row ─────────────────────────────────────────────────────────

public record StudentGradeRowDto(
    Guid SubmissionId,
    Guid AssignmentId,
    string AssignmentTitle,
    string AssignmentType,
    decimal MaxScore,
    decimal? TotalScore,
    string Status,
    DateTime? GradedAt,
    string? OverallComment,
    string? GradedBy);

// ── Student grades response ───────────────────────────────────────────────────

public record StudentGradesDto(
    string CourseId,
    string CourseName,
    IReadOnlyList<StudentGradeRowDto> Rows);

// ── Admin grade overview ──────────────────────────────────────────────────────

public record AdminStudentGradeDto(
    Guid UserId,
    string Name,
    string Email,
    IReadOnlyList<StudentGradeRowDto> Rows);

public record AdminGradesDto(
    string CourseId,
    string CourseName,
    IReadOnlyList<AdminStudentGradeDto> Students);

// ── Assignment submissions roster ─────────────────────────────────────────────

public record AssignmentSubmissionRosterRowDto(
    Guid UserId,
    string UserName,
    string UserEmail,
    string Status,
    Guid? SubmissionId,
    DateTime? SubmittedAt,
    string? Grade,
    DateTime? GradedAt,
    string? GradedBy);

public record AssignmentSubmissionsRosterDto(
    Guid AssignmentId,
    string AssignmentTitle,
    DateTime? DueDate,
    IReadOnlyList<AssignmentSubmissionRosterRowDto> Rows);
