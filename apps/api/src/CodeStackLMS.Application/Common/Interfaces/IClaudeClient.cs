namespace CodeStackLMS.Application.Common.Interfaces;

public interface IClaudeClient
{
    Task<string> GenerateAsync(string systemPrompt, string userPrompt, string model, CancellationToken cancellationToken = default);
}
