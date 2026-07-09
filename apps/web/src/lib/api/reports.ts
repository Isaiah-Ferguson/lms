import type {
  ProgressReportSummary,
  ProgressReportDetail,
  TriggerReportResponse,
  StudentOption,
} from "@/types";
import { downloadBlob, extractFileName } from "@/lib/utils";
import { ApiError, apiFetch } from "./core";

// ─── Reports API ─────────────────────────────────────────────────────────────

export const reportsApi = {
  getReports(token: string, cohortId?: string, weekOf?: string, reportType?: string): Promise<ProgressReportSummary[]> {
    const p = new URLSearchParams();
    if (cohortId) p.set("cohortId", cohortId);
    if (weekOf) p.set("weekOf", weekOf);
    if (reportType) p.set("reportType", reportType);
    const qs = p.toString() ? `?${p.toString()}` : "";
    return apiFetch<ProgressReportSummary[]>(`/api/reports${qs}`, {}, token);
  },

  getReport(id: string, token: string): Promise<ProgressReportDetail> {
    return apiFetch<ProgressReportDetail>(`/api/reports/${id}`, {}, token);
  },

  publishReport(id: string, token: string): Promise<void> {
    return apiFetch<void>(`/api/reports/${id}/publish`, { method: "PATCH" }, token);
  },

  getStudents(token: string, cohortId?: string): Promise<StudentOption[]> {
    const qs = cohortId ? `?cohortId=${cohortId}` : "";
    return apiFetch<StudentOption[]>(`/api/reports/students${qs}`, {}, token);
  },

  triggerWeeklyRun(token: string, cohortId?: string): Promise<TriggerReportResponse> {
    const qs = cohortId ? `?cohortId=${cohortId}` : "";
    return apiFetch<TriggerReportResponse>(`/api/reports/trigger${qs}`, { method: "POST" }, token);
  },

  triggerStudentReport(studentId: string, token: string, cohortId?: string): Promise<TriggerReportResponse> {
    const qs = cohortId ? `?cohortId=${cohortId}` : "";
    return apiFetch<TriggerReportResponse>(`/api/reports/trigger/student/${studentId}${qs}`, { method: "POST" }, token);
  },

  triggerClassReport(token: string, cohortId?: string): Promise<TriggerReportResponse> {
    const qs = cohortId ? `?cohortId=${cohortId}` : "";
    return apiFetch<TriggerReportResponse>(`/api/reports/trigger/class${qs}`, { method: "POST" }, token);
  },

  async downloadReport(id: string, _token: string): Promise<void> {
    const res = await fetch(`/api/proxy/api/reports/${id}/download`);
    if (!res.ok) throw new ApiError(res.status, "Download failed", "Could not download report.");
    const fileName = extractFileName(res.headers.get("Content-Disposition"), `report-${id}.docx`);
    downloadBlob(await res.blob(), fileName);
  },
};
