"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { GradesSummaryCard } from "@/components/profile/GradesSummaryCard";
import { EditProfileCard } from "@/components/profile/EditProfileCard";
import { EnrollmentList } from "@/components/profile/EnrollmentList";
import { LoginActivityCard } from "@/components/profile/LoginActivityCard";
import { AdminNotesCard } from "@/components/profile/AdminNotesCard";
import { ProbationToggleCard } from "@/components/profile/ProbationToggleCard";
import { PreferencesCard } from "@/components/profile/PreferencesCard";
import { ProbationBanner } from "@/components/profile/ProbationBanner";
import { profileApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { ProfileData } from "@/lib/profile-data";

interface ProfileViewClientProps {
  initialData: ProfileData;
  title?: string;
  subtitle?: string;
  isAdminViewingAnotherUser?: boolean;
}

export function ProfileViewClient({
  initialData,
  title = "Profile",
  subtitle = "Manage account details, enrollments, and activity.",
  isAdminViewingAnotherUser = false,
}: ProfileViewClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData>(initialData);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {isAdminViewingAnotherUser && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Viewing as Admin
          </span>
        )}
      </header>

      {data.user.isOnProbation && (
        <ProbationBanner reason={data.user.probationReason} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GradesSummaryCard 
            gradesOverview={data.gradesOverview} 
            gradesHref={isAdminViewingAnotherUser ? `/admin/participants/${data.user.id}/grades` : "/grades"} 
          />

          <EditProfileCard
            user={data.user}
            canEditProfile={data.permissions.canEditProfile}
            onSave={async (updated) => {
              const token = getToken();
              if (!token) {
                throw new Error("You must be signed in to update your profile.");
              }

              const saved = await profileApi.updateProfile(
                data.user.id,
                {
                  name: updated.name,
                  town: updated.town,
                  phoneNumber: updated.phoneNumber,
                  gitHubUsername: updated.gitHubUsername,
                  avatarBlobPath: updated.avatarBlobPath,
                },
                token
              );

              setData((prev) => ({
                ...prev,
                user: {
                  ...prev.user,
                  name: saved.name,
                  town: saved.town,
                  phoneNumber: saved.phoneNumber,
                  gitHubUsername: saved.gitHubUsername,
                  avatarUrl: saved.avatarUrl,
                },
              }));
              
              // Refresh the page to update navbar avatar
              router.refresh();
            }}
          />
        </div>

        <div className="space-y-6">
          {isAdminViewingAnotherUser && (
            <ProbationToggleCard
              userId={data.user.id}
              initialIsOnProbation={data.user.isOnProbation}
              initialReason={data.user.probationReason}
              onSave={(isOnProbation, reason) => {
                const noteText = isOnProbation
                  ? `[Academic Probation] Status set to ON. Reason: ${reason || "(none provided)"}`
                  : "[Academic Probation] Status removed.";
                setData((prev) => ({
                  ...prev,
                  user: { ...prev.user, isOnProbation, probationReason: reason },
                  adminNotes: prev.adminNotes
                    ? {
                        ...prev.adminNotes,
                        previousNotes: [
                          { text: noteText, updatedAt: new Date().toISOString(), updatedBy: "You" },
                          ...prev.adminNotes.previousNotes,
                        ],
                      }
                    : prev.adminNotes,
                }));
              }}
            />
          )}

          {data.permissions.canViewAdminNotes && data.adminNotes && (
            <AdminNotesCard
              userId={data.user.id}
              userName={data.user.name}
              adminNotes={data.adminNotes}
              canEditAdminNotes={data.permissions.canEditAdminNotes}
              onSave={(text) => {
                setData((prev) => ({
                  ...prev,
                  adminNotes: prev.adminNotes
                    ? {
                        ...prev.adminNotes,
                        previousNotes: [
                          { text, updatedAt: new Date().toISOString(), updatedBy: "You" },
                          ...prev.adminNotes.previousNotes,
                        ],
                        text: "",
                        updatedAt: new Date().toISOString(),
                        updatedBy: "You",
                      }
                    : undefined,
                }));
              }}
            />
          )}

          <EnrollmentList enrollments={data.enrollments} />
          <LoginActivityCard loginActivity={data.loginActivity} />
          <PreferencesCard
            initialPreferences={data.preferences}
            onUpdate={(preferences) => {
              setData((prev) => ({ ...prev, preferences }));
            }}
          />
        </div>
      </div>
    </div>
  );
}
