using CodeStackLMS.Application.Common.Interfaces;

namespace CodeStackLMS.Application.Common;

public static class BlobStorageExtensions
{
    /// <summary>
    /// Resolve a stored blob path to a 1-day read SAS URL, or null when the path is empty
    /// or the blob no longer exists. Shared by avatar rendering across profile/admin/home.
    /// </summary>
    public static async Task<string?> ResolveReadUrlAsync(
        this IBlobStorageService blob, string? blobPath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
            return null;

        if (!await blob.BlobExistsAsync(blobPath, ct))
            return null;

        return await blob.GenerateReadSasAsync(blobPath, TimeSpan.FromDays(1), ct);
    }
}
