# CodeStack LMS - REST API Endpoints

**Base URL**: `/api`

**Common Response Formats**:
```typescript
// Success
{ data: T, message?: string }

// Error
{ title: string, status: number, detail: string }

// Created
Status: 201 Created, body: { data: T, message?: string }
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
**Response**: `{ token: string, refreshToken: string, user: UserDto }`
**Status**: 200 OK

### POST `/api/auth/register`
**Description**: Register new user
**Auth**: Public
**Body**:
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```
**Response**: `{ message: "Account created successfully." }`
**Status**: 201 Created

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
**Description**: Request upload slot for file submission
**Auth**: Authenticated (Student)
**Body**:
```json
{
  "fileNames": ["file1.pdf", "file2.zip"]
}
```
**Response**: `{ submissionId, uploadUrls: { fileName: sasUrl } }`
**Status**: 200 OK

### POST `/api/submissions/{submissionId}/complete-upload`
**Description**: Mark file upload as complete
**Auth**: Authenticated (Student)
**Body**:
```json
{
  "artifacts": [
    { "fileName": "file1.pdf", "size": 12345, "contentType": "application/pdf", "checksum": "..." }
  ]
}
```
**Response**: Success
**Status**: 200 OK

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

### GET `/api/lessons/{lessonId}/video-token`
**Description**: Get SAS token for video streaming
**Auth**: Authenticated
**Response**: `{ sasUrl: string, expiresAt: DateTime }`
**Status**: 200 OK

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

---

## 12. Debug (`/api/debug`)

### GET `/api/debug/check-email/{email}`
**Description**: Check if email exists
**Auth**: Public (debug only)
**Response**: `{ exists: boolean }`
**Status**: 200 OK

### GET `/api/debug/all-emails`
**Description**: Get all user emails
**Auth**: Public (debug only)
**Response**: `string[]`
**Status**: 200 OK

---

## Authentication

All endpoints except `/api/auth/login`, `/api/auth/register`, and debug endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <token>
```

## Role-Based Authorization

- **Admin**: Full access to all endpoints
- **Instructor**: Access to course management, grading, and instructor-specific endpoints
- **Student**: Access to learning materials, submissions, and profile management

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
