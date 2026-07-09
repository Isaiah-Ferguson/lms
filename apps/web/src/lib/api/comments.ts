import type { Comment } from "@/types";
import { apiFetch } from "./core";

// ─── Comments API ─────────────────────────────────────────────────────────────

export const commentsApi = {
  getComments: (assignmentId: string, token: string): Promise<Comment[]> =>
    apiFetch<Comment[]>(`/api/assignments/${assignmentId}/comments`, {}, token),

  addComment: (assignmentId: string, message: string, token: string): Promise<Comment> =>
    apiFetch<Comment>(`/api/assignments/${assignmentId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }, token),
};
