using CodeStackLMS.Application.Instructor.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IGradebookService
{
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
