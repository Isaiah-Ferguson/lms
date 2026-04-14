import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { ProfileCard } from "@/components/profile/ProfileCard";
import type { Enrollment } from "@/lib/profile-data";

interface EnrollmentListProps {
  enrollments: Enrollment[];
}

const STATUS_STYLES: Record<Enrollment["status"], string> = {
  Active: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Upcoming: "bg-gray-100 text-gray-600",
};

export function EnrollmentList({ enrollments }: EnrollmentListProps) {
  return (
    <ProfileCard title="Levels Currently Enrolled" description="Current and upcoming level enrollment status.">
      <ul className="divide-y divide-gray-100">
        {enrollments.map((enrollment) => (
          <li key={enrollment.courseId} className="flex items-center justify-between py-3">
            <Link
              href={`/courses/${enrollment.courseId}`}
              className="group flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-slate-100 hover:text-blue-600"
            >
              {enrollment.title}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>

            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                STATUS_STYLES[enrollment.status]
              )}
            >
              {enrollment.status}
            </span>
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}
