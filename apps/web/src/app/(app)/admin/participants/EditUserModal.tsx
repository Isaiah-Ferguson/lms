"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ParticipantUser, UserStatus } from "@/lib/admin-participants-data";

interface Props {
  user: ParticipantUser;
  onClose: () => void;
  onSaved: (updated: ParticipantUser) => void;
}

export function EditUserModal({ user, onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName,  setLastName]  = useState(user.lastName);
  const [town,      setTown]      = useState(user.town);
  const [status,    setStatus]    = useState<UserStatus>(user.status);
  const [errors,    setErrors]    = useState<{ firstName?: string; lastName?: string }>({});
  const [loading,   setLoading]   = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim())  e.lastName  = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const initials = (firstName.trim()[0] + lastName.trim()[0]).toUpperCase();
    onSaved({
      ...user,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      town:      town.trim(),
      status,
      avatarInitials: initials,
    });
    setLoading(false);
  }

  return (
    <Modal title={`Edit — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setErrors((x) => ({ ...x, firstName: undefined })); }}
            error={errors.firstName}
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); setErrors((x) => ({ ...x, lastName: undefined })); }}
            error={errors.lastName}
          />
        </div>

        <Input
          label="Town / City"
          value={town}
          onChange={(e) => setTown(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={loading}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
