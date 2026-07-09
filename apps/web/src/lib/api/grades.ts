import type { StudentGrades, AdminGrades } from "@/types";
import { apiFetch } from "./core";

// ─── Grades API ───────────────────────────────────────────────────────────────

export const gradesApi = {
  getMyGrades(courseId: string, token: string, cohortId?: string): Promise<StudentGrades> {
    const params = new URLSearchParams({ courseId });
    if (cohortId) params.append('cohortId', cohortId);
    return apiFetch<StudentGrades>(
      `/api/grades/my?${params.toString()}`,
      {},
      token
    );
  },

  getAdminGrades(courseId: string, token: string, cohortId?: string): Promise<AdminGrades> {
    const params = new URLSearchParams({ courseId });
    if (cohortId) params.append('cohortId', cohortId);
    return apiFetch<AdminGrades>(
      `/api/grades/admin?${params.toString()}`,
      {},
      token
    );
  },
};
