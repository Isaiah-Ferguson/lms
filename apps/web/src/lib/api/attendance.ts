import type { AttendanceGrid, SaveAttendanceRequest } from "@/types";
import { apiFetch } from "./core";

// ─── Attendance API (Admin) ──────────────────────────────────────────────────

export const attendanceApi = {
  getMonthGrid(courseId: string, year: number, month: number, token: string): Promise<AttendanceGrid> {
    const qs = new URLSearchParams({ courseId, year: String(year), month: String(month) });
    return apiFetch<AttendanceGrid>(`/api/admin/attendance?${qs.toString()}`, {}, token);
  },

  saveAttendance(body: SaveAttendanceRequest, token: string): Promise<void> {
    return apiFetch<void>(
      "/api/admin/attendance",
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },
};
