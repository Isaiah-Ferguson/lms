import type { HomeDashboardResponse } from "@/types";
import { apiFetch } from "./core";

// ─── Home Dashboard API ───────────────────────────────────────────────────────

export const homeApi = {
  getDashboard(token: string): Promise<HomeDashboardResponse> {
    return apiFetch<HomeDashboardResponse>("/api/home/dashboard", {}, token);
  },

  createYear(
    body: { label: string; startDate: string; endDate: string; setActive: boolean },
    token: string
  ): Promise<HomeDashboardResponse["years"][number]> {
    return apiFetch<HomeDashboardResponse["years"][number]>(
      "/api/home/years",
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  setActiveYear(
    yearId: string,
    token: string
  ): Promise<HomeDashboardResponse["years"][number]> {
    return apiFetch<HomeDashboardResponse["years"][number]>(
      `/api/home/years/${yearId}/set-active`,
      { method: "POST" },
      token
    );
  },

  updateLevelDescription(
    courseId: string,
    description: string,
    token: string
  ): Promise<HomeDashboardResponse["levels"][number]> {
    return apiFetch<HomeDashboardResponse["levels"][number]>(
      `/api/home/levels/${courseId}/description`,
      { method: "POST", body: JSON.stringify({ Description: description }) },
      token
    );
  },
};
