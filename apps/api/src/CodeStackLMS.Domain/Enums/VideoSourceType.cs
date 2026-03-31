namespace CodeStackLMS.Domain.Enums;

public enum VideoSourceType
{
    None = 0,

    // MVP: blob path → API issues short-lived SAS read URL
    AzureBlob = 1,

    // Near-term: blob served via Azure Front Door CDN with token auth
    AzureFrontDoor = 2,

    // Near-term: externally hosted (YouTube, Vimeo embed)
    External = 3,

    // Long-term: HLS manifest (.m3u8) stored in blob / CDN
    HlsManifest = 4,

    // Long-term: DASH manifest (.mpd) stored in blob / CDN
    DashManifest = 5,
}
