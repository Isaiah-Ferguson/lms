# Roadmap 2 — Attendance Tracker

**Status**: Core implemented (monthly grid + admin page live). Calendar entry point, drop-out handling, and the student-history endpoint are **not** done.
**Goal**: Track student attendance **by level**. An admin opens the attendance page, picks a level, and marks each student for the days in a month.

---

## Implementation status (as built)

The shipped implementation differs from the original plan below — keep this section as the source of truth and treat the rest of the doc as the planning notes it was written as.

**Built:**
- `Attendance` entity + `AttendanceStatus` (Present/Late/Excused/Unexcused/**Zoom**) and `SessionType` (InPerson/Remote) enums, with a unique index on `(CourseId, StudentId, Date)`. Migration `AddAttendance`. See `docs/02-DOMAIN-ENTITIES.md` §17.
- `AttendanceController` at **`/api/admin/attendance`** (admin-only) with a **monthly grid** model, not a single-date roster:
  - `GET /api/admin/attendance?courseId=&year=&month=` → grid of students × days.
  - `POST /api/admin/attendance` → upsert marks (each mark carries its own date; `null` clears it). See `docs/03-API-ENDPOINTS.md` §12.
- Frontend page `/admin/attendance` (month grid) + `attendanceApi` in `apps/web/src/lib/api-client.ts` + admin nav entry.

**Diverged from the original plan:**
- The page is a **month grid** reached from the **nav**, not a single-date roster reached by clicking a calendar date.
- Statuses are **Present / Late / Excused / Unexcused / Zoom** (no plain "Absent" — "Unexcused" is the absence case; "Zoom" was added for remote attendance). Each day also has a `SessionType` (InPerson/Remote).
- Route is **`/api/admin/attendance`**, not `/api/attendance`.

**Not yet implemented:**
- Calendar `dateClick` entry point + "Take Attendance vs. View Date Info" prompt (Phase 4).
- Drop-out handling — `UserCourseEnrollment` still has no `IsActive`/`WithdrawnAt` flag (Phase 5).
- `GET /api/attendance/student/{id}` history endpoint and feeding attendance into the Claude reports (Phase 6 / Roadmap 1 Phase 4).

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

> **As built differs** — see "Implementation status (as built)" above and `docs/02-DOMAIN-ENTITIES.md` §17. The shipped entity uses `DateOnly Date`, adds a `SessionType`, and the status enum is Present/Late/Excused/Unexcused/Zoom (no plain "Absent"). `UserCourseEnrollment` was **not** changed.

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

> **As built differs** — the shipped routes live under `/api/admin/attendance` and use a **monthly grid** (`?courseId=&year=&month=`) rather than a per-date roster. The student-history endpoint was not built. See `docs/03-API-ENDPOINTS.md` §12 for the actual contract.

| Method | Route (originally planned) | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/attendance?courseId=&date=` | Admin | Roster + existing marks for a level/date |
| POST | `/api/attendance` | Admin | Upsert attendance marks for a level/date |
| GET | `/api/attendance/student/{id}` | Admin/Instructor | A student's attendance history (used by Roadmap 1) |

Responses follow the existing `ProblemDetails` error shape (see `docs/03-API-ENDPOINTS.md`).

---

## Phased plan

### Phase 1 — Data layer
- [x] Add `Attendance` entity + `AttendanceStatus` enum (Domain). *(Also added `SessionType` enum.)*
- [ ] Add `IsActive`/`WithdrawnAt` to `UserCourseEnrollment`. *(Not done — see Phase 5.)*
- [x] EF Core migration (incl. unique index on `CourseId, StudentId, Date`). *(Migration `AddAttendance`.)*

### Phase 2 — API
- [x] `IAttendanceService` (Application) + implementation.
- [x] `AttendanceController` with the endpoints above (admin-gated). *(Shipped as a monthly grid at `/api/admin/attendance`, not the single-date roster originally sketched.)*
- [x] Roster query reusing existing enrollment → level logic.

### Phase 3 — Frontend: attendance page
- [x] `/admin/attendance` page with level selector + roster + status controls. *(Month-grid UI.)*
- [x] Add API client methods (`attendanceApi`) in `apps/web/src/lib/api-client.ts`.
- [x] Add nav entry (admin-only).

### Phase 4 — Calendar integration
- [ ] Add admin-only `dateClick` handler to the calendar page. *(Not done — attendance is reached via the nav instead; the calendar page handles `eventClick` only.)*
- [ ] Add the "Take Attendance vs. View Date Info" prompt modal.
- [ ] Wire "Take Attendance" → attendance page with date prefilled.

### Phase 5 — Drop-out handling
- [ ] UI/action to deactivate (withdraw) an enrollment. *(Blocked: `UserCourseEnrollment` has no active flag yet.)*
- [ ] Ensure rosters and "active students" queries respect `IsActive`.

### Phase 6 — Feeds Roadmap 1
- [ ] Expose attendance metrics (e.g. % present, recent absences) for the weekly Claude report. *(Attendance data exists but is not yet wired into the report prompt.)*

---

## Open questions

- Which attendance statuses do you want? (Present/Absent only, or also Late/Excused?)
- Should **instructors** take attendance, or **admins only**? (Current plan: admin-only per your request.)
- Is attendance per level only, or could the "Combine" level need a merged roster across levels?
- Deactivate via `IsActive` flag vs. `WithdrawnAt` timestamp — preference?
