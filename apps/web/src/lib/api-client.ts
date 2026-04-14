import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  CreateUserRequest,
  ChangePasswordRequest,
  SubmissionType,
  SubmissionStatus,
  FileMeta,
  FileUploadSlot,
  UploadUrlResponse,
  CompletedFile,
  SubmissionResponse,
  ArtifactItem,
  ArtifactListResponse,
  StudentInfo,
  AssignmentInfo,
  ArtifactInfo,
  GitHubInfo,
  ExistingGrade,
  SubmissionDetail,
  GradeSubmissionRequest,
  SubmissionQueuePage,
  SubmissionQueueItem,
  StudentGradeRow,
  StudentGrades,
  AdminStudentGrade,
  AdminGrades,
  AssignmentSubmissionsRosterResponse,
  ProfileUserResponse,
  Enrollment,
  ProfileData,
  AvatarUploadSlotResponse,
  PreviousNoteExportItem,
  AdminParticipantUser,
  AdminParticipantsResponse,
  HomeDashboardResponse,
  CourseDetailResponse,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  Assignment,
  AssignmentListItem,
  StudentSubmissionStatus,
  LessonArtifact,
  LessonResponse,
  CreateLessonRequest,
  UpdateLessonRequest,
  Comment,
} from "@/types";

export type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  CreateUserRequest,
  ChangePasswordRequest,
  SubmissionType,
  SubmissionStatus,
  FileMeta,
  FileUploadSlot,
  UploadUrlResponse,
  CompletedFile,
  SubmissionResponse,
  ArtifactItem,
  ArtifactListResponse,
  StudentInfo,
  AssignmentInfo,
  ArtifactInfo,
  GitHubInfo,
  ExistingGrade,
  SubmissionDetail,
  GradeSubmissionRequest,
  SubmissionQueuePage,
  SubmissionQueueItem,
  StudentGradeRow,
  StudentGrades,
  AdminStudentGrade,
  AdminGrades,
  AssignmentSubmissionsRosterResponse,
  ProfileUserResponse,
  Enrollment,
  ProfileData,
  AvatarUploadSlotResponse,
  PreviousNoteExportItem,
  AdminParticipantUser,
  AdminParticipantsResponse,
  HomeDashboardResponse,
  CourseDetailResponse,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  Assignment,
  AssignmentListItem,
  StudentSubmissionStatus,
  LessonArtifact,
  LessonResponse,
  CreateLessonRequest,
  UpdateLessonRequest,
  Comment,
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public errors?: string[]
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: { title?: string; detail?: string; errors?: string[] } = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      res.status,
      body.title ?? "Error",
      body.detail ?? res.statusText,
      body.errors
    );
  }

  if (res.status === 204 || res.status === 200) {
    // Check if response has content
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
  return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login(body: LoginRequest): Promise<AuthTokens> {
    return apiFetch<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  register(body: RegisterRequest): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  createUser(body: CreateUserRequest, token: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/users", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  changePassword(body: ChangePasswordRequest, token: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

// ─── Submissions API ──────────────────────────────────────────────────────────

export const submissionsApi = {
  requestUpload(
    courseAssignmentId: string,
    files: FileMeta[],
    token: string,
    figmaUrl?: string | null,
    githubRepoUrl?: string | null,
    hostedUrl?: string | null,
    note?: string | null
  ): Promise<UploadUrlResponse> {
    return apiFetch<UploadUrlResponse>(
      `/api/submissions/${courseAssignmentId}/request-upload`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "Upload",
          files,
          figmaUrl: figmaUrl || null,
          githubRepoUrl: githubRepoUrl || null,
          hostedUrl: hostedUrl || null,
          note: note || null
        }),
      },
      token
    );
  },

  completeUpload(
    submissionId: string,
    files: CompletedFile[],
    token: string
  ): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${submissionId}/complete-upload`,
      {
        method: "POST",
        body: JSON.stringify({ files }),
      },
      token
    );
  },

  getStatus(submissionId: string, token: string): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${submissionId}/status`,
      {},
      token
    );
  },

  getArtifacts(submissionId: string, token: string): Promise<ArtifactListResponse> {
    return apiFetch<ArtifactListResponse>(
      `/api/submissions/${submissionId}/artifacts`,
      {},
      token
    );
  },

  githubSubmit(
    courseAssignmentId: string,
    payload: { repoUrl: string; branch: string; commitHash: string },
    token: string
  ): Promise<SubmissionResponse> {
    return apiFetch<SubmissionResponse>(
      `/api/submissions/${courseAssignmentId}/github-submit`,
      {
        method: "POST",
        body: JSON.stringify({ type: "GitHub", ...payload }),
      },
      token
    );
  },
};

