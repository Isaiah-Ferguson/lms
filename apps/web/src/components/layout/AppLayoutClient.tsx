"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { UserMenu } from "@/components/ui/UserMenu";
import { Footer } from "@/components/ui/Footer";
import Image from "next/image";
import Link from "next/link";
import { MobileMenuButton } from "@/components/ui/MobileMenuButton";
import Logo from "@/assets/CSALGO.png";
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
            <div className="relative h-10 w-10 shrink-0 rounded-xl transition-transform group-hover:scale-105">
              <Image src={Logo} alt="CodeStack LMS" fill className="rounded-xl object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-slate-50">
              CodeStack Academy
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
          <div className="flex min-h-full flex-col">
            <div className="flex-1 p-8">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </>
  );
}
