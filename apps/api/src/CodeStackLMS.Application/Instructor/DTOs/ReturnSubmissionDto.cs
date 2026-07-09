using System.ComponentModel.DataAnnotations;

namespace CodeStackLMS.Application.Instructor.DTOs;

public record ReturnSubmissionDto(
    [Required, StringLength(2000, MinimumLength = 1)] string Reason);
