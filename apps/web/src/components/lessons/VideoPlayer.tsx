"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

export interface VideoToken {
  lessonId: string;
  videoSource: "AzureBlob" | "AzureFrontDoor" | "HlsManifest" | "DashManifest" | "External";
  streamUrl: string;
  mimeType: string | null;
  durationSeconds: number | null;
  expiresAt: string;
}

interface VideoPlayerProps {
  token: VideoToken;
  onExpired?: () => void;
  className?: string;
}

// ─── Native <video> player (AzureBlob / AzureFrontDoor / DashManifest fallback) ──

function NativePlayer({ token, onExpired, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Refresh the SAS URL 2 minutes before it expires
  useEffect(() => {
    const msUntilExpiry =
      new Date(token.expiresAt).getTime() - Date.now() - 2 * 60 * 1000;

    if (msUntilExpiry <= 0) {
      onExpired?.();
      return;
    }

    const timer = setTimeout(() => onExpired?.(), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token.expiresAt, onExpired]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-900 text-red-400">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={token.streamUrl}
      controls
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setError("Video failed to load. The link may have expired.")}
      className={`aspect-video w-full rounded-xl bg-black ${className ?? ""}`}
    >
      {token.mimeType && <source src={token.streamUrl} type={token.mimeType} />}
      Your browser does not support HTML5 video.
    </video>
  );
}

// ─── HLS player (HlsManifest) ─────────────────────────────────────────────────
// Uses hls.js loaded dynamically so it doesn't bloat the SSR bundle.

function HlsPlayer({ token, onExpired, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hlsInstance: { destroy(): void } | null = null;

    async function init() {
      const video = videoRef.current;
      if (!video) return;

      // Native HLS (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = token.streamUrl;
        return;
      }

      // hls.js for Chrome/Firefox/Edge
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        setError("Your browser does not support HLS video playback.");
        return;
      }

      const hls = new Hls();
      hlsInstance = hls;
      hls.loadSource(token.streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
        if (data.fatal) setError("HLS stream error. The link may have expired.");
      });
    }

    init();
    return () => { hlsInstance?.destroy(); };
  }, [token.streamUrl]);

  useEffect(() => {
    const msUntilExpiry =
      new Date(token.expiresAt).getTime() - Date.now() - 2 * 60 * 1000;
    if (msUntilExpiry <= 0) { onExpired?.(); return; }
    const timer = setTimeout(() => onExpired?.(), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token.expiresAt, onExpired]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-900 text-red-400">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className={`aspect-video w-full rounded-xl bg-black ${className ?? ""}`}
    />
  );
}

// ─── External embed (YouTube / Vimeo) ────────────────────────────────────────

function ExternalEmbed({ token, className }: Omit<VideoPlayerProps, "onExpired">) {
  // Convert watch URLs to embed URLs
  const embedUrl = toEmbedUrl(token.streamUrl);

  return (
    <iframe
      src={embedUrl}
      className={`aspect-video w-full rounded-xl border-0 ${className ?? ""}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Lesson video"
    />
  );
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/\//g, "");
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // fall through
  }
  return url;
}

// ─── Public component — dispatches by VideoSource ─────────────────────────────

export function VideoPlayer({ token, onExpired, className }: VideoPlayerProps) {
  switch (token.videoSource) {
    case "HlsManifest":
      return <HlsPlayer token={token} onExpired={onExpired} className={className} />;
    case "External":
      return <ExternalEmbed token={token} className={className} />;
    case "AzureBlob":
    case "AzureFrontDoor":
    case "DashManifest":
    default:
      return <NativePlayer token={token} onExpired={onExpired} className={className} />;
  }
}

// ─── Wrapper that fetches the token and handles refresh ──────────────────────

interface LessonVideoProps {
  lessonId: string;
  fetchToken: (lessonId: string) => Promise<VideoToken>;
  className?: string;
}

export function LessonVideo({ lessonId, fetchToken, className }: LessonVideoProps) {
  const [token, setToken] = useState<VideoToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const t = await fetchToken(lessonId);
      setToken(t);
    } catch {
      setError("Could not load video. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-gray-900 text-gray-400">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm">{error ?? "No video available."}</p>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <VideoPlayer
      token={token}
      onExpired={load}
      className={className}
    />
  );
}
