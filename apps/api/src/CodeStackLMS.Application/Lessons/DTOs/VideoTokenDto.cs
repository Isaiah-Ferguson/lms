namespace CodeStackLMS.Application.Lessons.DTOs;

public record VideoTokenDto(
    Guid LessonId,
    string VideoSource,
    string StreamUrl,
    string? MimeType,
    int? DurationSeconds,
    DateTimeOffset ExpiresAt);
