// Types used by admin participant UI components.
// The mock-data factory previously here has been removed — all consumers now
// fetch real data through `adminParticipantsApi` in @/lib/api-client.

export type UserRole = "Student" | "Instructor" | "Admin";
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
