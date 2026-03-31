"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, authApi } from "@/lib/api-client";
import type { UserRole } from "@/lib/admin-participants-data";
import { getToken } from "@/lib/auth";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface Form {
  firstName: string;
  lastName: string;
  email: string;
  town: string;
  role: UserRole;
}

const EMPTY: Form = { firstName: "", lastName: "", email: "", town: "", role: "Student" };

export function CreateUserModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Form> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim())  e.lastName  = "Required";
    if (!form.email.trim())     e.email     = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    setLoading(true);

    try {
      const token = getToken();
      if (!token) {
        setServerError("Your session expired. Please sign in again.");
        return;
      }

      await authApi.createUser({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        role: form.role,
        town: form.town.trim(),
      }, token);

      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.errors?.join(" ") ?? err.detail);
      } else {
        setServerError("Unable to create user right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Create user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            placeholder="e.g. Isaiah"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Last name"
            placeholder="e.g. Ferguson"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            error={errors.lastName}
          />
        </div>
        <Input
          label="Email"
          type="email"
          placeholder="user@example.com"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />
        <Input
          label="Town / City"
          placeholder="e.g. Atlanta"
          value={form.town}
          onChange={(e) => set("town", e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Role</label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value as UserRole)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Student">Student</option>
            <option value="Instructor">Instructor</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {serverError && (
          <p className="text-xs text-red-600">{serverError}</p>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            A secure password is generated and emailed to the user. Admins cannot view it.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
