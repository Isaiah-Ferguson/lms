export type DashboardRole = "Student" | "Instructor" | "Admin";

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
  role: DashboardRole;
}

export interface DashboardHomeData {
  years: AcademicYear[];
  selectedYearId: string;
  levelsForSelectedYear: CourseLevel[];
  enrolledLevelIdsForSelectedYear: string[];
  user: DashboardCurrentUser;
  permissions: DashboardPermissions;
}

export interface CreateAcademicYearInput {
  label: string;
  startDate: string;
  endDate: string;
  setActive?: boolean;
}

const DEFAULT_YEARS: AcademicYear[] = [
  {
    id: "year-25-26",
    label: "25-26",
    startDate: "2025-08-15",
    endDate: "2026-06-15",
    isActive: true,
  },
  {
    id: "year-24-25",
    label: "24-25",
    startDate: "2024-08-15",
    endDate: "2025-06-15",
    isActive: false,
  },
];

const DEFAULT_LEVEL_CONFIG = [
  {
    key: "combine",
    title: "Combine",
    description: "Introduction to Programming and Game Development, with C# and Unity.",
  },
  {
    key: "level-1",
    title: "Level 1",
    description: "Foundations of web development: HTML, CSS, and JavaScript basics.",
  },
  {
    key: "level-2",
    title: "Level 2",
    description: "Back-end APIs, SQL, architecture, and deployment.",
  },
  {
    key: "level-3",
    title: "Level 3",
    description: "Next.js, TypeScript, and modern front-end design tools.",
  },
  {
    key: "level-4",
    title: "Level 4",
    description: "Capstone delivery, leadership, and career readiness.",
  },
] as const;

const STUB_ENROLLMENTS_BY_ROLE: Record<DashboardRole, Record<string, string[]>> = {
  Student: {
    "year-25-26": ["year-25-26-level-1", "year-25-26-level-2"],
    "year-24-25": ["year-24-25-level-1"],
  },
  Instructor: {
    "year-25-26": ["year-25-26-combine", "year-25-26-level-1", "year-25-26-level-2"],
    "year-24-25": ["year-24-25-level-1", "year-24-25-level-2"],
  },
  Admin: {},
};

export function getStubEnrollmentsByYear(role: DashboardRole): EnrollmentsByYear {
  const source = STUB_ENROLLMENTS_BY_ROLE[role] ?? {};
  return Object.fromEntries(
    Object.entries(source).map(([yearId, levelIds]) => [yearId, [...levelIds]])
  );
}

export function getStubDashboardUser(): DashboardCurrentUser {
  const fromEnv = process.env.NEXT_PUBLIC_STUB_USER_ROLE;
  const role: DashboardRole =
    fromEnv === "Admin" || fromEnv === "Instructor" || fromEnv === "Student"
      ? fromEnv
      : "Student";

  return {
    id: "user-current",
    name: role === "Admin" ? "Admin User" : role === "Instructor" ? "Instructor User" : "Student User",
    role,
  };
}

export function buildDefaultLevelsForYear(year: AcademicYear): CourseLevel[] {
  return DEFAULT_LEVEL_CONFIG.map((config) => ({
    id: `${year.id}-${config.key}`,
    yearId: year.id,
    key: config.key,
    title: config.title,
    description: config.description,
    isArchived: !year.isActive,
  }));
}

export function createAcademicYearWithLevels(
  input: CreateAcademicYearInput
): { year: AcademicYear; levels: CourseLevel[] } {
  const normalizedLabel = input.label.trim();
  const yearId = `year-${normalizedLabel.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;

  const year: AcademicYear = {
    id: yearId,
    label: normalizedLabel,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: input.setActive ?? true,
  };

  return {
    year,
    levels: buildDefaultLevelsForYear(year),
  };
}

export function getDashboardHomeData(
  currentUser: DashboardCurrentUser,
  options?: { selectedYearId?: string }
): DashboardHomeData {
  const permissions: DashboardPermissions = {
    canManageYears: currentUser.role === "Admin",
    canViewAllLevels: currentUser.role === "Admin",
    canViewEnrolledOnly: currentUser.role !== "Admin",
  };

  const allYears = [...DEFAULT_YEARS];
  const allLevels = allYears.flatMap(buildDefaultLevelsForYear);

  const roleEnrollments = getStubEnrollmentsByYear(currentUser.role);
  const visibleYears =
    permissions.canViewAllLevels
      ? allYears
      : allYears.filter((year) => (roleEnrollments[year.id] ?? []).length > 0);

  const activeVisibleYear =
    visibleYears.find((year) => year.isActive) ?? visibleYears[0] ?? allYears[0];

  const selectedFromQuery = options?.selectedYearId
    ? visibleYears.find(
        (year) => year.id === options.selectedYearId || year.label === options.selectedYearId
      )?.id
    : undefined;

  const selectedYearId =
    selectedFromQuery
      ? selectedFromQuery
      : activeVisibleYear.id;

  const levelsForSelectedYear = allLevels.filter((level) => level.yearId === selectedYearId);
  const enrolledLevelIdsForSelectedYear = roleEnrollments[selectedYearId] ?? [];

  return {
    years: visibleYears,
    selectedYearId,
    levelsForSelectedYear,
    enrolledLevelIdsForSelectedYear,
    user: currentUser,
    permissions,
  };
}
