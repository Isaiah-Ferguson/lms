import type {
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  Assignment,
  AssignmentListItem,
  StudentSubmissionStatus,
} from "@/types";
import { apiFetch } from "./core";

// ─── Assignment API ───────────────────────────────────────────────────────────

export const assignmentsApi = {
  getAssignment: (assignmentId: string, token: string): Promise<Assignment> =>
    apiFetch<Assignment>(`/api/assignments/${assignmentId}`, {}, token),

  getAssignmentsByCourse: (courseId: string, token: string): Promise<AssignmentListItem[]> =>
    apiFetch<AssignmentListItem[]>(`/api/assignments/course/${courseId}`, {}, token),

  getAssignmentsByModule: (moduleId: string, token: string): Promise<AssignmentListItem[]> =>
    apiFetch<AssignmentListItem[]>(`/api/assignments/module/${moduleId}`, {}, token),

  createAssignment: (assignment: CreateAssignmentRequest, token: string): Promise<Assignment> =>
    apiFetch<Assignment>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(assignment),
    }, token),

  updateAssignment: (assignmentId: string, assignment: UpdateAssignmentRequest, token: string): Promise<Assignment> =>
    apiFetch<Assignment>(`/api/assignments/${assignmentId}`, {
      method: "PUT",
      body: JSON.stringify(assignment),
    }, token),

  deleteAssignment: (assignmentId: string, token: string): Promise<void> =>
    apiFetch<void>(`/api/assignments/${assignmentId}`, {
      method: "DELETE",
    }, token),

  getMySubmission: (assignmentId: string, token: string): Promise<StudentSubmissionStatus> =>
    apiFetch<StudentSubmissionStatus>(`/api/assignments/${assignmentId}/my-submission`, {}, token),
};
