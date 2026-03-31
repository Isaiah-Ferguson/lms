"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";
import { isLoggedIn, clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">CodeStack LMS</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          Select an assignment to submit your work.
        </p>

        {/* Placeholder assignment card */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Project 1 — REST API
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Due: March 15, 2026 · Module 3
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                router.push(
                  "/assignments/00000000-0000-0000-0000-000000000001/submit"
                )
              }
            >
              Submit
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
