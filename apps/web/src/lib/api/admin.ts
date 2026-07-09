import type { AdminParticipantsResponse, PreviousNoteExportItem } from "@/types";
import { extractFileName } from "@/lib/utils";
import { ApiError, apiFetch } from "./core";

// ─── Admin Participants API ───────────────────────────────────────────────────

export const adminParticipantsApi = {
  getParticipants(token: string): Promise<AdminParticipantsResponse> {
    return apiFetch<AdminParticipantsResponse>("/api/admin/participants", {}, token);
  },

  enrollUsers(body: { userIds: string[]; courseIds: string[] }, token: string): Promise<void> {
    return apiFetch<void>(
      "/api/admin/participants/enrollments",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  unenrollUsers(body: { userIds: string[]; courseIds: string[] }, token: string): Promise<void> {
    return apiFetch<void>(
      "/api/admin/participants/enrollments",
      {
        method: "DELETE",
        body: JSON.stringify(body),
      },
      token
    );
  },

  toggleUserActive(userId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/admin/participants/${userId}/toggle-active`,
      {
        method: "PATCH",
      },
      token
    );
  },

  toggleUserAdmin(userId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/admin/participants/${userId}/toggle-admin`,
      {
        method: "PATCH",
      },
      token
    );
  },

  saveAdminNote(userId: string, text: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/profile/admin/participants/${userId}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      token
    );
  },

  setProbationStatus(userId: string, isOnProbation: boolean, reason: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/profile/admin/participants/${userId}/probation`,
      {
        method: "POST",
        body: JSON.stringify({ isOnProbation, reason }),
      },
      token
    );
  },

  async exportPreviousNotesDocx(
    userId: string,
    body: { userName: string; previousNotes: PreviousNoteExportItem[] },
    _token: string
  ): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(`/api/proxy/api/admin/participants/${userId}/notes/export-docx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorBody: { title?: string; detail?: string; errors?: string[] } = {};
      try {
        errorBody = await res.json();
      } catch {
        // ignore parse errors
      }

      throw new ApiError(
        res.status,
        errorBody.title ?? "Error",
        errorBody.detail ?? res.statusText,
        errorBody.errors
      );
    }

    const fileName = extractFileName(
      res.headers.get("content-disposition"),
      `previous-admin-notes-${new Date().toISOString().slice(0, 10)}.docx`
    );

    return {
      blob: await res.blob(),
      fileName,
    };
  },
};
