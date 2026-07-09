using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Instructor.DTOs;

public record GradeSubmissionDto(
    [Range(0, 100)] decimal TotalScore,
    [Required(AllowEmptyStrings = true), StringLength(20000)] string RubricBreakdownJson,
    [Required(AllowEmptyStrings = true), StringLength(10000)] string OverallComment);
