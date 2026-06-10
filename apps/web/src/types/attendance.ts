export type AttendanceCode = "P" | "L" | "E" | "U" | "Z";

export type AttendanceSessionType = "InPerson" | "Remote";

export interface AttendanceDay {
  date: string;        // ISO yyyy-MM-dd
  dayOfWeek: string;   // Mon, Tue, ...
  sessionType: AttendanceSessionType;
}

export interface AttendanceCell {
  date: string;        // ISO yyyy-MM-dd
  status: AttendanceCode;
}

export interface AttendanceStudentRow {
  studentId: string;
  name: string;
  marks: AttendanceCell[];
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  unexcusedCount: number;
  zoomCount: number;
}

export interface AttendanceGrid {
  courseId: string;
  courseTitle: string;
  year: number;
  month: number;
  days: AttendanceDay[];
  students: AttendanceStudentRow[];
}

export interface AttendanceMark {
  studentId: string;
  date: string;            // ISO yyyy-MM-dd
  status: AttendanceCode | null;  // null clears the mark
  note?: string | null;
}

export interface SaveAttendanceRequest {
  courseId: string;
  marks: AttendanceMark[];
}
