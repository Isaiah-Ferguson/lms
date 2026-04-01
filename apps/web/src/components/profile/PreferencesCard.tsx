"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { profileApi } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { UserPreferences } from "@/lib/profile-data";

interface PreferencesCardProps {
  initialPreferences: UserPreferences;
  onUpdate: (preferences: UserPreferences) => void;
}

export function PreferencesCard({ initialPreferences, onUpdate }: PreferencesCardProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(initialPreferences.emailNotificationsEnabled);
  const [darkMode, setDarkMode] = useState(initialPreferences.darkModeEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  const handleToggle = async (type: "email" | "darkMode", newValue: boolean) => {
    const updatedEmail = type === "email" ? newValue : emailNotifications;
    const updatedDarkMode = type === "darkMode" ? newValue : darkMode;

    if (type === "email") setEmailNotifications(newValue);
    if (type === "darkMode") setDarkMode(newValue);

    setSaving(true);
    try {
      const token = getToken();
      if (!token) return;

      const updated = await profileApi.updatePreferences(
        {
          emailNotificationsEnabled: updatedEmail,
          darkModeEnabled: updatedDarkMode,
        },
        token
      );

      onUpdate(updated);
    } catch (err) {
      if (type === "email") setEmailNotifications(!newValue);
      if (type === "darkMode") setDarkMode(!newValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ProfileCard title="Preferences" description="Customize your learning experience.">
        <div className="space-y-3">
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-800">Email notifications</p>
                <p className="text-xs text-gray-500">Receive updates about assignments and grades</p>
              </div>
              <button
                onClick={() => handleToggle("email", !emailNotifications)}
                disabled={saving}
                aria-label={`Toggle email notifications ${emailNotifications ? 'off' : 'on'}`}
                role="switch"
                aria-checked={emailNotifications}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  emailNotifications ? "bg-blue-500" : "bg-gray-200"
                } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    emailNotifications ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-800">Dark mode</p>
                <p className="text-xs text-gray-500">Switch to a darker colour scheme</p>
              </div>
              <button
                onClick={() => handleToggle("darkMode", !darkMode)}
                disabled={saving}
                aria-label={`Toggle dark mode ${darkMode ? 'off' : 'on'}`}
                role="switch"
                aria-checked={darkMode}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  darkMode ? "bg-blue-500" : "bg-gray-200"
                } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    darkMode ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowPasswordModal(true)}
              className="w-full"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </div>
      </ProfileCard>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}
