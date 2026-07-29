import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardFetchError, getDashboardDataFromApi } from "@/lib/dashboard-data";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

// Force dynamic rendering - no caching of user data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("cslms_token");
  if (!token) redirect("/login");

  // A rejected token means the session is over, not that something broke —
  // send them to sign in rather than to the error boundary. Anything else
  // propagates to error.tsx, which offers a retry.
  let dashboard;
  try {
    dashboard = await getDashboardDataFromApi(token.value);
  } catch (err) {
    if (err instanceof DashboardFetchError && (err.status === 401 || err.status === 403)) {
      redirect("/login");
    }
    throw err;
  }

  const { nav, currentLevel, user } = dashboard;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <AppLayoutClient nav={nav} currentLevel={currentLevel} user={user}>
        {children}
      </AppLayoutClient>
    </div>
  );
}
