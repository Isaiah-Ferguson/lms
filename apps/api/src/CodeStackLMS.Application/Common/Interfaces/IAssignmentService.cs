using CodeStackLMS.Application.Assignments.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IAssignmentService
{
    Task<AssignmentDto> GetAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssignmentListDto>> GetAssignmentsByCourseAsync(string courseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssignmentListDto>> GetAssignmentsByModuleAsync(string moduleId, CancellationToken cancellationToken = default);
    Task<AssignmentDto> CreateAssignmentAsync(CreateAssignmentDto dto, CancellationToken cancellationToken = default);
    Task<AssignmentDto> UpdateAssignmentAsync(string assignmentId, UpdateAssignmentDto dto, CancellationToken cancellationToken = default);
    Task DeleteAssignmentAsync(string assignmentId, CancellationToken cancellationToken = default);
    Task<StudentSubmissionStatusDto> GetMySubmissionAsync(string assignmentId, CancellationToken cancellationToken = default);
}
