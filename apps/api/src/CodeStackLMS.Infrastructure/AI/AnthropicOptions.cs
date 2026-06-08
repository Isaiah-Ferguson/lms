namespace CodeStackLMS.Infrastructure.AI;

public sealed class AnthropicOptions
{
    public const string SectionName = "Anthropic";

    public string ApiKey { get; set; } = string.Empty;
    public string DefaultModel { get; set; } = "claude-haiku-4-5";
    public int MaxTokens { get; set; } = 1024;
}
