import type {
  SubmissionDetail,
  ExistingGrade,
  GradeSubmissionRequest,
  SubmissionQueuePage,
  AssignmentSubmissionsRosterResponse,
} from "@/types";
import { apiFetch } from "./core";

// ─── Instructor API ───────────────────────────────────────────────────────────

export const instructorApi = {
  getSubmissionDetail(
    submissionId: string,
    token: string
  ): Promise<SubmissionDetail> {
    return apiFetch<SubmissionDetail>(
      `/api/instructor/submissions/${submissionId}`,
      {},
      token
    );
  },

  gradeSubmission(
    submissionId: string,
    body: GradeSubmissionRequest,
    token: string
  ): Promise<ExistingGrade> {
    return apiFetch<ExistingGrade>(
      `/api/instructor/submissions/${submissionId}/grade`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  gradeByStudent(
    assignmentId: string,
    studentId: string,
    body: GradeSubmissionRequest,
    token: string
  ): Promise<ExistingGrade> {
    return apiFetch<ExistingGrade>(
      `/api/instructor/assignments/${assignmentId}/students/${studentId}/grade`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  returnSubmission(
    submissionId: string,
    reason: string,
    token: string
  ): Promise<void> {
    return apiFetch<void>(
      `/api/instructor/submissions/${submissionId}/return`,
      {
        method: "POST",
        body: JSON.stringify({ Reason: reason }),
      },
      token
    );
  },

  getSubmissionQueue(
    token: string,
    courseId?: string,
    status?: string,
    yearId?: string
  ): Promise<SubmissionQueuePage> {
    const params = new URLSearchParams();
    if (courseId) params.set("courseId", courseId);
    if (status) params.set("status", status);
    if (yearId) params.set("yearId", yearId);
    const qs = params.toString();
    return apiFetch<SubmissionQueuePage>(
      `/api/instructor/submissions${qs ? `?${qs}` : ""}`,
      {},
      token
    );
  },

  getAssignmentSubmissionsRoster(
    assignmentId: string,
    token: string
  ): Promise<AssignmentSubmissionsRosterResponse> {
    return apiFetch<AssignmentSubmissionsRosterResponse>(
      `/api/instructor/assignments/${assignmentId}/submissions-roster`,
      {},
      token
    );
  },
};
