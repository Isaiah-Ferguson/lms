// Types used by the home dashboard UI.
// The stub-data factories previously here have been removed — all data now
// comes from `homeApi.getDashboard` in @/lib/api-client.

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type EnrollmentsByYear = Record<string, string[]>;

export interface CourseLevel {
  id: string;
  yearId: string;
  key: "combine" | "level-1" | "level-2" | "level-3" | "level-4" | string;
  title: string;
  description: string;
  isArchived?: boolean;
}

export interface DashboardPermissions {
  canManageYears: boolean;
  canViewAllLevels: boolean;
  canViewEnrolledOnly: boolean;
}

export interface DashboardCurrentUser {
  id: string;
  name: string;
  role: "Student" | "Instructor" | "Admin";
}
