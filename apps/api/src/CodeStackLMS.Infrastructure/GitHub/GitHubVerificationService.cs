using System.Net;
using System.Text.Json;
using CodeStackLMS.Application.Common.Exceptions;
using CodeStackLMS.Application.Common.Interfaces;

namespace CodeStackLMS.Infrastructure.GitHub;

/// <summary>
/// Verifies public GitHub repositories via the unauthenticated GitHub REST API.
/// The HttpClient (base address, User-Agent, optional token) is configured in DI.
/// </summary>
public class GitHubVerificationService : IGitHubVerificationService
{
    private readonly HttpClient _http;

    public GitHubVerificationService(HttpClient http)
    {
        _http = http;
    }

    public async Task<GitHubRepoInfo> VerifyAndResolveAsync(
        string repoUrl,
        string? branch,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseOwnerRepo(repoUrl, out var owner, out var repo))
            throw new ValidationException(
                "repoUrl must be a valid GitHub repository URL (https://github.com/owner/repo).");

        // 1. Repo must exist and be public.
        var repoResp = await SendAsync($"repos/{owner}/{repo}", cancellationToken);
        if (repoResp.StatusCode == HttpStatusCode.NotFound)
            throw new ValidationException(
                "GitHub repository not found, or it is private. Make sure the repo is public and the URL is correct.");
        EnsureNotRateLimited(repoResp);
        repoResp.EnsureSuccessStatusCode();

        using var repoDoc = JsonDocument.Parse(
            await repoResp.Content.ReadAsStringAsync(cancellationToken));
        var defaultBranch = repoDoc.RootElement.TryGetProperty("default_branch", out var db)
            ? db.GetString() ?? "main"
            : "main";

        var resolvedBranch = string.IsNullOrWhiteSpace(branch) ? defaultBranch : branch.Trim();

        // 2. Resolve the latest commit on the branch.
        var commitResp = await SendAsync(
            $"repos/{owner}/{repo}/commits/{Uri.EscapeDataString(resolvedBranch)}", cancellationToken);
        if (commitResp.StatusCode == HttpStatusCode.NotFound)
            throw new ValidationException(
                $"Branch '{resolvedBranch}' was not found in the repository.");
        EnsureNotRateLimited(commitResp);
        commitResp.EnsureSuccessStatusCode();

        using var commitDoc = JsonDocument.Parse(
            await commitResp.Content.ReadAsStringAsync(cancellationToken));
        var sha = commitDoc.RootElement.TryGetProperty("sha", out var shaEl)
            ? shaEl.GetString() ?? string.Empty
            : string.Empty;

        return new GitHubRepoInfo(resolvedBranch, sha);
    }

    private async Task<HttpResponseMessage> SendAsync(string path, CancellationToken ct)
    {
        try
        {
            return await _http.GetAsync(path, ct);
        }
        catch (HttpRequestException)
        {
            throw new ValidationException(
                "Could not reach GitHub to verify the repository. Please try again in a moment.");
        }
    }

    // GitHub returns 403 with X-RateLimit-Remaining: 0 when the (unauthenticated) hourly
    // quota is exhausted. Surface that as a retryable message instead of "not found".
    private static void EnsureNotRateLimited(HttpResponseMessage resp)
    {
        if (resp.StatusCode != HttpStatusCode.Forbidden) return;

        if (resp.Headers.TryGetValues("X-RateLimit-Remaining", out var values) &&
            values.FirstOrDefault() == "0")
        {
            throw new ValidationException(
                "GitHub verification is temporarily rate-limited. Please try again in a few minutes.");
        }

        throw new ValidationException(
            "GitHub repository not found, or it is private. Make sure the repo is public and the URL is correct.");
    }

    private static bool TryParseOwnerRepo(string url, out string owner, out string repo)
    {
        owner = repo = string.Empty;
        if (string.IsNullOrWhiteSpace(url)) return false;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)) return false;

        var segments = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 2 || segments[0].Length == 0 || segments[1].Length == 0)
            return false;

        owner = segments[0];
        repo = segments[1].EndsWith(".git", StringComparison.OrdinalIgnoreCase)
            ? segments[1][..^4]
            : segments[1];
        return true;
    }
}
