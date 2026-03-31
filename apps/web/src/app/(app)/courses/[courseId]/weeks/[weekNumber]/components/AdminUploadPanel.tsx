"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WeekCodeArtifact, WeekVideo } from "@/lib/week-details-data";
import { lessonsApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface AdminUploadPanelProps {
  weekNumber: number;
  moduleId: string | null;
  onAttach: (payload: WeekVideo) => void;
}

export function AdminUploadPanel({ weekNumber, moduleId, onAttach }: AdminUploadPanelProps) {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    // Allow submitting if we have a title and at least one of: video URL or code file
    return Boolean(title.trim() && (videoUrl.trim() || codeFile)) && !uploading;
  }, [codeFile, title, uploading, videoUrl]);

  function resetForm() {
    setTitle("");
    setVideoUrl("");
    setCodeFile(null);
    setProgress(0);
    setError("");
  }

  async function handleUpload() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!videoUrl.trim() && !codeFile) {
      setError("Please provide either a video URL or a code file.");
      return;
    }

    if (!moduleId) {
      setError("Module ID not loaded yet. Please wait.");
      return;
    }

    // Validate URL format if provided
    if (videoUrl.trim()) {
      try {
        new URL(videoUrl);
      } catch {
        setError("Please enter a valid video URL.");
        return;
      }
    }

    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Create lesson with video URL
      const lesson = await lessonsApi.createLesson(
        {
          moduleId,
          title: title.trim(),
          order: 1, // Simple order - backend can handle ordering
          videoUrl: videoUrl.trim() || undefined,
        },
        token
      );

      clearInterval(progressInterval);
      setProgress(90);

      // Upload code file if provided
      const codeArtifacts: WeekCodeArtifact[] = [];
      if (codeFile) {
        try {
          const artifact = await lessonsApi.uploadArtifact(lesson.id, codeFile, token);
          codeArtifacts.push({
            id: artifact.id,
            label: artifact.fileName,
            downloadUrl: artifact.downloadUrl,
          });
        } catch (err) {
          // Continue anyway - video was created successfully
        }
      }

      setProgress(100);

      onAttach({
        id: lesson.id,
        title: lesson.title,
        videoWatchUrl: lesson.videoUrl || "",
        order: lesson.order,
        codeArtifacts,
      });

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Admin Tools</h3>
        <p className="text-xs text-gray-500">Upload week media and attach it to Week {weekNumber}.</p>
      </div>

      <div className="space-y-3">
        <Input
          label="Video Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder="e.g. Dependency Injection Walkthrough"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setError("");
              }}
              placeholder="https://codestackcdnwest.blob.core.windows.net/..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Upload Code</label>
            <input
              type="file"
              accept=".zip,.pdf,.txt,.md,.ts,.tsx,.js,.cs"
              onChange={(e) => {
                setCodeFile(e.target.files?.[0] ?? null);
                setError("");
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-gray-600"
            />
          </div>
        </div>

        {uploading && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">Uploading... {progress}%</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleUpload} disabled={!canSubmit || !moduleId} loading={uploading}>
            {moduleId ? "Attach to Week" : "Loading..."}
          </Button>
        </div>
      </div>
    </section>
  );
}
