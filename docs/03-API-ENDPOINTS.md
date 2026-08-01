# CodeStack LMS - REST API Endpoints

**Base URL**: `/api`

**Common Response Formats**:

Success responses return the DTO directly (no envelope). Error responses use ASP.NET Core's `ProblemDetails` shape.

```typescript
// Success (200 / 201)
// Body is the DTO itself, e.g. CourseDetailDto, LessonDto, etc.

// Error
{
  type?: string,
  title: string,
  status: number,
  detail?: string,
  traceId?: string
}
```

---

## 1. Authentication (`/api/auth`)

### POST `/api/auth/login`
**Description**: Login user
**Auth**: Public
**Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**: `AuthTokenDto` → `{ accessToken: string, expiresIn: number, mustChangePassword: boolean, refreshToken: string, refreshExpiresIn: number }`
**Status**: 200 OK
**Rate limit**: `auth` policy
**Notes**: `expiresIn` is 1800 (30 min); `refreshExpiresIn` is 14 days. The browser never
handles these directly — the Next.js login route handler writes both into httpOnly cookies.

> **There is no public self-registration.** Accounts are created by an Admin via
> `POST /api/auth/users`. Any reference to `POST /api/auth/register` is stale — that
> endpoint does not exist.

### POST `/api/auth/refresh`
**Description**: Exchange a refresh token for a new access token
**Auth**: Public (the refresh token itself is the credential)
**Body**:
```json
{
  "refreshToken": "string"
}
```
**Response**: `AuthTokenDto`
**Status**: 200 OK · 401 if the token is unknown, expired, or revoked
**Rate limit**: `auth` policy
**Notes**: Only a SHA-256 hash of the refresh token is stored server-side. The token is
returned unchanged rather than rotated — see the open item on rotation and reuse
detection in `PROJECT-REVIEW.md` (M4).

### POST `/api/auth/logout`
**Description**: Revoke a refresh token
**Auth**: Public
**Body**:
```json
{
  "refreshToken": "string | null"
}
```
**Response**: Success message
**Status**: 200 OK
**Rate limit**: `auth` policy

### POST `/api/auth/users`
**Description**: Create user (admin only)
**Auth**: Admin
**Body**: User creation details
**Response**: User created
**Status**: 201 Created

### POST `/api/auth/change-password`
**Description**: Change password
**Auth**: Authenticated
**Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Response**: Success message
**Status**: 200 OK

### POST `/api/auth/forgot-password`
**Description**: Email a single-use password reset link
**Auth**: Public
**Body**:
```json
{
  "email": "string"
}
```
**Response**: Success message (always 200, regardless of whether the email exists, to avoid account enumeration)
**Status**: 200 OK
**Rate limit**: `auth` policy
**Notes**: This endpoint **does not change the password**. It stores a hashed, single-use
token (1-hour expiry) and emails a link to `/reset-password?token=…`. Requesting a link
leaves the account entirely untouched — the existing password keeps working and current
sessions stay alive. That matters because the endpoint is unauthenticated: if it mutated
the account, anyone who knew a student's email address could lock them out at will.
Issuing a new link invalidates any earlier unused one. Email-send failures are swallowed
(again, to avoid enumeration) and are harmless, since nothing has been changed.

### POST `/api/auth/reset-password`
**Description**: Redeem a reset token and set a new password
**Auth**: Public (the token is the credential)
**Body**:
```json
{
  "token": "string",
  "newPassword": "string"
}
```
**Response**: Success message
**Status**: 200 OK · 400 if the token is unknown, expired, already used, or the account is deactivated
**Rate limit**: `auth` policy
**Notes**: Minimum password length 8. On success the token is burned and **every** refresh
token for that user is revoked, so all other sessions end. All failure modes return one
generic message so the response can't be used to probe token validity.

---

## 2. Courses (`/api/courses`)

### GET `/api/courses/{courseId}`
**Description**: Get course detail with modules and lessons
**Auth**: Authenticated
**Response**: `CourseDetailDto` (includes modules, lessons, assignments)
**Status**: 200 OK

### POST `/api/courses/{courseId}/weeks`
**Description**: Create a new week/module in a course
**Auth**: Instructor
**Body**:
```json
{
  "title": "string",
  "weekNumber": number,
  "dateRange": "string",
  "zoomUrl": "string"
}
```
**Response**: `CourseWeekDto`
**Status**: 201 Created

