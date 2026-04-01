"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users, Layers, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { adminParticipantsApi, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import type { ParticipantUser, UserRole, UserStatus } from "@/lib/admin-participants-data";
import type { CourseOption } from "@/lib/admin-participants-data";

import { FiltersBar }          from "./FiltersBar";
import { UsersTable }          from "./UsersTable";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { CreateUserModal }     from "./CreateUserModal";
import { EnrollUserModal }     from "./EnrollUserModal";
import { BulkActionsModal }    from "./BulkActionsModal";

// ─── Modal discriminated union ────────────────────────────────────────────────

type ActiveModal =
  | { type: "create" }
  | { type: "enroll"; userId?: string }
  | { type: "bulk" };

// ─── Confirmation toast ───────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-green-800">{message}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [users,        setUsers]        = useState<ParticipantUser[]>([]);
  const [courses,      setCourses]      = useState<CourseOption[]>([]);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [loadingPage,  setLoadingPage]  = useState(true);
  const [pageError,    setPageError]    = useState<string | null>(null);
  const [modal,        setModal]        = useState<ActiveModal | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState<UserRole | "All">("All");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");
  const [impersonating, setImpersonating] = useState<ParticipantUser | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setPageError("Your session expired. Please sign in again.");
      setLoadingPage(false);
      return;
    }

    setPageError(null);
    setLoadingPage(true);

    try {
      const data = await adminParticipantsApi.getParticipants(token);
      setUsers(data.users);
      setCourses(data.courses);
      setCanManageUsers(data.permissions.canManageUsers);
    } catch (error) {
      setPageError(error instanceof ApiError ? error.detail : "Unable to load participants.");
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q)  ||
        u.username.toLowerCase().includes(q)  ||
        u.email.toLowerCase().includes(q);
      const matchRole   = roleFilter   === "All" || u.role   === roleFilter;
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.length === filtered.length ? [] : filtered.map((u) => u.id)
    );
  }

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCreated() {
    await loadParticipants();
    setModal(null);
    showToast("User created.");
  }

  async function handleEnrolled(userId: string, courseIds: string[]) {
    const token = getToken();
    if (!token) {
      showToast("Session expired. Please sign in again.");
      return;
    }

    await adminParticipantsApi.enrollUsers({ userIds: [userId], courseIds }, token);
    await loadParticipants();
    setModal(null);
    showToast("Enrollment updated.");
  }

  async function handleBulkEnrolled(userIds: string[], courseIds: string[]) {
    const token = getToken();
    if (!token) {
      showToast("Session expired. Please sign in again.");
      return;
    }

    await adminParticipantsApi.enrollUsers({ userIds, courseIds }, token);
    await loadParticipants();
    setSelectedIds([]);
    setModal(null);
    showToast(`${userIds.length} user(s) enrolled in ${courseIds.length} course(s).`);
  }

  function handleToggleAdmin(user: ParticipantUser) {
    const newRole = user.role === "Admin" ? "Student" : "Admin";
    const msg = newRole === "Admin"
      ? `${user.firstName} ${user.lastName} is now an Admin.`
      : `Admin role removed from ${user.firstName} ${user.lastName}.`;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );
    showToast(msg);
  }

  async function handleToggleActive(user: ParticipantUser) {
    const token = getToken();
    if (!token) {
      showToast("Session expired. Please sign in again.");
      return;
    }

    try {
      await adminParticipantsApi.toggleUserActive(user.id, token);
      await loadParticipants();
      const newStatus = user.status === "Active" ? "Disabled" : "Active";
      const msg = newStatus === "Active"
        ? `${user.firstName} ${user.lastName}'s account has been activated.`
        : `${user.firstName} ${user.lastName}'s account has been deactivated.`;
      showToast(msg);
    } catch (error) {
      showToast("Failed to update account status.");
    }
  }


  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount  = users.filter((u) => u.status === "Active").length;
  const adminCount   = users.filter((u) => u.role   === "Admin").length;
  const instructorCount = users.filter((u) => u.role === "Instructor").length;
  const studentCount = users.filter((u) => u.role   === "Student").length;

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Loading participants...
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm text-red-600">{pageError}</p>
        <Button size="sm" variant="secondary" onClick={() => void loadParticipants()}>
          Retry
        </Button>
      </div>
    );
  }

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <ShieldAlert className="h-7 w-7 text-red-500" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">Access denied</h1>
          <p className="mt-1 text-sm text-gray-500">
            You don&apos;t have permission to manage participants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* Impersonation banner */}
      {impersonating && (
        <ImpersonationBanner
          user={impersonating}
          onExit={() => { setImpersonating(null); showToast("Impersonation ended."); }}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage users, enrollments, and permissions.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setModal({ type: "bulk" })}
            disabled={selectedIds.length === 0}
            className={clsx(selectedIds.length > 0 && "border-blue-300 text-blue-700")}
          >
            <Layers className="h-3.5 w-3.5" />
            Bulk actions
            {selectedIds.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                {selectedIds.length}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setModal({ type: "enroll" })}
          >
            <Users className="h-3.5 w-3.5" />
            Enroll user
          </Button>
          <Button
            size="sm"
            onClick={() => setModal({ type: "create" })}
          >
            <Plus className="h-3.5 w-3.5" />
            Create user
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total users",  value: users.length,  color: "text-gray-900" },
          { label: "Active",       value: activeCount,   color: "text-green-600" },
          { label: "Students",    value: studentCount,  color: "text-blue-600"  },
          { label: "Instructors", value: instructorCount, color: "text-amber-600" },
          { label: "Admins",      value: adminCount,    color: "text-violet-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-gray-600">{label}</p>
            <p className={clsx("mt-0.5 text-2xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        totalCount={users.length}
        filteredCount={filtered.length}
      />

      {/* Table */}
      <UsersTable
        users={filtered}
        courses={courses}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onEnroll={(u) => setModal({ type: "enroll", userId: u.id })}
        onToggleAdmin={handleToggleAdmin}
        onToggleActive={handleToggleActive}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {modal?.type === "create" && (
        <CreateUserModal
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      )}

      {modal?.type === "enroll" && (
        <EnrollUserModal
          users={users}
          courses={courses}
          preselectedUserId={modal.userId}
          onClose={() => setModal(null)}
          onEnrolled={handleEnrolled}
        />
      )}

      {modal?.type === "bulk" && (
        <BulkActionsModal
          users={users}
          selectedIds={selectedIds}
          courses={courses}
          onClose={() => setModal(null)}
          onEnrolled={handleBulkEnrolled}
        />
      )}


      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}
