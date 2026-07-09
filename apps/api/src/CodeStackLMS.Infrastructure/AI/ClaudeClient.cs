using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.Extensions.Options;

namespace CodeStackLMS.Infrastructure.AI;

public sealed class ClaudeClient : IClaudeClient
{
    private readonly HttpClient _http;
    private readonly AnthropicOptions _options;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false,
    };

    public ClaudeClient(HttpClient http, IOptions<AnthropicOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task<string> GenerateAsync(
        string systemPrompt,
        string userPrompt,
        string model,
        CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            model,
            max_tokens = _options.MaxTokens,
            system = systemPrompt,
            messages = new[]
            {
                new { role = "user", content = userPrompt }
            }
        };

        var json = JsonSerializer.Serialize(payload, _jsonOptions);
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        request.Headers.Add("x-api-key", _options.ApiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await _http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Anthropic API error {(int)response.StatusCode}: {body}");

        // The content array can contain non-text blocks (e.g. tool_use) or be
        // empty; concatenate the text blocks rather than assuming content[0].text.
        using var doc = JsonDocument.Parse(body);

        if (!doc.RootElement.TryGetProperty("content", out var content)
            || content.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException(
                "Unexpected Anthropic response shape: missing 'content' array.");
        }

        var sb = new StringBuilder();
        foreach (var block in content.EnumerateArray())
        {
            if (block.TryGetProperty("type", out var type)
                && type.ValueEquals("text")
                && block.TryGetProperty("text", out var textProp))
            {
                sb.Append(textProp.GetString());
            }
        }

        if (sb.Length == 0)
        {
            var stopReason = doc.RootElement.TryGetProperty("stop_reason", out var sr)
                ? sr.GetString()
                : null;
            throw new InvalidOperationException(
                $"Anthropic response contained no text blocks (stop_reason: {stopReason ?? "unknown"}).");
        }

        return sb.ToString();
    }
}
