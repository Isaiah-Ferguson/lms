using CodeStackLMS.Application.Instructor.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ISubmissionQueueService
{
    Task<SubmissionQueuePageDto> GetSubmissionQueueAsync(
        string? courseId,
        string? status,
        string? yearId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);
}
