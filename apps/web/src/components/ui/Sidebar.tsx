"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Calendar, Hash, Users, GraduationCap, BarChart2, X, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { NavItem } from "@/lib/dashboard-data";
import { clsx } from "clsx";
import { useEffect } from "react";

interface SidebarProps {
  nav: NavItem[];
  currentLevel: number;
  isOpen?: boolean;
  onClose?: () => void;
}

function NavIcon({ icon }: { icon: string }) {
  if (icon === "grid")        return <Grid2X2 className="h-5 w-5 shrink-0" />;
  if (icon === "calendar")    return <Calendar className="h-5 w-5 shrink-0" />;
  if (icon === "users")       return <Users className="h-5 w-5 shrink-0" />;
  if (icon === "grades")      return <GraduationCap className="h-5 w-5 shrink-0" />;
  if (icon === "admingrades") return <BarChart2 className="h-5 w-5 shrink-0" />;
  if (icon === "clipboard")   return <ClipboardList className="h-5 w-5 shrink-0" />;
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <Hash className="h-4 w-4" />
    </span>
  );
}

export function Sidebar({ nav, currentLevel, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (onClose && isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - hidden on mobile by default, always visible on desktop */}
      <aside
        className={clsx(
          "flex h-full w-64 shrink-0 flex-col border-r border-gray-100 bg-gradient-to-b from-white to-gray-50/50",
          "transition-transform duration-300 ease-in-out",
          // Mobile: fixed position, slide in/out
          "fixed inset-y-0 left-0 z-50",
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible, static position
          "lg:static lg:translate-x-0"
        )}
      >
      {/* Mobile close button */}
      {onClose && (
        <div className="flex items-center justify-between border-b border-gray-100 p-4 lg:hidden">
          <span className="text-sm font-semibold text-gray-700">Navigation</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <nav className="flex flex-col gap-1 p-4 pt-6">
        {nav.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          const levelMatch = item.label.match(/Level (\d)/);
          const isCurrentLevel = levelMatch && parseInt(levelMatch[1]) === currentLevel;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "text-gray-700 hover:bg-white hover:shadow-md hover:scale-[1.02]"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </div>

              </Link>
            </motion.div>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