### PATCH `/api/courses/{courseId}/weeks/{weekId}`
**Description**: Update a week/module
**Auth**: Instructor
**Body**: Partial update of week details
**Response**: `CourseWeekDto`
**Status**: 200 OK

### POST `/api/courses/{courseId}/announcements`
**Description**: Create course announcement
**Auth**: Instructor
**Body**:
```json
{
  "title": "string",
  "body": "string",
  "tag": "string"
}
```
**Response**: Announcement created
**Status**: 201 Created

### PUT `/api/courses/{courseId}/announcements/{announcementId}`
**Description**: Update announcement
**Auth**: Instructor
**Body**: Announcement details
**Response**: Updated announcement
**Status**: 200 OK

### DELETE `/api/courses/{courseId}/announcements/{announcementId}`
**Description**: Delete announcement
**Auth**: Instructor
**Response**: Success
**Status**: 200 OK

---

## 3. Assignments (`/api/assignments`)

### GET `/api/assignments/{assignmentId}`
**Description**: Get assignment by ID
**Auth**: Authenticated
**Response**: `AssignmentDto`
**Status**: 200 OK

### GET `/api/assignments/course/{courseId}`
**Description**: Get assignments for a course
**Auth**: Authenticated
**Response**: `AssignmentDto[]`
**Status**: 200 OK

### GET `/api/assignments/module/{moduleId}`
**Description**: Get assignments for a module
**Auth**: Authenticated
**Response**: `AssignmentDto[]`
**Status**: 200 OK

### POST `/api/assignments`
**Description**: Create new assignment
**Auth**: Instructor
**Body**:
```json
{
  "title": "string",
  "assignmentType": "Challenge | MiniChallenge | Project",
  "instructions": "string",
  "dueDate": "datetime",
  "attachmentUrl": "string",  // Optional - URL to assignment files/resources
  "moduleId": "guid"
}
```
**Response**: `AssignmentDto`
**Status**: 201 Created

### PUT `/api/assignments/{assignmentId}`
**Description**: Update assignment
**Auth**: Instructor
**Body**:
```json
{
  "title": "string",
  "assignmentType": "Challenge | MiniChallenge | Project",
  "instructions": "string",
  "dueDate": "datetime",
  "attachmentUrl": "string"  // Optional - URL to assignment files/resources
}
```
**Response**: Updated assignment
**Status**: 200 OK

### DELETE `/api/assignments/{assignmentId}`
**Description**: Delete assignment
**Auth**: Instructor
**Response**: Success
**Status**: 200 OK

### GET `/api/assignments/{assignmentId}/my-submission`
**Description**: Get current user's submission for assignment
**Auth**: Authenticated (Student)
**Response**: `SubmissionDto` or null
**Status**: 200 OK

---

## 4. Submissions (`/api/submissions`)

### POST `/api/submissions/{assignmentId}/request-upload`
**Description**: Request per-file upload slots for a submission
**Auth**: Authenticated (Student, enrolled in the course)
**Body**: `RequestUploadDto`
```json
{
  "type": "Upload",
  "files": [
    { "fileName": "solution.zip", "contentType": "application/zip", "sizeBytes": 12345 }
  ],
  "figmaUrl": null,
  "gitHubRepoUrl": null,
  "hostedUrl": null,
  "note": null
}
```
**Response**: `UploadUrlResponseDto`
```json
{
  "submissionId": "guid",
  "uploadSlots": [
    { "fileName": "solution.zip", "blobPath": "submissions/…", "sasUrl": "https://…", "contentType": "application/zip", "maxSizeBytes": 104857600 }
  ],
  "expiresAt": "2026-07-28T12:15:00Z"
}
```
**Status**: 200 OK
**Limits**: max 20 files, 100 MB per file, 500 MB total. Filenames are sanitised with
`Path.GetFileName`, so directory traversal is stripped. SAS expiry is 15 minutes.
**Notes**: Re-requesting on an existing submission **does not delete anything**. The
previous attempt's artifacts, grade and GitHub info stay in place until a replacement
upload is confirmed, so abandoning a resubmit can't destroy a grade already earned.

