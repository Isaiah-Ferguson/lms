import type {
  AvatarUploadSlotResponse,
  ProfileUserResponse,
  ProfileData,
} from "@/types";
import { apiFetch } from "./core";

// ─── Profile API ──────────────────────────────────────────────────────────────

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
    body: { name: string; town: string; phoneNumber: string; gitHubUsername: string; avatarBlobPath?: string | null; email?: string },
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
