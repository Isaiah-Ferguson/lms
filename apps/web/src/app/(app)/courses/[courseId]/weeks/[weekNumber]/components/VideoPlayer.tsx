import type { WeekVideo } from "@/lib/week-details-data";

interface VideoPlayerProps {
  video: WeekVideo;
}

function toEmbedUrl(url: string): string {
  // YouTube watch URL to embed URL
  if (url.includes('youtube.com/watch')) {
    const videoId = new URL(url).searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // YouTube short URL to embed URL
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // Vimeo watch URL to embed URL
  if (url.includes('vimeo.com/') && !url.includes('/video/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
  
  return url;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  // Check if it's a YouTube/Vimeo embed URL or a direct video file
  const isEmbedUrl = video.videoWatchUrl.includes('youtube.com') || 
                     video.videoWatchUrl.includes('youtu.be') || 
                     video.videoWatchUrl.includes('vimeo.com');
  
  const embedUrl = isEmbedUrl ? toEmbedUrl(video.videoWatchUrl) : video.videoWatchUrl;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Now Playing</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">{video.title}</p>
      </div>
      <div className="aspect-video w-full bg-black">
        {isEmbedUrl ? (
          <iframe
            key={video.id}
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <video
            key={video.id}
            src={video.videoWatchUrl}
            controls
            controlsList="nodownload"
            className="h-full w-full"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </section>
  );
}
