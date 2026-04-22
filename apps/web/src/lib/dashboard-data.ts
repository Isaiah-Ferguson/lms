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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

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
  const enrolledLevelIds = activeYear ? (data.enrollmentsByYear[activeYear.id] ?? []) : [];
  const enrolledLevels = data.levels.filter(level => enrolledLevelIds.includes(level.id));

  // Build navigation based on enrollments
  const nav: NavItem[] = [];

  // Get all levels for the active year (not just enrolled ones for admins)
  const activeLevels = data.levels.filter(level => level.yearId === activeYear?.id);

  // Add Combine if enrolled or admin
  const combineLevel = activeLevels.find(l => l.key === "combine");
  if (combineLevel && (enrolledLevelIds.includes(combineLevel.id) || data.permissions.canViewAllLevels)) {
    nav.push({ label: "Combine", href: `/courses/${combineLevel.id}`, icon: "grid" });
  }

  // Add Level 1-4 if enrolled or admin
  for (let i = 1; i <= 4; i++) {
    const levelKey = `level-${i}`;
    const level = activeLevels.find(l => l.key === levelKey);
    if (level && (enrolledLevelIds.includes(level.id) || data.permissions.canViewAllLevels)) {
      nav.push({ label: `Level ${i}`, href: `/courses/${level.id}`, icon: i.toString() });
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
    nav.push({ label: "Admin Grades", href: "/admin/grades", icon: "admingrades" });
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
