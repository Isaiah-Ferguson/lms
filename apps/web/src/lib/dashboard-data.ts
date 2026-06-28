import { API_BASE } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji / lucide name — resolved in the Sidebar component
}

export interface UserInfo {
  name: string;
  avatarUrl: string | null; // null → show initials fallback
  isOnProbation?: boolean;
  role: string;
}

export interface DashboardData {
  nav: NavItem[];
  currentLevel: number; // 1–4 based on enrolment year
  user: UserInfo;
}

// ─── API-based data ───────────────────────────────────────────────────────────

export async function getDashboardDataFromApi(token: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/api/home/dashboard`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.status}`);
  }

  const data = await response.json() as {
    years: Array<{ id: string; label: string; startDate: string; endDate: string; isActive: boolean }>;
    levels: Array<{ id: string; yearId: string; key: string; title: string; description: string; isArchived: boolean }>;
    enrollmentsByYear: Record<string, string[]>;
    user: { id: string; name: string; role: string; avatarUrl: string | null; isOnProbation: boolean };
    permissions: { canManageYears: boolean; canViewAllLevels: boolean; canViewEnrolledOnly: boolean };
  };

  const activeYear = data.years.find(y => y.isActive) ?? data.years[0];

  // All levels the user is enrolled in, across every year (used for the "current level" badge)
  const allEnrolledLevelIds = Object.values(data.enrollmentsByYear).flat();
  const enrolledLevels = data.levels.filter(level => allEnrolledLevelIds.includes(level.id));

  // Build navigation based on enrollments
  const nav: NavItem[] = [];

  // Pushes Combine + Level 1-4 nav items for a single year's levels.
  // A level is shown if the user is enrolled in it, or if they can view all levels (admin/instructor).
  const pushLevelNav = (
    yearLevels: typeof data.levels,
    enrolledLevelIds: string[],
    yearSuffix: string,
  ) => {
    const canViewAll = data.permissions.canViewAllLevels;

    const combineLevel = yearLevels.find(l => l.key === "combine");
    if (combineLevel && (enrolledLevelIds.includes(combineLevel.id) || canViewAll)) {
      nav.push({ label: `Combine${yearSuffix}`, href: `/courses/${combineLevel.id}`, icon: "grid" });
    }

    for (let i = 1; i <= 4; i++) {
      const level = yearLevels.find(l => l.key === `level-${i}`);
      if (level && (enrolledLevelIds.includes(level.id) || canViewAll)) {
        nav.push({ label: `Level ${i}${yearSuffix}`, href: `/courses/${level.id}`, icon: i.toString() });
      }
    }
  };

  if (data.permissions.canViewAllLevels) {
    // Admins/instructors: show all levels for the active year (they switch years elsewhere)
    const activeLevels = data.levels.filter(level => level.yearId === activeYear?.id);
    pushLevelNav(activeLevels, [], "");
  } else {
    // Students: show enrolled levels across ALL years they're enrolled in (newest first),
    // mirroring the dashboard. Previously the sidebar only looked at the active year, so
    // students enrolled in a non-active year saw nothing here.
    const enrolledYears = data.years
      .filter(y => (data.enrollmentsByYear[y.id] ?? []).length > 0)
      .sort((a, b) => b.label.localeCompare(a.label));

    const multipleYears = enrolledYears.length > 1;
    for (const year of enrolledYears) {
      const yearLevels = data.levels.filter(level => level.yearId === year.id);
      const enrolledLevelIds = data.enrollmentsByYear[year.id] ?? [];
      // Disambiguate "Level 1" across years only when more than one year is enrolled
      pushLevelNav(yearLevels, enrolledLevelIds, multipleYears ? ` (${year.label})` : "");
    }
  }

  // Always show Calendar
  nav.push({ label: "Calendar", href: "/calendar", icon: "calendar" });

  // Show Grades only for non-admins (students and instructors)
  if (!data.permissions.canManageYears) {
    nav.push({ label: "Grades", href: "/grades", icon: "grades" });
  }

  // Admin/Instructor navigation
  if (data.permissions.canManageYears || data.permissions.canViewAllLevels) {
    nav.push({ label: "Submissions", href: "/instructor/submissions", icon: "clipboard" });
  }

  // Admin-only navigation
  if (data.permissions.canManageYears) {
    nav.push({ label: "Participants", href: "/admin/participants", icon: "users" });
    nav.push({ label: "Attendance", href: "/admin/attendance", icon: "attendance" });
    nav.push({ label: "Admin Grades", href: "/admin/grades", icon: "admingrades" });
    nav.push({ label: "Reports", href: "/admin/reports", icon: "reports" });
  }

  // Determine current level (for "You" badge)
  const currentLevel = enrolledLevels.find(l => l.key.startsWith("level-"))
    ? parseInt(enrolledLevels.find(l => l.key.startsWith("level-"))!.key.split("-")[1])
    : 1;

  const user: UserInfo = {
    name: data.user.name,
    avatarUrl: data.user.avatarUrl,
    isOnProbation: data.user.isOnProbation ?? false,
    role: data.user.role,
  };

  return { nav, currentLevel, user };
}
