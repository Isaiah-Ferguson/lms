"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { profileApi, courseApi, assignmentsApi, adminParticipantsApi, type Enrollment } from "@/lib/api-client";
import { getToken, getUserRole } from "@/lib/auth";
import type { CalendarEvent, CalendarEventType } from "@/lib/calendar-data";

function EventDetailsModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const formattedStart = event.start
    ? new Date(event.start).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: event.allDay ? undefined : "short",
      })
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
          <div>
            <span
              className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                event.type === "assignment"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {event.type === "assignment" ? "Assignment" : "Announcement"}
            </span>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm text-gray-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500" />
            <div>
              <p className="font-medium text-gray-800 dark:text-slate-200">
                {event.type === "assignment" ? "Due date" : "Posted"}
              </p>
              <p>{formattedStart}</p>
            </div>
          </div>
          {event.courseTitle && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs font-bold text-gray-400 dark:text-slate-500">
                ≡
              </span>
              <div>
                <p className="font-medium text-gray-800 dark:text-slate-200">Course</p>
                <p>{event.courseTitle}</p>
              </div>
            </div>
          )}
          {event.description && (
            <div className="rounded-lg bg-gray-50 dark:bg-slate-900/50 p-3 text-gray-700 dark:text-slate-300 whitespace-pre-line">
              {event.description}
            </div>
          )}
          {event.href && (
            <a
              href={event.href}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Assignment
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const TYPE_OPTIONS: { id: CalendarEventType; label: string }[] = [
  { id: "assignment", label: "Assignments" },
  { id: "event", label: "Announcements" },
];

const TYPE_COLOR: Record<CalendarEventType, string> = {
  assignment: "#2563eb",
  event: "#10b981",
};

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [types, setTypes] = useState<CalendarEventType[]>(["assignment", "event"]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }

    async function loadCalendarData() {
      try {
        const role = getUserRole();
        const isAdminOrInstructor = role === "Admin" || role === "Instructor";

        let courseList: { courseId: string; title: string }[] = [];

        if (isAdminOrInstructor) {
          const adminData = await adminParticipantsApi.getParticipants(token!);
          courseList = adminData.courses.map((c) => ({ courseId: c.id, title: c.label }));
        } else {
          const profile = await profileApi.getMyProfile(token!);
          setEnrollments(profile.enrollments);
          courseList = profile.enrollments.map((e) => ({ courseId: e.courseId, title: e.title }));
        }

        const events: CalendarEvent[] = [];
        const adminEnrollments: Enrollment[] = [];

        await Promise.all(
          courseList.map(async (course) => {
            const [courseDetail, assignments] = await Promise.all([
              courseApi.getCourseDetail(course.courseId, token!),
              assignmentsApi.getAssignmentsByCourse(course.courseId, token!),
            ]);

            for (const ann of courseDetail.announcements) {
              events.push({
                id: `ann-${ann.id}`,
                type: "event",
                courseId: course.courseId,
                courseTitle: course.title,
                title: ann.title,
                start: ann.announcedAt,
                allDay: true,
                description: ann.body,
              });
            }

            for (const asgn of assignments) {
              events.push({
                id: `asgn-${asgn.id}`,
                type: "assignment",
                courseId: course.courseId,
                courseTitle: course.title,
                title: asgn.title,
                start: asgn.dueDate,
                allDay: false,
                href: `/courses/${course.courseId}/assignments/${asgn.id}`,
                description: `Module: ${asgn.moduleTitle}`,
              });
            }

            if (isAdminOrInstructor) {
              adminEnrollments.push({ courseId: course.courseId, title: course.title, status: "Active" });
            }
          })
        );

        if (isAdminOrInstructor) {
          setEnrollments(adminEnrollments);
        }

        setAllEvents(events);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }

    loadCalendarData();
  }, [router]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (!types.includes(e.type)) return false;
      if (selectedCourseId !== "all" && e.courseId !== selectedCourseId) return false;
      return true;
    });
  }, [allEvents, selectedCourseId, types]);

  const calendarEvents: EventInput[] = useMemo(() => {
    return filteredEvents.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      backgroundColor: TYPE_COLOR[e.type],
      borderColor: TYPE_COLOR[e.type],
      extendedProps: { raw: e },
    }));
  }, [filteredEvents]);

  function toggleType(type: CalendarEventType) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function onEventClick(arg: EventClickArg) {
    const raw = arg.event.extendedProps.raw as CalendarEvent;
    if (raw.href) {
      router.push(raw.href);
      return;
    }
    setSelected(raw);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Calendar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-700">
          Upcoming assignments and announcements across your enrolled courses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm md:grid-cols-2">
        <div>
          <p className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Types
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const active = types.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleType(opt.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 dark:border-slate-700 border-t-blue-500" />
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,listWeek",
            }}
            buttonText={{
              dayGridMonth: "Month",
              timeGridWeek: "Week",
              listWeek: "List",
            }}
            events={calendarEvents}
            eventClick={onEventClick}
            height="auto"
            dayMaxEvents={3}
          />
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Assignments
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Announcements
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Click assignments to open, click announcements for details
          </span>
        </div>
      </div>

      {selected && <EventDetailsModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
