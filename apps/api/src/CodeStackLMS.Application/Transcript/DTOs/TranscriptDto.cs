namespace CodeStackLMS.Application.Transcript.DTOs;

public record TranscriptDto(
    string StudentName,
    string StudentId,
    string Email,
    IReadOnlyList<TranscriptCourseDto> Courses,
    double OverallGpa,
    int TotalGradedCount,
    int TotalCount,
    DateTime GeneratedAt);

public record TranscriptCourseDto(
    string CourseName,
    string LetterGrade,
    int Percent,
    double GpaPoints,
    int GradedCount,
    int TotalCount);
