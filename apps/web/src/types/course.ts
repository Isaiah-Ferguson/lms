export interface CourseDetailResponse {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  courseMeta: string;
  zoomUrl: string;
  weeks: Array<{
    id: string;
    weekNumber: number;
    title: string;
    dateRange: string;
    zoomUrl: string;
    topics: string[];
    detailsHref: string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    tag: string | null;
    announcedAt: string;
  }>;
  permissions: {
    canEditContent: boolean;
  };
}
