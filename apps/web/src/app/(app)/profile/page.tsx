import { redirect } from "next/navigation";
import { ProfileViewClient } from "@/components/profile/ProfileViewClient";
import { getMyProfileData } from "@/lib/profile-data";

export default async function ProfilePage() {
  const data = await getMyProfileData();
  if (!data) {
    redirect("/login");
  }

  return (
    <ProfileViewClient
      initialData={data}
      title="My Profile"
      subtitle="Review your grades, manage profile details, and track account activity."
    />
  );
}
