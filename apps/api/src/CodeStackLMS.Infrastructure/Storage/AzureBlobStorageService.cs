using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using CodeStackLMS.Application.Common.Interfaces;
using Microsoft.Extensions.Options;

namespace CodeStackLMS.Infrastructure.Storage;

public class AzureBlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _serviceClient;
    private readonly BlobStorageOptions _options;

    public AzureBlobStorageService(
        BlobServiceClient serviceClient,
        IOptions<BlobStorageOptions> options)
    {
        _serviceClient = serviceClient;
        _options = options.Value;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Generate a write-only SAS URL scoped to a single blob path.
    //
    // Security properties:
    //  - Create + Write only (no Read, Delete, List)
    //  - Scoped to exact blob path — not container-wide
    //  - Short expiry (caller-supplied, typically 15 min)
    //  - ContentType enforced via SAS policy header
    //  - No overwrite: uses BlobSasPermissions.Create (fails if blob exists)
    // ─────────────────────────────────────────────────────────────────────────
    private string ResolveContainer(string blobPath) =>
        blobPath.StartsWith("avatars/", StringComparison.OrdinalIgnoreCase)
            ? _options.AvatarsContainer
            : _options.SubmissionsContainer;

    public async Task<BlobUploadSlot> GenerateUploadSasAsync(
        string blobPath,
        string contentType,
        long maxSizeBytes,
        TimeSpan expiry,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(ResolveContainer(blobPath));

        // Ensure container exists (idempotent)
        await containerClient.CreateIfNotExistsAsync(
            PublicAccessType.None,   // No public access — blobs only accessible via SAS
            cancellationToken: cancellationToken);

        var blobClient = containerClient.GetBlobClient(blobPath);

        // Verify the storage account supports user-delegation or account-key SAS
        if (!blobClient.CanGenerateSasUri)
            throw new InvalidOperationException(
                "BlobClient cannot generate SAS URIs. " +
                "Ensure the BlobServiceClient is authenticated with a StorageSharedKeyCredential " +
                "or a UserDelegationKey, not a managed identity token directly.");

        var expiresAt = DateTimeOffset.UtcNow.Add(expiry);

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = ResolveContainer(blobPath),
            BlobName = blobPath,
            Resource = "b",                  // "b" = single blob (not container)
            ExpiresOn = expiresAt,
            ContentType = contentType,       // Enforces Content-Type header on PUT
            Protocol = SasProtocol.Https,    // HTTPS only
        };

        // Write + Create only — Create fails if blob already exists (prevents overwrite)
        sasBuilder.SetPermissions(BlobSasPermissions.Write | BlobSasPermissions.Create);

        var sasUri = blobClient.GenerateSasUri(sasBuilder);

        return new BlobUploadSlot(blobPath, sasUri.ToString(), expiresAt);
    }

    public Task<string> GenerateReadSasAsync(
        string blobPath,
        TimeSpan expiry,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(ResolveContainer(blobPath));
        var blobClient = containerClient.GetBlobClient(blobPath);

        if (!blobClient.CanGenerateSasUri)
            throw new InvalidOperationException(
                "BlobClient cannot generate SAS URIs. Ensure account-key or user-delegation auth.");

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = ResolveContainer(blobPath),
            BlobName = blobPath,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(expiry),
            Protocol = SasProtocol.Https,
        };

        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return Task.FromResult(blobClient.GenerateSasUri(sasBuilder).ToString());
    }

    public async Task UploadBlobAsync(
        string blobPath,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(ResolveContainer(blobPath));

        await containerClient.CreateIfNotExistsAsync(
            PublicAccessType.None,
            cancellationToken: cancellationToken);

        var blobClient = containerClient.GetBlobClient(blobPath);

        await blobClient.UploadAsync(
            content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            cancellationToken);
    }

    public async Task<bool> BlobExistsAsync(
        string blobPath,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(ResolveContainer(blobPath));
        var blobClient = containerClient.GetBlobClient(blobPath);
        var response = await blobClient.ExistsAsync(cancellationToken);
        return response.Value;
    }

    public async Task DeleteBlobAsync(
        string blobPath,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(ResolveContainer(blobPath));
        var blobClient = containerClient.GetBlobClient(blobPath);
        await blobClient.DeleteIfExistsAsync(
            DeleteSnapshotsOption.IncludeSnapshots,
            cancellationToken: cancellationToken);
    }
}
