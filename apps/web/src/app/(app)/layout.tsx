import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDashboardDataFromApi } from "@/lib/dashboard-data";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

// Force dynamic rendering - no caching of user data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("cslms_token");
  if (!token) redirect("/login");

  const { nav, currentLevel, user } = await getDashboardDataFromApi(token.value);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <AppLayoutClient nav={nav} currentLevel={currentLevel} user={user}>
        {children}
      </AppLayoutClient>
    </div>
  );
}
