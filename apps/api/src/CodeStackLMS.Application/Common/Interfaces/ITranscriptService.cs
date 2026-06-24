using CodeStackLMS.Application.Transcript.DTOs;

namespace CodeStackLMS.Application.Common.Interfaces;

public interface ITranscriptService
{
    /// <summary>
    /// Builds an academic transcript for the given user. The current user may only
    /// request their own transcript unless they are an Admin or Instructor.
    /// Returns null when the user does not exist.
    /// </summary>
    Task<TranscriptDto?> GetTranscriptAsync(string userId, CancellationToken cancellationToken = default);
}
