// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole   = "Student" | "Instructor" | "Admin";
export type UserStatus = "Active" | "Disabled";

export interface ParticipantUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  town: string;
  role: UserRole;
  status: UserStatus;
  enrollments: string[]; // course ids
  lastLoginAt: string | null; // ISO
  avatarInitials: string;
  avatarUrl: string | null;
}

export interface CourseOption {
  id: string;
  label: string;
  yearId: string;
  yearLabel: string;
}

export interface AdminParticipantsData {
  users: ParticipantUser[];
  courses: CourseOption[];
  permissions: {
    canManageUsers: boolean;
  };
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

export function getAdminParticipantsData(): AdminParticipantsData {
  return {
    permissions: {
      canManageUsers: true,
    },

    courses: [
      { id: "combine", label: "Combine", yearId: "stub-year", yearLabel: "Stub Year" },
      { id: "level-1", label: "Level 1", yearId: "stub-year", yearLabel: "Stub Year" },
      { id: "level-2", label: "Level 2", yearId: "stub-year", yearLabel: "Stub Year" },
      { id: "level-3", label: "Level 3", yearId: "stub-year", yearLabel: "Stub Year" },
      { id: "level-4", label: "Level 4", yearId: "stub-year", yearLabel: "Stub Year" },
    ],

    users: [
      {
        id: "u-1",
        firstName: "Isaiah",
        lastName: "Ferguson",
        username: "isaiah.f",
        email: "isaiah@email.com",
        town: "Atlanta",
        role: "Admin",
        status: "Active",
        enrollments: ["combine", "level-1"],
        lastLoginAt: "2026-02-21T10:30:00Z",
        avatarInitials: "IF",
        avatarUrl: null,
      },
      {
        id: "u-2",
        firstName: "Aaliyah",
        lastName: "Brooks",
        username: "aaliyah.b",
        email: "aaliyah@email.com",
        town: "Houston",
        role: "Student",
        status: "Active",
        enrollments: ["level-1"],
        lastLoginAt: "2026-02-20T14:15:00Z",
        avatarInitials: "AB",
        avatarUrl: null,
      },
      {
        id: "u-3",
        firstName: "Marcus",
        lastName: "Thompson",
        username: "marcus.t",
        email: "marcus@email.com",
        town: "Chicago",
        role: "Instructor",
        status: "Active",
        enrollments: ["level-1", "level-2"],
        lastLoginAt: "2026-02-19T09:00:00Z",
        avatarInitials: "MT",
        avatarUrl: null,
      },
      {
        id: "u-4",
        firstName: "Priya",
        lastName: "Nair",
        username: "priya.n",
        email: "priya@email.com",
        town: "Dallas",
        role: "Student",
        status: "Active",
        enrollments: ["combine"],
        lastLoginAt: "2026-02-18T16:45:00Z",
        avatarInitials: "PN",
        avatarUrl: null,
      },
      {
        id: "u-5",
        firstName: "Jordan",
        lastName: "Williams",
        username: "jordan.w",
        email: "jordan@email.com",
        town: "Miami",
        role: "Student",
        status: "Disabled",
        enrollments: [],
        lastLoginAt: "2026-01-10T11:00:00Z",
        avatarInitials: "JW",
        avatarUrl: null,
      },
      {
        id: "u-6",
        firstName: "Sofia",
        lastName: "Martinez",
        username: "sofia.m",
        email: "sofia@email.com",
        town: "Phoenix",
        role: "Student",
        status: "Active",
        enrollments: ["level-1", "level-2", "level-3"],
        lastLoginAt: "2026-02-21T08:00:00Z",
        avatarInitials: "SM",
        avatarUrl: null,
      },
      {
        id: "u-7",
        firstName: "Devon",
        lastName: "Carter",
        username: "devon.c",
        email: "devon@email.com",
        town: "Seattle",
        role: "Student",
        status: "Active",
        enrollments: ["level-2"],
        lastLoginAt: null,
        avatarInitials: "DC",
        avatarUrl: null,
      },
      {
        id: "u-8",
        firstName: "Naomi",
        lastName: "Osei",
        username: "naomi.o",
        email: "naomi@email.com",
        town: "New York",
        role: "Admin",
        status: "Active",
        enrollments: ["combine", "level-1", "level-2", "level-3", "level-4"],
        lastLoginAt: "2026-02-20T17:30:00Z",
        avatarInitials: "NO",
        avatarUrl: null,
      },
    ],
  };
}
