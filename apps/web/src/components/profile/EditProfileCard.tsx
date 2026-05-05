"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ApiError, profileApi, uploadFileToBlobSas } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { ProfileUser } from "@/lib/profile-data";

interface EditProfileCardProps {
  user: ProfileUser;
  canEditProfile: boolean;
  onSave: (updated: Pick<ProfileUser, "name" | "town" | "phoneNumber" | "gitHubUsername" | "avatarUrl"> & { avatarBlobPath?: string | null }) => Promise<void>;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EditProfileCard({ user, canEditProfile, onSave }: EditProfileCardProps) {
  const [name, setName] = useState(user.name);
  const [town, setTown] = useState(user.town);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [gitHubUsername, setGitHubUsername] = useState(user.gitHubUsername);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      event.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`Image is too large (${sizeMB}MB). Please upload an image smaller than 2MB.`);
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarUrl(previewUrl);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEditProfile) {
      return;
    }

    setSaveError(null);
    setUploadError(null);
    setSaving(true);
    try {
      let avatarBlobPath: string | undefined;
      let nextAvatarUrl = avatarUrl;

      if (avatarFile) {
        const token = getToken();
        if (!token) {
          throw new Error("You must be signed in to upload an avatar.");
        }

        const slot = await profileApi.generateAvatarUploadSlot(
          user.id,
          {
            fileName: avatarFile.name,
            contentType: avatarFile.type || "image/png",
            sizeBytes: avatarFile.size,
          },
          token
        );

        await uploadFileToBlobSas(
          slot.sasUrl,
          avatarFile,
          avatarFile.type || "application/octet-stream",
          () => {}
        );

        avatarBlobPath = slot.blobPath;
        nextAvatarUrl = slot.readUrl;
      }

      await onSave({
        name: name.trim(),
        town: town.trim(),
        phoneNumber: phoneNumber.trim(),
        gitHubUsername: gitHubUsername.trim(),
        avatarUrl: nextAvatarUrl,
        avatarBlobPath,
      });

      setAvatarFile(null);
      setAvatarUrl(nextAvatarUrl);
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.detail 
        : error instanceof Error 
        ? error.message 
        : "Unable to save profile right now.";
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileCard title="Edit Profile" description="Update your name, location, and avatar.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={user.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white ring-2 ring-gray-200">
                {initials(name || user.name)}
              </div>
            )}
            <label htmlFor="avatar-upload" className="sr-only">
              Upload profile avatar image
            </label>
            <input
              id="avatar-upload"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={!canEditProfile}
              aria-label="Upload profile avatar image"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canEditProfile}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-slate-500"
            >
              <Camera className="h-3.5 w-3.5" />
              Upload avatar
            </button>
            <p className="text-xs text-gray-700 dark:text-slate-300 text-center">Max 2MB</p>
            {uploadError && (
              <p className="text-xs text-red-600 dark:text-red-400 text-center max-w-[120px]">{uploadError}</p>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEditProfile}
            />
            <Input label="Email" value={user.email} disabled />
            <Input
              label="Town"
              value={town}
              onChange={(event) => setTown(event.target.value)}
              disabled={!canEditProfile}
            />
            <Input
              label="Phone Number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              disabled={!canEditProfile}
              placeholder="(555) 123-4567"
            />
            <Input
              label="GitHub Username"
              value={gitHubUsername}
              onChange={(event) => setGitHubUsername(event.target.value)}
              disabled={!canEditProfile}
              placeholder="@username"
            />
          </div>
        </div>

        <Button type="submit" size="sm" loading={saving} disabled={!canEditProfile}>
          Save profile
        </Button>
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </form>
    </ProfileCard>
  );
}
