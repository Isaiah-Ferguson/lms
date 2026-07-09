using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Instructor.DTOs;

public record GradeSubmissionDto(
    [property: Range(0, 100)] decimal TotalScore,
    [property: Required(AllowEmptyStrings = true), StringLength(20000)] string RubricBreakdownJson,
    [property: Required(AllowEmptyStrings = true), StringLength(10000)] string OverallComment);
