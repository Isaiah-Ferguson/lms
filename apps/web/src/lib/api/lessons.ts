import type {
  LessonArtifact,
  LessonResponse,
  CreateLessonRequest,
  UpdateLessonRequest,
} from "@/types";
import { apiFetch } from "./core";

// ─── Lessons API ──────────────────────────────────────────────────────────────

export const lessonsApi = {
  createLesson(
    body: CreateLessonRequest,
    token: string
  ): Promise<LessonResponse> {
    return apiFetch<LessonResponse>(
      "/api/lessons",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  updateLesson(
    lessonId: string,
    body: UpdateLessonRequest,
    token: string
  ): Promise<LessonResponse> {
    return apiFetch<LessonResponse>(
      `/api/lessons/${lessonId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
  },

  deleteLesson(
    lessonId: string,
    token: string
  ): Promise<void> {
    return apiFetch<void>(
      `/api/lessons/${lessonId}`,
      {
        method: "DELETE",
      },
      token
    );
  },

  async uploadArtifact(
    lessonId: string,
    file: File,
    _token: string
  ): Promise<LessonArtifact> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/proxy/api/lessons/${lessonId}/artifacts`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to upload artifact");
    }

    return response.json();
  },

  deleteArtifact(
    artifactId: string,
    token: string
  ): Promise<void> {
    return apiFetch<void>(
      `/api/lessons/artifacts/${artifactId}`,
      {
        method: "DELETE",
      },
      token
    );
  },

  getModuleLessons(
    moduleId: string,
    token: string
  ): Promise<LessonResponse[]> {
    return apiFetch<LessonResponse[]>(
      `/api/lessons?moduleId=${moduleId}`,
      {},
      token
    );
  },
};
