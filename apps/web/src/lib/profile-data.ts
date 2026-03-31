import { cookies } from "next/headers";

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  town: string;
  phoneNumber: string;
  gitHubUsername: string;
  avatarUrl: string | null;
  isOnProbation: boolean;
  probationReason: string;
}

export interface CourseGrade {
  courseId: string;
  courseName: string;
  percent: number;
  letterGrade: string;
  gradedCount: number;
  totalCount: number;
}

export interface GradesOverview {
  overallPercent: number;
  gradedCount: number;
  totalCount: number;
  lastGradedAt: string;
  courseGrades: CourseGrade[];
}

export interface Enrollment {
  courseId: string;
  title: string;
  status: "Active" | "Completed" | "Upcoming";
}

export interface LoginActivity {
  firstSiteAccessAt: string;
  lastSiteAccessAt: string;
}

export interface UserPreferences {
  emailNotificationsEnabled: boolean;
  darkModeEnabled: boolean;
}

export interface AdminNotes {
  text: string;
  updatedAt: string;
  updatedBy: string;
  previousNotes: Array<{
    text: string;
    updatedAt: string;
    updatedBy: string;
  }>;
}

export interface ProfilePermissions {
  canEditProfile: boolean;
  canViewAdminNotes: boolean;
  canEditAdminNotes: boolean;
}

export interface ProfileData {
  user: ProfileUser;
  gradesOverview: GradesOverview;
  enrollments: Enrollment[];
  loginActivity: LoginActivity;
  preferences: UserPreferences;
  adminNotes?: AdminNotes;
  permissions: ProfilePermissions;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function fetchProfile(path: string): Promise<ProfileData | null> {
  const token = (await cookies()).get("cslms_token")?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load profile data (${response.status}).`);
  }

  return response.json() as Promise<ProfileData>;
}

export async function getMyProfileData(): Promise<ProfileData | null> {
  return fetchProfile("/api/profile/me");
}

export async function getUserProfileDataForAdmin(userId: string): Promise<ProfileData | null> {
  return fetchProfile(`/api/profile/admin/participants/${userId}`);
}
