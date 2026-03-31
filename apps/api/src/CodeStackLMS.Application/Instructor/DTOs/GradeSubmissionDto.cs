namespace CodeStackLMS.Application.Instructor.DTOs;

public record GradeSubmissionDto(
    decimal TotalScore,
    string RubricBreakdownJson,
    string OverallComment);
