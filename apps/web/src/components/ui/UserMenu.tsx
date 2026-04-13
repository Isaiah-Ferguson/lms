"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, User, BarChart2, Settings, LogOut, ChevronDown, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { clearToken } from "@/lib/auth";
import type { UserInfo } from "@/lib/dashboard-data";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, isOnProbation }: { name: string; avatarUrl: string | null; isOnProbation?: boolean }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const base = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={name}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
    />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white ring-2 ring-white">
      {initials}
    </span>
  );

  if (!isOnProbation) return base;

  return (
    <span className="relative inline-flex">
      {base}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white">
        <AlertTriangle className="h-2.5 w-2.5 text-white" />
      </span>
    </span>
  );
}

// ─── Dropdown items ───────────────────────────────────────────────────────────

function getMenuItems(role: string) {
  const items = [
    { label: "Dashboard",   href: "/home",        icon: LayoutDashboard },
    { label: "Profile",     href: "/profile",     icon: User },
  ];

  // Show Admin Grades for admins, regular Grades for others
  if (role === "Admin") {
    items.push({ label: "Admin Grades", href: "/admin/grades", icon: BarChart2 });
  } else {
    items.push({ label: "Grades", href: "/grades", icon: BarChart2 });
  }

  items.push({ label: "Preferences", href: "/preferences", icon: Settings });

  return items;
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

export function UserMenu({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSignOut() {
    clearToken();
    // Force a hard reload to clear all cached data
    window.location.href = "/login";
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} isOnProbation={user.isOnProbation} />
        <span className="hidden max-w-[140px] truncate font-medium sm:block">
          {user.name}
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* User info header */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-900">
              {user.name}
            </p>
          </div>

          {/* Nav links */}
          <div className="p-1">
            {getMenuItems(user.role).map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                {label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-100 p-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
