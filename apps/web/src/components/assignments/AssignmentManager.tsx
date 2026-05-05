"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { courseApi, type Assignment } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { CreateAssignmentForm } from "./CreateAssignmentForm";
import { AssignmentList } from "./AssignmentList";

interface Module {
  id: string;
  title: string;
  weekNumber: number;
}

interface AssignmentManagerProps {
  courseId: string;
  moduleId?: string;
  moduleTitle?: string;
  canEdit?: boolean;
}

type View = "list" | "create" | "edit";

export function AssignmentManager({
  courseId,
  moduleId: fixedModuleId,
  moduleTitle: fixedModuleTitle,
  canEdit = false,
}: AssignmentManagerProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(fixedModuleId ?? "");

  // Load course modules when no moduleId is pre-supplied
  useEffect(() => {
    if (fixedModuleId) {
      setSelectedModuleId(fixedModuleId);
      return;
    }
    const token = getToken();
    if (!token) return;
    courseApi.getCourseDetail(courseId, token).then((res) => {
      const mods = res.weeks.map((w) => ({ id: w.id, title: w.title, weekNumber: w.weekNumber }));
      setModules(mods);
      if (mods.length > 0) setSelectedModuleId(mods[0].id);
    });
  }, [courseId, fixedModuleId]);

  const activeModuleTitle = fixedModuleTitle
    ?? modules.find((m) => m.id === selectedModuleId)?.title
    ?? "";

  const handleAssignmentCreated = (_assignment: Assignment, _type?: string) => {
    setCurrentView("list");
    setRefreshKey((prev) => prev + 1);
  };

  const handleAssignmentSelect = (assignment: Assignment) => {
    router.push(`/courses/${courseId}/assignments/${assignment.id}`);
  };

  const handleAssignmentEdit = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setCurrentView("edit");
  };

  const handleAssignmentDeleted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCancel = () => {
    setCurrentView("list");
    setSelectedAssignment(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-300">
          {fixedModuleId ? `${fixedModuleTitle} Assignments` : "All Assignments"}
        </h2>

        {canEdit && currentView === "list" && (
          <button
            onClick={() => setCurrentView("create")}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            + New Assignment
          </button>
        )}
      </div>

      {/* List view */}
      {currentView === "list" && (
        <AssignmentList
          key={refreshKey}
          courseId={courseId}
          moduleId={fixedModuleId}
          onAssignmentSelect={handleAssignmentSelect}
          onAssignmentEdit={handleAssignmentEdit}
          onAssignmentDelete={handleAssignmentDeleted}
          canEdit={canEdit}
        />
      )}

      {/* Create view */}
      {currentView === "create" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          {/* Module selector — only shown when no moduleId is pre-supplied */}
          {!fixedModuleId && modules.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week / Module
              </label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    Week {m.weekNumber}: {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedModuleId ? (
            <CreateAssignmentForm
              moduleId={selectedModuleId}
              moduleTitle={activeModuleTitle}
              onAssignmentCreated={handleAssignmentCreated}
              onCancel={handleCancel}
            />
          ) : (
            <p className="text-sm text-gray-500">Loading modules…</p>
          )}
        </div>
      )}

      {/* Edit view */}
      {currentView === "edit" && selectedAssignment && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <CreateAssignmentForm
            moduleId={selectedAssignment.moduleId}
            moduleTitle={activeModuleTitle}
            existingAssignment={selectedAssignment}
            onAssignmentCreated={handleAssignmentCreated}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
