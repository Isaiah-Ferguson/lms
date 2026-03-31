using CodeStackLMS.Application.Submissions.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ISubmissionService
{
    Task<UploadUrlResponseDto> RequestUploadAsync(
        Guid assignmentId,
        RequestUploadDto dto,
        CancellationToken cancellationToken = default);

    Task<SubmissionResponseDto> CompleteUploadAsync(
        Guid submissionId,
        CompleteUploadDto dto,
        CancellationToken cancellationToken = default);

    Task<SubmissionResponseDto> GitHubSubmitAsync(
        Guid assignmentId,
        GitHubSubmitDto dto,
        CancellationToken cancellationToken = default);

    Task<ArtifactListDto> GetArtifactsAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default);

    Task<SubmissionResponseDto> GetSubmissionStatusAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default);
}
