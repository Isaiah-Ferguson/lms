"use client";

import { useEffect, useState } from "react";
import { courseApi, ApiError, type CourseDetailResponse } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { LevelDashboardClient, type LevelData, type LevelWeek, type LevelAnnouncement } from "./LevelDashboardClient";

interface Props {
  courseId: string;
}

function mapResponse(courseId: string, data: CourseDetailResponse): LevelData {
  const weeks: LevelWeek[] = data.weeks.map((w) => ({
    id: w.id,
    weekNumber: w.weekNumber,
    title: w.title,
    dateRange: w.dateRange,
    zoomUrl: w.zoomUrl || data.zoomUrl,
    topics: w.topics,
    detailsHref: `/courses/${courseId}/weeks/${w.weekNumber}`,
  }));

  const announcements: LevelAnnouncement[] = data.announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    tag: (a.tag ?? undefined) as LevelAnnouncement["tag"],
    date: a.announcedAt,
  }));

  return {
    courseId: data.id,
    courseTitle: data.title,
    courseMeta: data.courseMeta,
    accentColor: data.accentColor,
    zoomUrl: data.zoomUrl,
    weeks,
    announcements,
    assignments: { miniChallenges: [], challenges: [], projects: [] },
    permissions: { canEditAssignments: data.permissions.canEditContent },
  };
}

export function CourseDashboardLoader({ courseId }: Props) {
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    courseApi
      .getCourseDetail(courseId, token)
      .then((res) => setData(mapResponse(courseId, res)))
      .catch((err) => {
        const errorMsg = err instanceof ApiError 
          ? `${err.detail || err.message} (Status: ${err.status})`
          : err instanceof Error 
          ? err.message 
          : "Unable to load course.";
        setError(errorMsg);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Loading course…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-red-500">
        {error ?? "Course not found."}
      </div>
    );
  }

  async function handleWeekSave(week: LevelWeek): Promise<LevelWeek> {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    if (!week.id) throw new Error("Week has no ID.");

    const updated = await courseApi.updateWeek(
      courseId,
      week.id,
      {
        title: week.title,
        dateRange: week.dateRange,
        zoomUrl: week.zoomUrl,
        topics: week.topics,
      },
      token
    );

    return {
      id: updated.id,
      weekNumber: updated.weekNumber,
      title: updated.title,
      dateRange: updated.dateRange,
      zoomUrl: updated.zoomUrl || data!.zoomUrl,
      topics: updated.topics,
      detailsHref: `/courses/${courseId}/weeks/${updated.weekNumber}`,
    };
  }

  async function handleCreateAnnouncement(ann: LevelAnnouncement): Promise<LevelAnnouncement> {
    const token = getToken();
    if (!token) throw new Error("Session expired.");

    const created = await courseApi.createAnnouncement(
      courseId,
      { title: ann.title, body: ann.body, tag: ann.tag ?? null, announcedAt: ann.date },
      token
    );

    return { id: created.id, title: created.title, body: created.body, tag: (created.tag ?? undefined) as LevelAnnouncement["tag"], date: created.announcedAt };
  }

  async function handleUpdateAnnouncement(ann: LevelAnnouncement): Promise<LevelAnnouncement> {
    const token = getToken();
    if (!token) throw new Error("Session expired.");

    const updated = await courseApi.updateAnnouncement(
      courseId,
      ann.id,
      { title: ann.title, body: ann.body, tag: ann.tag ?? null, announcedAt: ann.date },
      token
    );

    return { id: updated.id, title: updated.title, body: updated.body, tag: (updated.tag ?? undefined) as LevelAnnouncement["tag"], date: updated.announcedAt };
  }

  async function handleDeleteAnnouncement(id: string): Promise<void> {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    await courseApi.deleteAnnouncement(courseId, id, token);
  }

  async function handleWeekCreate(week: Omit<LevelWeek, "id" | "detailsHref">): Promise<LevelWeek> {
    const token = getToken();
    if (!token) throw new Error("Session expired.");

    const created = await courseApi.createWeek(
      courseId,
      {
        weekNumber: week.weekNumber,
        title: week.title,
        dateRange: week.dateRange,
        zoomUrl: week.zoomUrl,
        topics: week.topics,
      },
      token
    );

    return {
      id: created.id,
      weekNumber: created.weekNumber,
      title: created.title,
      dateRange: created.dateRange,
      zoomUrl: created.zoomUrl || data!.zoomUrl,
      topics: created.topics,
      detailsHref: `/courses/${courseId}/weeks/${created.weekNumber}`,
    };
  }

  return (
    <LevelDashboardClient
      data={data}
      onWeekSave={handleWeekSave}
      onWeekCreate={handleWeekCreate}
      onAnnouncementCreate={handleCreateAnnouncement}
      onAnnouncementUpdate={handleUpdateAnnouncement}
      onAnnouncementDelete={handleDeleteAnnouncement}
    />
  );
}
