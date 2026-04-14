"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { UserMenu } from "@/components/ui/UserMenu";
import { Footer } from "@/components/ui/Footer";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { MobileMenuButton } from "@/components/ui/MobileMenuButton";
import type { NavItem } from "@/lib/dashboard-data";
import type { UserInfo } from "@/lib/dashboard-data";

interface AppLayoutClientProps {
  nav: NavItem[];
  currentLevel: number;
  user: UserInfo;
  children: React.ReactNode;
}

export function AppLayoutClient({ nav, currentLevel, user, children }: AppLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Top Banner */}
      <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 shadow-sm z-50">
        {/* Left: mobile menu + logo + title */}
        <div className="flex items-center gap-3">
          <MobileMenuButton onClick={handleOpenSidebar} />
          <Link href="/home" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-slate-50 dark:to-slate-200 bg-clip-text text-transparent">
              CodeStack LMS
            </span>
          </Link>
        </div>

        {/* Right: user profile dropdown */}
        <UserMenu user={user} />
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          nav={nav} 
          currentLevel={currentLevel}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
          <Footer />
        </main>
      </div>
    </>
  );
}
