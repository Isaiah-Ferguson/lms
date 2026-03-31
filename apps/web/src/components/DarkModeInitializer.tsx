"use client";

import { useEffect } from "react";

export function DarkModeInitializer({ darkModeEnabled }: { darkModeEnabled: boolean }) {
  useEffect(() => {
    if (darkModeEnabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkModeEnabled]);

  return null;
}
