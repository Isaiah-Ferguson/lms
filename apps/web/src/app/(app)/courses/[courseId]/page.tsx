import { CourseDashboardLoader } from "./CourseDashboardLoader";

interface CoursePageProps {
  params: { courseId: string };
}

export default function CoursePage({ params }: CoursePageProps) {
  return <CourseDashboardLoader courseId={params.courseId} />;
}