// ─── Azure Blob direct upload ─────────────────────────────────────────────────

export async function uploadFileToBlobSas(
  sasUrl: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Blob upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during blob upload"))
    );

    xhr.open("PUT", sasUrl);
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

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

// ─── Lessons API ──────────────────────────────────────────────────────────────

export const lessonsApi = {
  createLesson(
    body: CreateLessonRequest,
    token: string
  ): Promise<LessonResponse> {
    return apiFetch<LessonResponse>(
      "/api/lessons",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  updateLesson(
    lessonId: string,
    body: UpdateLessonRequest,
    token: string
  ): Promise<LessonResponse> {
    return apiFetch<LessonResponse>(
      `/api/lessons/${lessonId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
  },

  deleteLesson(
    lessonId: string,
    token: string
  ): Promise<void> {
    return apiFetch<void>(
      `/api/lessons/${lessonId}`,
      {
        method: "DELETE",
      },
      token
    );
  },

  async uploadArtifact(
    lessonId: string,
    file: File,
    token: string
  ): Promise<LessonArtifact> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/lessons/${lessonId}/artifacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to upload artifact");
    }

    return response.json();
  },

  deleteArtifact(
    artifactId: string,
    token: string
  ): Promise<void> {
    return apiFetch<void>(
      `/api/lessons/artifacts/${artifactId}`,
      {
        method: "DELETE",
      },
      token
    );
  },

  getModuleLessons(
    moduleId: string,
    token: string
  ): Promise<LessonResponse[]> {
    return apiFetch<LessonResponse[]>(
      `/api/lessons?moduleId=${moduleId}`,
      {},
      token
    );
  },
};

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

// ─── Admin Participants API ───────────────────────────────────────────────────

export const adminParticipantsApi = {
  getParticipants(token: string): Promise<AdminParticipantsResponse> {
    return apiFetch<AdminParticipantsResponse>("/api/admin/participants", {}, token);
  },

  enrollUsers(body: { userIds: string[]; courseIds: string[] }, token: string): Promise<void> {
    return apiFetch<void>(
      "/api/admin/participants/enrollments",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  toggleUserActive(userId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/admin/participants/${userId}/toggle-active`,
      {
        method: "PATCH",
      },
      token
    );
  },

  toggleUserAdmin(userId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/admin/participants/${userId}/toggle-admin`,
      {
        method: "PATCH",
      },
      token
    );
  },

  saveAdminNote(userId: string, text: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/profile/admin/participants/${userId}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      token
    );
  },

  setProbationStatus(userId: string, isOnProbation: boolean, reason: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/profile/admin/participants/${userId}/probation`,
      {
        method: "POST",
        body: JSON.stringify({ isOnProbation, reason }),
      },
      token
    );
  },

  async exportPreviousNotesDocx(
    userId: string,
    body: { userName: string; previousNotes: PreviousNoteExportItem[] },
    token: string
  ): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(`${API_BASE}/api/admin/participants/${userId}/notes/export-docx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorBody: { title?: string; detail?: string; errors?: string[] } = {};
      try {
        errorBody = await res.json();
      } catch {
        // ignore parse errors
      }

      throw new ApiError(
        res.status,
        errorBody.title ?? "Error",
        errorBody.detail ?? res.statusText,
        errorBody.errors
      );
    }

    const disposition = res.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const fileName = match?.[1] ?? `previous-admin-notes-${new Date().toISOString().slice(0, 10)}.docx`;

    return {
      blob: await res.blob(),
      fileName,
    };
  },
};

export const profileApi = {
  generateAvatarUploadSlot(
    userId: string,
    body: { fileName: string; contentType: string; sizeBytes: number },
    token: string
  ): Promise<AvatarUploadSlotResponse> {
    return apiFetch<AvatarUploadSlotResponse>(
      `/api/profile/users/${userId}/avatar-upload-slot`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  updateProfile(
    userId: string,
    body: { name: string; town: string; phoneNumber: string; gitHubUsername: string; avatarBlobPath?: string | null },
    token: string
  ): Promise<ProfileUserResponse> {
    return apiFetch<ProfileUserResponse>(
      `/api/profile/users/${userId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
  },

  updatePreferences(
    body: { emailNotificationsEnabled: boolean; darkModeEnabled: boolean },
    token: string
  ): Promise<{ emailNotificationsEnabled: boolean; darkModeEnabled: boolean }> {
    return apiFetch<{ emailNotificationsEnabled: boolean; darkModeEnabled: boolean }>(
      `/api/profile/preferences`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
  },

  getMyProfile(token: string): Promise<ProfileData> {
    return apiFetch<ProfileData>("/api/profile/me", {}, token);
  },
};

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
};

export const courseApi = {
  getCourseDetail(courseId: string, token: string): Promise<CourseDetailResponse> {
    return apiFetch<CourseDetailResponse>(`/api/courses/${courseId}`, {}, token);
  },

  createWeek(
    courseId: string,
    body: { weekNumber: number; title: string; dateRange: string; zoomUrl: string; topics: string[] },
    token: string
  ): Promise<CourseDetailResponse["weeks"][number]> {
    return apiFetch<CourseDetailResponse["weeks"][number]>(
      `/api/courses/${courseId}/weeks`,
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  updateWeek(
    courseId: string,
    weekId: string,
    body: { title: string; dateRange: string; zoomUrl: string; topics: string[] },
    token: string
  ): Promise<CourseDetailResponse["weeks"][number]> {
    return apiFetch<CourseDetailResponse["weeks"][number]>(
      `/api/courses/${courseId}/weeks/${weekId}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token
    );
  },

  createAnnouncement(
    courseId: string,
    body: { title: string; body: string; tag: string | null; announcedAt: string },
    token: string
  ): Promise<CourseDetailResponse["announcements"][number]> {
    return apiFetch<CourseDetailResponse["announcements"][number]>(
      `/api/courses/${courseId}/announcements`,
      { method: "POST", body: JSON.stringify(body) },
      token
    );
  },

  updateAnnouncement(
    courseId: string,
    announcementId: string,
    body: { title: string; body: string; tag: string | null; announcedAt: string },
    token: string
  ): Promise<CourseDetailResponse["announcements"][number]> {
    return apiFetch<CourseDetailResponse["announcements"][number]>(
      `/api/courses/${courseId}/announcements/${announcementId}`,
      { method: "PUT", body: JSON.stringify(body) },
      token
    );
  },

  deleteAnnouncement(courseId: string, announcementId: string, token: string): Promise<void> {
    return apiFetch<void>(
      `/api/courses/${courseId}/announcements/${announcementId}`,
      { method: "DELETE" },
      token
    );
  },
};

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

// ─── Comments API ─────────────────────────────────────────────────────────────

export const commentsApi = {
  getComments: (assignmentId: string, token: string): Promise<Comment[]> =>
    apiFetch<Comment[]>(`/api/assignments/${assignmentId}/comments`, {}, token),

  addComment: (assignmentId: string, message: string, token: string): Promise<Comment> =>
    apiFetch<Comment>(`/api/assignments/${assignmentId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }, token),
};

export { ApiError };
