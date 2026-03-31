export interface HomeDashboardResponse {
  years: Array<{
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>;
  levels: Array<{
    id: string;
    yearId: string;
    key: string;
    title: string;
    description: string;
    isArchived: boolean;
  }>;
  enrollmentsByYear: Record<string, string[]>;
  user: {
    id: string;
    name: string;
    role: "Student" | "Instructor" | "Admin";
  };
  permissions: {
    canManageYears: boolean;
    canViewAllLevels: boolean;
    canViewEnrolledOnly: boolean;
  };
}
