export interface AdminParticipantUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  town: string;
  role: "Student" | "Instructor" | "Admin";
  status: "Active" | "Disabled";
  enrollments: string[];
  lastLoginAt: string | null;
  avatarInitials: string;
}

export interface AdminParticipantsResponse {
  users: AdminParticipantUser[];
  courses: Array<{ id: string; label: string; yearId: string; yearLabel: string }>;
  permissions: {
    canManageUsers: boolean;
  };
}
