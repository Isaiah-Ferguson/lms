namespace CodeStackLMS.Infrastructure.Storage;

public class BlobStorageOptions
{
    public const string SectionName = "AzureStorage";

    public string ConnectionString { get; set; } = string.Empty;
    public string SubmissionsContainer { get; set; } = "submissions";
    public string AvatarsContainer { get; set; } = "avatars";
}
