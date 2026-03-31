"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type WeekVideo } from "@/lib/week-details-data";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoList } from "./components/VideoList";
import { CodeLinksPanel } from "./components/CodeLinksPanel";
import { AdminUploadPanel } from "./components/AdminUploadPanel";
import { AssignmentManager } from "@/components/assignments/AssignmentManager";
import { courseApi, lessonsApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

interface WeekDetailsPageProps {
  params: {
    courseId: string;
    weekNumber: string;
  };
}

export default function WeekDetailsPage({ params }: WeekDetailsPageProps) {
  const parsedWeekNumber = Number.parseInt(params.weekNumber, 10);

  const [videos, setVideos] = useState<WeekVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [realCourseId, setRealCourseId] = useState<string | null>(null);
  const [realModuleId, setRealModuleId] = useState<string | null>(null);
  const [realModuleTitle, setRealModuleTitle] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<WeekVideo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    courseApi.getCourseDetail(params.courseId, token).then((res) => {
      setRealCourseId(res.id);
      setCourseTitle(res.title);
      
      // Match week by weekNumber
      const match = res.weeks.find((w) => w.weekNumber === parsedWeekNumber);
      if (match) {
        setRealModuleId(match.id);
        setRealModuleTitle(match.title);
        
        // Fetch real lessons for this module
        lessonsApi.getModuleLessons(match.id, token).then((lessons) => {
          const mappedVideos: WeekVideo[] = lessons.map((lesson, index) => ({
            id: lesson.id,
            title: lesson.title,
            videoWatchUrl: lesson.videoUrl || "",
            order: index + 1,
            codeArtifacts: lesson.artifacts.map(artifact => ({
              id: artifact.id,
              label: artifact.fileName,
              downloadUrl: artifact.downloadUrl,
            })),
          }));
          
          setVideos(mappedVideos);
          if (mappedVideos.length > 0) {
            setSelectedVideoId(mappedVideos[0].id);
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [params.courseId, parsedWeekNumber]);

  const selectedVideo = useMemo(() => {
    if (videos.length === 0) return null;
    return videos.find((video) => video.id === selectedVideoId) ?? videos[0];
  }, [selectedVideoId, videos]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to course
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          Loading week details...
        </div>
      </div>
    );
  }

  if (!Number.isFinite(parsedWeekNumber) || parsedWeekNumber < 1 || !realModuleId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link
          href={`/courses/${params.courseId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to course
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          Week not found.
        </div>
      </div>
    );
  }

  function handleAttachVideo(video: WeekVideo) {
    setVideos((prev) => [...prev, video]);
    setSelectedVideoId(video.id);
  }

  function handleEditVideo(video: WeekVideo) {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditUrl(video.videoWatchUrl);
  }

  async function handleSaveEdit() {
    if (!editingVideo) return;

    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const updated = await lessonsApi.updateLesson(
        editingVideo.id,
        {
          title: editTitle,
          videoUrl: editUrl || null,
        },
        token
      );

      setVideos((prev) =>
        prev.map((v) =>
          v.id === editingVideo.id
            ? { ...v, title: updated.title, videoWatchUrl: updated.videoUrl || "" }
            : v
        )
      );
      setEditingVideo(null);
    } catch (err) {
      alert("Failed to update video: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVideo(videoId: string) {
    if (!confirm("Are you sure you want to delete this video?")) return;

    const token = getToken();
    if (!token) return;

    try {
      await lessonsApi.deleteLesson(videoId, token);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      if (selectedVideoId === videoId && videos.length > 1) {
        setSelectedVideoId(videos[0].id === videoId ? videos[1].id : videos[0].id);
      }
    } catch (err) {
      alert("Failed to delete video: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/courses/${params.courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      <header className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          {courseTitle} — Week {parsedWeekNumber}
          {realModuleTitle && <span className="font-normal text-gray-600"> — {realModuleTitle}</span>}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review recordings and download week code artifacts.
        </p>
      </header>

      {selectedVideo ? (
        <>
          <VideoPlayer video={selectedVideo} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <VideoList
              videos={videos}
              selectedVideoId={selectedVideo.id}
              onSelect={setSelectedVideoId}
              canEdit={true}
              onEdit={handleEditVideo}
              onDelete={handleDeleteVideo}
            />
            <CodeLinksPanel video={selectedVideo} />
          </section>

          <AdminUploadPanel 
            weekNumber={parsedWeekNumber} 
            moduleId={realModuleId}
            onAttach={handleAttachVideo} 
          />

          {/* Assignments Section */}
          {realCourseId && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Week {parsedWeekNumber} Assignments</h2>
              <AssignmentManager
                courseId={realCourseId}
                moduleId={realModuleId ?? undefined}
                moduleTitle={realModuleTitle ?? `Week ${parsedWeekNumber}`}
                canEdit={true}
              />
            </section>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
          No videos available for this week yet.
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Edit Video</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Video URL
                </label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setEditingVideo(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editTitle.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