### POST `/api/submissions/{submissionId}/complete-upload`
**Description**: Confirm the uploads and move the submission to ReadyToGrade
**Auth**: Authenticated (Student, owner of the submission)
**Body**: `CompleteUploadDto`
```json
{
  "files": [
    {
      "blobPath": "submissions/{cohort}/{assignment}/{student}/{submission}/solution.zip",
      "fileName": "solution.zip",
      "contentType": "application/zip",
      "sizeBytes": 12345,
      "checksum": "…"
    }
  ]
}
```
**Response**: `SubmissionResponseDto`
**Status**: 200 OK · 400 on a limit violation or missing blob · 403 if a path doesn't belong to the submission
**Notes**: The declared `sizeBytes` and `contentType` are **not trusted**. A SAS cannot cap
upload size and its `ContentType` only overrides the read response header, so the API reads
each blob's real properties, enforces the limits against those, and persists the verified
values. Over-limit blobs are deleted. Path ownership is checked *before* any storage lookup,
so the endpoint can't be used to probe whether an arbitrary blob exists. Duplicate blob
paths are rejected.

On success this is where the swap happens: the previous attempt's artifacts, grade and
GitHub info are removed and the new artifacts take their place. Blobs shared with the new
upload (same filename, overwritten in place) are deliberately *not* deleted.

### POST `/api/submissions/{assignmentId}/github-submit`
**Description**: Submit GitHub repository
**Auth**: Authenticated (Student)
**Body**:
```json
{
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "commitHash": "abc123"
}
```
**Response**: `SubmissionDto`
**Status**: 200 OK

### GET `/api/submissions/{submissionId}/artifacts`
**Description**: Get submission artifacts with SAS URLs
**Auth**: Authenticated
**Response**: `{ artifacts: [{ fileName, sasUrl, size, contentType }] }`
**Status**: 200 OK

### GET `/api/submissions/{submissionId}/status`
**Description**: Get submission status
**Auth**: Authenticated
**Response**: `{ status: SubmissionStatus, attemptNumber: number }`
**Status**: 200 OK

---

## 5. Lessons (`/api/lessons`)

### GET `/api/lessons?moduleId={moduleId}`
**Description**: Get all lessons for a module, with read SAS URLs for each artifact
**Auth**: Authenticated **and enrolled in the owning course** (Instructor/Admin bypass)
**Query Params**: `?moduleId={moduleId}`
**Response**: `LessonDto[]`
**Status**: 200 OK · 403 if not enrolled · 404 if the module doesn't exist
**Notes**: Enrollment is enforced because the response contains working 1-hour download
URLs for every lesson artifact, and the SAS is the only access control on those blobs once
it leaves the API.

### POST `/api/lessons`
**Description**: Create a lesson (video, text, or link) in a module
**Auth**: Instructor / Admin
**Body**: `CreateLessonDto` (moduleId, title, type, and the type-specific fields — e.g. video source/blob path, text content, or link URL)
**Response**: `LessonDto`
**Status**: 201 Created

### GET `/api/lessons/{lessonId}/video-token`
**Description**: Get a short-lived stream URL for the lesson video
**Auth**: Authenticated **and enrolled in the owning course** (Instructor/Admin bypass)
**Response**: `VideoTokenDto` → `{ lessonId, source, streamUrl, mimeType, durationSeconds, expiresAt }`
**Status**: 200 OK · 400 if the lesson has no video source · 403 if not enrolled · 404 if unknown
**Notes**: Blob-backed sources (AzureBlob, HLS, DASH) get a 1-hour read SAS; `External`
sources return the stored URL as-is.

### PUT `/api/lessons/{lessonId}`
**Description**: Update lesson
**Auth**: Instructor
**Body**: Lesson details
**Response**: Updated lesson
**Status**: 200 OK

### DELETE `/api/lessons/{lessonId}`
**Description**: Delete lesson
**Auth**: Instructor
**Response**: Success
**Status**: 200 OK

### POST `/api/lessons/{lessonId}/artifacts`
**Description**: Add artifact to lesson
**Auth**: Instructor
**Body**:
```json
{
  "fileName": "string",
  "size": number,
  "contentType": "string"
}
```
**Response**: `{ artifactId, uploadUrl: sasUrl }`
**Status**: 200 OK

