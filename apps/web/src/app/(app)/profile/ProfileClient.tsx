"use client";

import type { ProfileData } from "@/lib/profile-data";
import { ProfileViewClient } from "@/components/profile/ProfileViewClient";

export function ProfileClient({ data }: { data: ProfileData }) {
  return (
    <ProfileViewClient
      initialData={data}
      title="My Profile"
      subtitle="Review your grades, manage profile details, and track account activity."
    />
  );
}
