namespace CodeStackLMS.Application.Common.Interfaces;

public interface IGitHubVerificationService
{
    /// <summary>
    /// Verifies that a public GitHub repository exists and resolves the latest commit
    /// hash for the given (or the repo's default) branch. Throws ValidationException if
    /// the repo is missing/private or the branch does not exist.
    /// </summary>
    Task<GitHubRepoInfo> VerifyAndResolveAsync(
        string repoUrl,
        string? branch,
        CancellationToken cancellationToken = default);
}

public record GitHubRepoInfo(
    string Branch,
    string CommitHash
);
