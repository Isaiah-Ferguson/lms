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

    Task DeleteBlobAsync(string blobPath, CancellationToken cancellationToken = default);
}

public record BlobUploadSlot(
    string BlobPath,
    string SasUrl,
    DateTimeOffset ExpiresAt
);
