// Barrel module: the API client now lives in src/lib/api/*, split by domain.
// This file only re-exports so the ~55 existing import sites keep working.

// Re-export all types from @/types so callers can import them either from
// "@/types" or from "@/lib/api-client" — whichever reads best at the call site.
export type * from "@/types";

export { ApiError } from "@/lib/api/core";
export { authApi, type LoginResult } from "@/lib/api/auth";
export { submissionsApi } from "@/lib/api/submissions";
export { uploadFileToBlobSas } from "@/lib/api/blob-upload";
export { instructorApi } from "@/lib/api/instructor";
export { lessonsApi } from "@/lib/api/lessons";
export { gradesApi } from "@/lib/api/grades";
export { adminParticipantsApi } from "@/lib/api/admin";
export { profileApi } from "@/lib/api/profile";
export { homeApi } from "@/lib/api/home";
export { courseApi } from "@/lib/api/courses";
export { assignmentsApi } from "@/lib/api/assignments";
export { commentsApi } from "@/lib/api/comments";
export { reportsApi } from "@/lib/api/reports";
export { transcriptApi } from "@/lib/api/transcript";
export { attendanceApi } from "@/lib/api/attendance";
