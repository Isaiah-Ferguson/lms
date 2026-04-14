using CodeStackLMS.Application.Instructor.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IInstructorService
{
    Task<SubmissionDetailDto> GetSubmissionDetailAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default);

    Task<ExistingGradeDto> GradeSubmissionAsync(
        Guid submissionId,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken = default);

    Task ReturnSubmissionAsync(
        Guid submissionId,
        string reason,
        CancellationToken cancellationToken = default);

    Task<SubmissionQueuePageDto> GetSubmissionQueueAsync(
        string? courseId,
        string? status,
        string? yearId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<StudentGradesDto> GetMyGradesAsync(
        string courseId,
        string? cohortId,
        CancellationToken cancellationToken = default);

    Task<AdminGradesDto> GetAdminGradesAsync(
        string courseId,
        string? cohortId,
        CancellationToken cancellationToken = default);

    Task<AssignmentSubmissionsRosterDto> GetAssignmentSubmissionsRosterAsync(
        Guid assignmentId,
        CancellationToken cancellationToken = default);
}
