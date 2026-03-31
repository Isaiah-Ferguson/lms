import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileCard } from "@/components/profile/ProfileCard";
import type { GradesOverview } from "@/lib/profile-data";

interface GradesSummaryCardProps {
  gradesOverview: GradesOverview;
  gradesHref?: string;
}

function gradeColor(percent: number): string {
  if (percent >= 90) return "text-emerald-600";
  if (percent >= 70) return "text-blue-600";
  return "text-red-600";
}

export function GradesSummaryCard({ gradesOverview, gradesHref = "/grades" }: GradesSummaryCardProps) {
  const { courseGrades } = gradesOverview;

  return (
    <ProfileCard title="Current Grades" description="Your enrolled courses and current letter grades.">
      <div className="space-y-4">
        {courseGrades.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No graded assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {courseGrades.map((course) => (
              <div
                key={course.courseId}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{course.courseName}</p>
                  <p className="text-xs text-gray-500">
                    {course.gradedCount} / {course.totalCount} graded
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${gradeColor(course.percent)}`}>
                    {course.percent}%
                  </span>
                  <span className={`text-2xl font-bold ${gradeColor(course.percent)} min-w-[2.5rem] text-right`}>
                    {course.letterGrade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href={gradesHref}>
          <Button variant="secondary" size="sm" className="w-full">
            View grades
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </ProfileCard>
  );
}
