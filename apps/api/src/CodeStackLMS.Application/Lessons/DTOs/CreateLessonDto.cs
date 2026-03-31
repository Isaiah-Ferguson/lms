namespace CodeStackLMS.Application.Lessons.DTOs;

public record CreateLessonDto(
    Guid ModuleId,
    string Title,
    int Order,
    string? VideoUrl);

public record UpdateLessonDto(
    string Title,
    string? VideoUrl);

public record LessonArtifactDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string DownloadUrl);

public record LessonDto(
    Guid Id,
    Guid ModuleId,
    string Title,
    int Order,
    string LessonType,
    string? VideoUrl,
    DateTime CreatedAt,
    IReadOnlyList<LessonArtifactDto> Artifacts);
