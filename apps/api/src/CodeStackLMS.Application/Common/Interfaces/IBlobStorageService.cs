namespace CodeStackLMS.Application.Common.Interfaces;

public interface IBlobStorageService
{
    Task<BlobUploadSlot> GenerateUploadSasAsync(
        string blobPath,
        string contentType,
        long maxSizeBytes,
        TimeSpan expiry,
        CancellationToken cancellationToken = default);

    Task<string> GenerateReadSasAsync(
        string blobPath,
        TimeSpan expiry,
        CancellationToken cancellationToken = default);

    Task UploadBlobAsync(
        string blobPath,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    Task<bool> BlobExistsAsync(string blobPath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads what was actually stored. A SAS cannot cap upload size or pin the
    /// content type, so anything the client declared has to be checked against
    /// this before it is trusted or persisted.
    /// </summary>
    Task<StoredBlobInfo?> GetBlobPropertiesAsync(
        string blobPath,
        CancellationToken cancellationToken = default);

    Task DeleteBlobAsync(string blobPath, CancellationToken cancellationToken = default);
}

public record BlobUploadSlot(
    string BlobPath,
    string SasUrl,
    DateTimeOffset ExpiresAt
);

public record StoredBlobInfo(
    long ContentLength,
    string? ContentType
);
