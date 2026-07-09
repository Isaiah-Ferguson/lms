import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { profileApi, gradesApi, ApiError, type ProfileData, type StudentGrades } from "@/lib/api-client";
import { GradesClient } from "./GradesClient";

// Force dynamic rendering - no caching of user data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GradesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cslms_token");
  if (!token) redirect("/login");

  // Fetch the user's enrollments server-side (apiFetch attaches the bearer
  // token directly when running on the server).
  let profile: ProfileData;
  try {
    profile = await profileApi.getMyProfile(token.value);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  const enrollments = profile.enrollments;
  const initialCourseId = enrollments.length > 0 ? enrollments[0].courseId : null;

  // Seed the first course's grades server-side; failures fall back to an
  // error message rendered by the client component.
  let initialData: StudentGrades | null = null;
  let initialError: string | null = null;
  if (initialCourseId) {
    try {
      initialData = await gradesApi.getMyGrades(initialCourseId, token.value);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) redirect("/login");
      initialError = err instanceof ApiError ? err.detail : "Failed to load grades.";
    }
  }

  return (
    <GradesClient
      enrollments={enrollments}
      initialCourseId={initialCourseId}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
