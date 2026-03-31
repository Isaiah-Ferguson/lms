export type CalendarEventType = "assignment" | "event";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  courseId: string;
  courseTitle: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  href?: string;
  description?: string;
}
