export type ProgressReportStatus = "Pending" | "Generating" | "Generated" | "Failed" | "Published";
export type ReportType = "StudentProgress" | "ClassSummary";

export interface ProgressReportSummary {
  id: string;
  studentId: string | null;
  studentName: string | null;
  reportType: ReportType;
  weekOf: string;
  status: ProgressReportStatus;
  model: string;
  generatedAt: string | null;
  failureReason: string | null;
}

export interface ProgressReportDetail extends ProgressReportSummary {
  content: string | null;
}

export interface TriggerReportResponse {
  jobId: string;
  message: string;
}

export interface StudentOption {
  id: string;
  name: string;
}