### DELETE `/api/lessons/artifacts/{artifactId}`
**Description**: Delete lesson artifact
**Auth**: Instructor
**Response**: Success
**Status**: 200 OK

---

## 6. Grades (`/api/grades`)

### GET `/api/grades/my`
**Description**: Get current user's grades
**Auth**: Authenticated (Student)
**Response**: `GradeDto[]`
**Status**: 200 OK

### GET `/api/grades/admin`
**Description**: Get all grades (admin view)
**Auth**: Admin
**Response**: `GradeDto[]`
**Status**: 200 OK

---

## 7. Instructor (`/api/instructor`)

### GET `/api/instructor/submissions/{submissionId}`
**Description**: Get submission details for grading
**Auth**: Instructor
**Response**: `SubmissionDetailDto` (includes artifacts, GitHub info, existing grade)
**Status**: 200 OK

### GET `/api/instructor/submissions`
**Description**: Get submissions pending grading
**Auth**: Instructor
**Query Params**: `?courseId={courseId}&status={status}`
**Response**: `SubmissionDto[]`
**Status**: 200 OK

### POST `/api/instructor/submissions/{submissionId}/grade`
**Description**: Grade a submission (100-point scale)
**Auth**: Instructor
**Body**:
```json
{
  "totalScore": number,  // 0-100
  "rubricBreakdownJson": "string",  // Optional detailed breakdown
  "overallComment": "string"
}
```
**Response**: `GradeDto`
**Status**: 200 OK
**Note**: All assignments use a fixed 100-point grading scale

### POST `/api/instructor/assignments/{assignmentId}/students/{studentId}/grade`
**Description**: Grade a student's work for an assignment directly (used when grading from the roster, including students who have not formally submitted). Same 100-point body as the per-submission grade endpoint.
**Auth**: Instructor
**Body**:
```json
{
  "totalScore": number,
  "rubricBreakdownJson": "string",
  "overallComment": "string"
}
```
**Response**: `ExistingGradeDto`
**Status**: 200 OK

### POST `/api/instructor/submissions/{submissionId}/return`
**Description**: Return a submission to the student with a reason (sends an email notification; the student can resubmit). Transitions the submission to `Returned`.
**Auth**: Instructor
**Body**:
```json
{
  "reason": "string"
}
```
**Response**: Success
**Status**: 200 OK

### GET `/api/instructor/assignments/{assignmentId}/submissions-roster`
**Description**: Get roster of all submissions for an assignment
**Auth**: Instructor
**Response**: `SubmissionRosterDto[]`
**Status**: 200 OK

---

## 8. Profile (`/api/profile`)

### GET `/api/profile/me`
**Description**: Get current user profile
**Auth**: Authenticated
**Response**: `UserProfileDto`
**Status**: 200 OK

### GET `/api/profile/admin/participants/{userId}`
**Description**: Get user profile (admin view)
**Auth**: Admin
**Response**: `UserProfileDto` (includes admin notes, probation status)
**Status**: 200 OK

### PUT `/api/profile/users/{userId}`
**Description**: Update user profile
**Auth**: Admin or Self
**Body**: User profile fields
**Response**: Updated profile
**Status**: 200 OK

### POST `/api/profile/users/{userId}/avatar-upload-slot`
**Description**: Request upload slot for avatar
**Auth**: Admin or Self
**Response**: `{ uploadUrl: sasUrl }`
**Status**: 200 OK

### PUT `/api/profile/preferences`
**Description**: Update user preferences
**Auth**: Authenticated
**Body**:
```json
{
  "emailNotificationsEnabled": boolean,
  "darkModeEnabled": boolean
}
```
**Response**: Updated preferences
**Status**: 200 OK

### POST `/api/profile/admin/participants/{userId}/notes`
**Description**: Add admin note for user
**Auth**: Admin
**Body**:
```json
{
  "text": "string"
}
```
**Response**: `UserAdminNoteDto`
**Status**: 200 OK

### POST `/api/profile/admin/participants/{userId}/probation`
**Description**: Set user probation status
**Auth**: Admin
**Body**:
```json
{
  "isOnProbation": boolean,
  "probationReason": "string"
}
```
**Response**: Updated user status
**Status**: 200 OK

---

## 9. Admin Participants (`/api/admin/participants`)

