using CodeStackLMS.Application.Instructor.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface IGradingService
{
    Task<SubmissionDetailDto> GetSubmissionDetailAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default);

    Task<ExistingGradeDto> GradeSubmissionAsync(
        Guid submissionId,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken = default);

    Task<ExistingGradeDto> GradeByStudentAsync(
        Guid assignmentId,
        Guid studentId,
        GradeSubmissionDto dto,
        CancellationToken cancellationToken = default);

    Task ReturnSubmissionAsync(
        Guid submissionId,
        string reason,
        CancellationToken cancellationToken = default);
}
