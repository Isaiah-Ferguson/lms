# Roadmap 2 — Attendance Tracker

**Status**: Planned (not yet implemented)
**Goal**: Track student attendance **by level**, accessed via the calendar. An admin clicks a date → chooses to take attendance or view that date's info (events/announcements) → lands on a per-level page listing all students in that level.

---

## Summary

Attendance is recorded per **level** per **date**. The calendar becomes the entry point: admins clicking a calendar date are prompted to either take attendance or view date info. The attendance page is a simple roster of every student in the selected level with present/absent (and optionally late/excused) controls.

---

## Decision: tie attendance to levels vs. calendar-only

**Recommendation: tie attendance to levels.** It's actually the *simpler* path here because the relationship already exists.

- **Levels already exist** as `Course` entities (`Combine`, `Level One`–`Level Four`), created per `Cohort` in `HomeService.DefaultLevelConfig`.
- **Students are already linked to levels** via `UserCourseEnrollment` (UserId + CourseId). So "all students in a level" is an existing query — no new membership model needed.
- A pure calendar-only approach would still need *some* way to know which students belong where, which circles back to levels anyway.

### Handling drop-outs

Rather than deleting student records, **deactivate the enrollment** so the student stops appearing on rosters while history is preserved.

- Today `UserCourseEnrollment` has no active flag. Add `IsActive` (or `WithdrawnAt`) to it.
- Attendance roster query = active enrollments for that level.
- Past attendance records remain intact for reporting/audit.

> This also feeds Roadmap 1: "active students" = students with an active enrollment.

---

## Data model (new)

```
Attendance
  Id
  CourseId        // the level (FK → Course)
  StudentId       // FK → User
  Date            // the calendar day
  Status          // Present | Absent | Late | Excused (enum)
  RecordedByUserId// the admin who took it
  Note?           // optional
  CreatedAt / UpdatedAt
  -- unique constraint: (CourseId, StudentId, Date)
```

Plus an enrollment change:

```
UserCourseEnrollment
  + IsActive (bool)         // or WithdrawnAt (DateTime?)
```

---

## Calendar entry point

The calendar (`apps/web/src/app/(app)/calendar/page.tsx`) already loads FullCalendar's `interactionPlugin` but only handles `eventClick`. Attendance adds a `dateClick` handler **for admins only**.

```
Admin clicks a date (dateClick)
        │
        ▼
Prompt modal: "What do you want to do?"
   ├─ Take Attendance  → /admin/attendance?date=YYYY-MM-DD  (then pick level)
   └─ View Date Info   → existing events/announcements for that date
```

- **Admin-only**: gate `dateClick` behind `getUserRole() === "Admin"`. Non-admins keep current behavior (no date prompt).
- The modal can reuse the existing modal pattern in the calendar page.

---

## Attendance page

- Route: `/admin/attendance` (admin-only), with `date` and `level`/`courseId` params.
- **Level selector** — the 5 levels for the active cohort.
- **Roster** — all *active* students enrolled in that level (from `UserCourseEnrollment`), ordered by name.
- **Per-student control** — Present / Absent / Late / Excused, with optional note.
- **Save** — upsert one `Attendance` row per student for that (level, date).
- Pre-fill from existing records if attendance for that date was already taken (edit mode).

---

## API endpoints (new)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/attendance?courseId=&date=` | Admin | Roster + existing marks for a level/date |
| POST | `/api/attendance` | Admin | Upsert attendance marks for a level/date |
| GET | `/api/attendance/student/{id}` | Admin/Instructor | A student's attendance history (used by Roadmap 1) |

Responses follow the existing `ProblemDetails` error shape (see `docs/03-API-ENDPOINTS.md`).

---

## Phased plan

### Phase 1 — Data layer
- [ ] Add `Attendance` entity + `AttendanceStatus` enum (Domain).
- [ ] Add `IsActive`/`WithdrawnAt` to `UserCourseEnrollment`.
- [ ] EF Core migration (incl. unique index on `CourseId, StudentId, Date`).

### Phase 2 — API
- [ ] `IAttendanceService` (Application) + implementation.
- [ ] `AttendanceController` with the endpoints above (admin-gated).
- [ ] Roster query reusing existing enrollment → level logic.

### Phase 3 — Frontend: attendance page
- [ ] `/admin/attendance` page with level selector + roster + status controls.
- [ ] Add API client methods (`attendanceApi`) in `apps/web/src/lib/api-client.ts`.
- [ ] Add nav entry (admin-only).

### Phase 4 — Calendar integration
- [ ] Add admin-only `dateClick` handler to the calendar page.
- [ ] Add the "Take Attendance vs. View Date Info" prompt modal.
- [ ] Wire "Take Attendance" → attendance page with date prefilled.

### Phase 5 — Drop-out handling
- [ ] UI/action to deactivate (withdraw) an enrollment.
- [ ] Ensure rosters and "active students" queries respect `IsActive`.

### Phase 6 — Feeds Roadmap 1
- [ ] Expose attendance metrics (e.g. % present, recent absences) for the weekly Claude report.

---

## Open questions

- Which attendance statuses do you want? (Present/Absent only, or also Late/Excused?)
- Should **instructors** take attendance, or **admins only**? (Current plan: admin-only per your request.)
- Is attendance per level only, or could the "Combine" level need a merged roster across levels?
- Deactivate via `IsActive` flag vs. `WithdrawnAt` timestamp — preference?