### GET `/api/admin/participants`
**Description**: List all participants (users) with role, status, and enrollment info for admin management
**Auth**: Admin
**Response**: `AdminParticipantsDto` (users + the course options used by the enroll UI)
**Status**: 200 OK

### POST `/api/admin/participants/enrollments`
**Description**: Enroll users in courses
**Auth**: Admin
**Body**:
```json
{
  "userIds": ["guid", "guid"],
  "courseId": "string"
}
```
**Response**: Success
**Status**: 200 OK

### DELETE `/api/admin/participants/enrollments`
**Description**: Unenroll users from courses
**Auth**: Admin
**Body**:
```json
{
  "userIds": ["guid", "guid"],
  "courseId": "string"
}
```
**Response**: Success
**Status**: 200 OK

### PATCH `/api/admin/participants/{userId}/toggle-active`
**Description**: Activate / deactivate a user account
**Auth**: Admin
**Response**: Updated user status
**Status**: 200 OK

### PATCH `/api/admin/participants/{userId}/toggle-admin`
**Description**: Grant / revoke a user's admin role
**Auth**: Admin
**Response**: Updated user
**Status**: 200 OK

### POST `/api/admin/participants/{userId}/notes/export-docx`
**Description**: Export user admin notes to DOCX
**Auth**: Admin
**Response**: File download
**Status**: 200 OK

---

## 10. Comments (`/api/assignments/{assignmentId}/comments`)

### GET `/api/assignments/{assignmentId}/comments`
**Description**: Get comments for assignment submissions
**Auth**: Authenticated
**Query Params**: `?submissionId={submissionId}`
**Response**: `FeedbackCommentDto[]`
**Status**: 200 OK

### POST `/api/assignments/{assignmentId}/comments`
**Description**: Add comment to submission
**Auth**: Authenticated
**Body**:
```json
{
  "submissionId": "guid",
  "message": "string",
  "filePath": "string",
  "lineStart": number,
  "lineEnd": number
}
```
**Response**: `FeedbackCommentDto`
**Status**: 200 OK

---

## 11. Home (`/api/home`)

### GET `/api/home/dashboard`
**Description**: Get dashboard data for current user
**Auth**: Authenticated
**Response**: `DashboardDto` (includes courses, upcoming assignments, recent submissions)
**Status**: 200 OK

### POST `/api/home/years`
**Description**: Create academic year
**Auth**: Admin
**Body**:
```json
{
  "name": "string",
  "startDate": "datetime",
  "endDate": "datetime"
}
```
**Response**: Created year
**Status**: 201 Created

### POST `/api/home/years/{yearId}/set-active`
**Description**: Set active academic year
**Auth**: Admin
**Response**: Success
**Status**: 200 OK

### POST `/api/home/levels/{courseId}/description`
**Description**: Update a level's (course's) description shown on the dashboard
**Auth**: Instructor / Admin
**Body**:
```json
{
  "description": "string"
}
```
**Response**: Success
**Status**: 200 OK

**Note**: "Academic years" are modeled by the `Cohort` entity; the `years` endpoints create/activate cohorts, and "levels" are the `Course` records within a cohort.

---

## 12. Attendance (`/api/admin/attendance`)

Attendance is recorded per **level** (`Course`) per **date**, one row per (level, student, day). Admin-only.

**Status codes** are sent as single letters: `P` Present · `L` Late · `E` Excused · `U` Unexcused · `Z` Zoom (remote).

