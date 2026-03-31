"use client";

import { useEffect, useState } from "react";
import { courseApi, type CourseDetailResponse } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { AssignmentManager } from "@/components/assignments/AssignmentManager";

interface CourseAssignmentsPageProps {
  params: { courseId: string };
}

export default function CourseAssignmentsPage({ params }: CourseAssignmentsPageProps) {
  const [courseData, setCourseData] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    courseApi
      .getCourseDetail(params.courseId, token)
      .then((res) => setCourseData(res))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load course."))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Loading course...
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-red-500">
        {error ?? "Course not found."}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {courseData.title} - Assignments
        </h1>
        <p className="text-gray-600 mt-1">
          Manage assignments for this course
        </p>
      </div>

      <AssignmentManager
        courseId={courseData.id}
        canEdit={courseData.permissions.canEditContent}
      />
    </div>
  );
}
