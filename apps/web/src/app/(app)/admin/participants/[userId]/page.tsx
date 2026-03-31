import { notFound } from "next/navigation";
import { ProfileViewClient } from "@/components/profile/ProfileViewClient";
import { getUserProfileDataForAdmin } from "@/lib/profile-data";

interface AdminParticipantProfilePageProps {
  params: {
    userId: string;
  };
}

export default async function AdminParticipantProfilePage({ params }: AdminParticipantProfilePageProps) {
  const data = await getUserProfileDataForAdmin(params.userId);

  if (!data) {
    notFound();
  }

  return (
    <ProfileViewClient
      initialData={data}
      title={`Profile · ${data.user.name}`}
      subtitle="Admin view for profile details, enrollment, grades, and account notes."
      isAdminViewingAnotherUser
    />
  );
}