### GET `/api/admin/attendance?courseId={courseId}&year={year}&month={month}`
**Description**: Get the attendance grid for a level for a given month — the day columns (with each day's `sessionType`), the roster of students, their existing marks, and per-student tallies.
**Auth**: Admin
**Query Params**: `courseId` (the level), `year`, `month`
**Response**: `AttendanceGridDto` → `{ courseId, courseTitle, year, month, days: [{ date, dayOfWeek, sessionType }], students: [{ studentId, name, marks: [{ date, status }], presentCount, lateCount, excusedCount, unexcusedCount, zoomCount }] }`
**Status**: 200 OK

### POST `/api/admin/attendance`
**Description**: Upsert attendance marks for a level (each mark carries its own date, so a single call can span multiple days). A `null` status clears that mark.
**Auth**: Admin
**Body**:
```json
{
  "courseId": "guid",
  "marks": [
    { "studentId": "guid", "date": "YYYY-MM-DD", "status": "P | L | E | U | Z | null", "note": "string?" }
  ]
}
```
**Response**: Success
**Status**: 200 OK

---

## 13. Reports (`/api/reports`)

Claude-generated weekly progress reports (per-student `StudentProgress` and per-cohort `ClassSummary`). Generation runs in a Hangfire job — weekly on a schedule and on-demand via the trigger endpoints. See `docs/04-CLAUDE-REPORTS-ROADMAP.md`.

### GET `/api/reports`
**Description**: List progress reports, with optional filters
**Auth**: Admin / Instructor
**Query Params** (all optional): `?cohortId={cohortId}&weekOf={date}&reportType={StudentProgress|ClassSummary}`
**Response**: `ProgressReportSummaryDto[]`
**Status**: 200 OK

### GET `/api/reports/students`
**Description**: List students available for on-demand report generation
**Auth**: Admin / Instructor
**Response**: `StudentOptionDto[]`
**Status**: 200 OK

### GET `/api/reports/{id}`
**Description**: Get a single report's full detail (including Claude's markdown content)
**Auth**: Admin / Instructor
**Response**: `ProgressReportDetailDto`
**Status**: 200 OK

### PATCH `/api/reports/{id}/publish`
**Description**: Publish a report (review gate: transitions `Generated` → `Published`)
**Auth**: Admin / Instructor
**Response**: Updated report
**Status**: 200 OK

### GET `/api/reports/{id}/download`
**Description**: Download a report as a DOCX file
**Auth**: Admin / Instructor
**Response**: File download (`Content-Disposition` with filename)
**Status**: 200 OK

### POST `/api/reports/trigger`
**Description**: Trigger a weekly run for all active students (enqueues a Hangfire job)
**Auth**: Admin
**Query Params**: `?cohortId={cohortId}` (optional)
**Response**: `{ jobId: string, message: string }`
**Status**: 200 OK

### POST `/api/reports/trigger/student/{studentId}`
**Description**: Trigger a report for a single student
**Auth**: Admin
**Query Params**: `?cohortId={cohortId}` (optional)
**Response**: `{ jobId: string, message: string }`
**Status**: 200 OK

### POST `/api/reports/trigger/class`
**Description**: Trigger a class-summary report for a cohort
**Auth**: Admin
**Query Params**: `?cohortId={cohortId}` (optional)
**Response**: `{ jobId: string, message: string }`
**Status**: 200 OK

---

## 14. Transcript (`/api/transcript`)

### GET `/api/transcript/{userId}/download`
**Description**: Download a student's grade transcript as a file
**Auth**: Admin / Instructor (or self, per authorization policy)
**Response**: File download (`Content-Disposition` with filename)
**Status**: 200 OK

---

## Authentication

Every endpoint requires a JWT bearer token except these four, which are `[AllowAnonymous]`:
`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/forgot-password`
and `/api/auth/reset-password`.

```
Authorization: Bearer <token>
```

From the browser, you never set this header yourself. Tokens live in httpOnly cookies and
requests go to `/api/proxy/*`, where the Next.js route handler attaches the bearer
server-side and transparently refreshes once on a 401.

## Role-Based Authorization

- **Admin**: Full access to all endpoints
- **Instructor**: Access to course management, grading, and instructor-specific endpoints
- **Student**: Access to learning materials, submissions, and profile management

Role alone is not always sufficient. Lesson content additionally requires the caller to be
**enrolled in the owning course** (staff bypass this), and submission endpoints check
**object-level ownership** — a student can only read and complete their own submissions.

> **Known gap:** there is no instructor-to-course relationship in the domain, so any
> Instructor can currently reach any course's submissions, grades and reports. Course
> detail and assignment reads are also not enrollment-scoped yet. Tracked as M1 and M2 in
> [`PROJECT-REVIEW.md`](../PROJECT-REVIEW.md).

## Error Responses

All errors follow the RFC 7807 Problem Details format:

```json
{
  "type": "string",
  "title": "string",
  "status": 400,
  "detail": "string",
  "instance": "string"
}
```

Common status codes:
- 400 Bad Request - Validation error
- 401 Unauthorized - Missing or invalid token
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error
