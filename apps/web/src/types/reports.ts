export type ProgressReportStatus = "Pending" | "Generating" | "Generated" | "Failed" | "Published";

export interface ProgressReportSummary {
  id: string;
  studentId: string;
  studentName: string;
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
