import type { CourseDetailResponse } from "@/types";
import { apiFetch } from "./core";

// ─── Courses API ──────────────────────────────────────────────────────────────

export const courseApi = {
  getCourseDetail(courseId: string, token: string): Promise<CourseDetailResponse> {
    return apiFetch<CourseDetailResponse>(`/api/courses/${courseId}`, {}, token);
  },

  createWeek(
    courseId: string,
    body: { weekNumber: number; title: string; dateRange: string; zoomUrl: string; topics: string[] },
    token: string
  ): Promise<CourseDetailResponse["weeks"][number]> {
    return apiFetch<CourseDetailResponse["weeks"][number]>(
      `/api/courses/${courseId}/weeks`,
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  updateWeek(
    courseId: string,
    weekId: string,
    body: { title: string; dateRange: string; zoomUrl: string; topics: string[] },
    token: string
  ): Promise<CourseDetailResponse["weeks"][number]> {
    return apiFetch<CourseDetailResponse["weeks"][number]>(
      `/api/courses/${courseId}/weeks/${weekId}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    );
  },

  createAnnouncement(
    courseId: string,
    body: { title: string; body: string; tag: string | null; announcedAt: string },
    token: string
  ): Promise<CourseDetailResponse["announcements"][number]> {
    return apiFetch<CourseDetailResponse["announcements"][number]>(
      `/api/courses/${courseId}/announcements`,
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  updateAnnouncement(
    courseId: string,
    announcementId: string,
    body: { title: string; body: string; tag: string | null; announcedAt: string },
    token: string
  ): Promise<CourseDetailResponse["announcements"][number]> {
    return apiFetch<CourseDetailResponse["announcements"][number]>(
      `/api/courses/${courseId}/announcements/${announcementId}`,
      { method: "PUT", body: JSON.stringify(body) },
      token
    );
  },

  deleteAnnouncement(courseId: string, announcementId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/courses/${courseId}/announcements/${announcementId}`,
      { method: "DELETE" },
      token
    );
  },
};
