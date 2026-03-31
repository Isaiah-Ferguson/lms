using CodeStackLMS.Application.Lessons.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ILessonService
{
    Task<VideoTokenDto> GetVideoTokenAsync(
        Guid lessonId,
        CancellationToken cancellationToken = default);

    Task<LessonDto> CreateLessonAsync(
        CreateLessonDto dto,
        CancellationToken cancellationToken = default);

    Task<LessonDto> UpdateLessonAsync(
        Guid lessonId,
        UpdateLessonDto dto,
        CancellationToken cancellationToken = default);

    Task DeleteLessonAsync(
        Guid lessonId,
        CancellationToken cancellationToken = default);

    Task<LessonArtifactDto> UploadArtifactAsync(
        Guid lessonId,
        string fileName,
        string contentType,
        Stream fileStream,
        CancellationToken cancellationToken = default);

    Task DeleteArtifactAsync(
        Guid artifactId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LessonDto>> GetModuleLessonsAsync(
        Guid moduleId,
        CancellationToken cancellationToken = default);
}
