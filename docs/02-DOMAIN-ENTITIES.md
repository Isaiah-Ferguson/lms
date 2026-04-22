# CodeStack LMS - Domain Entities & Relationships

## Entity-Relationship Diagram (Description)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │────────▶│UserCourse   │◀────────│   Course    │
│             │  1:N    │ Enrollment  │  N:1    │             │
│ - Id        │         │             │         │ - Id        │
│ - Email     │         │ - UserId    │         │ - Title     │
│ - Role      │         │ - CourseId  │         │ - Desc      │
│ - Name      │         │ - EnrolledAt│         └─────────────┘
│ - GitHub    │         └─────────────┘              │
└─────────────┘                                      │ 1:N
      │                                              ▼
      │ 1:N (Submissions)                      ┌─────────────┐
      │                                        │   Module    │
      │                                        │             │
      │                                        │ - Id        │
      │                                        │ - CourseId  │
      │                                        │ - Title     │
      │                                        │ - Order     │
      │                                        │ - WeekNum   │
      │                                        └─────────────┘
      │                                                │
      │                                                │ 1:N
      │                                                ▼
      │                                        ┌─────────────┐
      │                                        │   Lesson    │
      │                                        │             │
      │                                        │ - Id        │
      │                                        │ - ModuleId  │
      │                                        │ - Type      │
      │                                        │ - VideoUrl  │
      │                                        │ - TextCont  │
      │                                        │ - LinkUrl   │
      │                                        └─────────────┘
      │                                                │
      │                                                │ 1:N
      │                                                ▼
      │                                        ┌─────────────┐
      │                                        │LessonArtif  │
      │                                        │             │
      │                                        │ - Id        │
      │                                        │ - LessonId  │
      │                                        │ - BlobPath  │
      │                                        │ - FileName  │
      │                                        └─────────────┘
      │
      │ 1:N
      ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │────────▶│ Submission  │◀────────│ Assignment  │
│             │  1:N    │             │  N:1    │             │
│ (Student)   │         │ - Id        │         │ - Id        │
└─────────────┘         │ - AssignId  │         │ - ModuleId  │
      │                 │ - StudentId │         │ - Title     │
      │                 │ - Attempt   │         │ - AttachUrl │
      │                 │ - Type      │         │ - DueDate   │
      │                 │ - Status    │         └─────────────┘
      │                 └─────────────┘
      │                         │
      │                         │ 1:N
      │                         ▼
      │                 ┌─────────────┐
      │                 │SubmissArtif │
      │                 │             │
      │                 │ - Id        │
      │                 │ - SubmissId │
      │                 │ - BlobPath  │
      │                 │ - FileName  │
      │                 └─────────────┘
      │
      │                         │ 1:1
      │                         ▼
      │                 ┌─────────────┐
      │                 │GitHubSub    │
      │                 │ Info        │
      │                 │             │
      │                 │ - Id        │
      │                 │ - SubmissId │
      │                 │ - RepoUrl   │
      │                 │ - Commit    │
      │                 └─────────────┘
      │
      │                         │ 1:1
      │                         ▼
      │                 ┌─────────────┐
      └────────────────▶│    Grade    │
                1:N     │             │
                (Graded)│ - Id        │
                        │ - SubmissId │
                        │ - InstrId   │
                        │ - TotalScore│
                        │ - RubricJson│
                        │ - Comment   │
                        └─────────────┘
                              │
                              │ 1:N
                              ▼
                        ┌─────────────┐
                        │FeedbackCom  │
                        │ ment        │
                        │             │
                        │ - Id        │
                        │ - SubmissId │
                        │ - AuthorId  │
                        │ - Message   │
                        └─────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    Cohort   │────────▶│CohortCourse │◀────────│   Course    │
│             │  1:N    │             │  N:1    │             │
│ - Id        │         │ - CohortId  │         └─────────────┘
│ - Name      │         │ - CourseId  │
│ - StartDate │         └─────────────┘
│ - EndDate   │
└─────────────┘

┌─────────────┐
│ Announcement│
│             │
│ - Id        │
│ - CourseId  │
│ - Title     │
│ - Body      │
│ - AnnouncedAt│
└─────────────┘

┌─────────────┐
│UserAdminNote│
│             │
│ - Id        │
│ - TargetId  │
│ - AuthorId  │
│ - Text      │
└─────────────┘
```

## Core Entities

### 1. User
**Purpose**: Represents all system users (Students, Instructors, Admins)

```csharp
public class User : BaseEntity, IAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Town { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string GitHubUsername { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = false;
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool DarkModeEnabled { get; set; } = false;
    public bool IsOnProbation { get; set; } = false;
    public string ProbationReason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<Grade> GradesGiven { get; set; } = new List<Grade>();
    public ICollection<FeedbackComment> FeedbackComments { get; set; } = new List<FeedbackComment>();
    public ICollection<UserCourseEnrollment> CourseEnrollments { get; set; } = new List<UserCourseEnrollment>();
    public ICollection<UserAdminNote> AdminNotesReceived { get; set; } = new List<UserAdminNote>();
    public ICollection<UserAdminNote> AdminNotesAuthored { get; set; } = new List<UserAdminNote>();
}

public enum UserRole
{
    Student = 1,
    Instructor = 2,
    Admin = 3
}
```

### 2. Course
**Purpose**: Represents a course offering

```csharp
public class Course : BaseEntity, IAuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<CohortCourse> CohortCourses { get; set; } = new List<CohortCourse>();
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<UserCourseEnrollment> UserEnrollments { get; set; } = new List<UserCourseEnrollment>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
}
```

### 3. UserCourseEnrollment
**Purpose**: Links students to courses

```csharp
public class UserCourseEnrollment : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public DateTime EnrolledAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
```

### 4. Module
**Purpose**: Organizes course content into weeks or sections

```csharp
public class Module : BaseEntity, IAuditableEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public int? WeekNumber { get; set; }
    public string? DateRange { get; set; }
    public string? ZoomUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Course Course { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
```

### 5. Lesson
**Purpose**: Course content unit (video, text, or link)

```csharp
public class Lesson : BaseEntity, IAuditableEntity
{
    public Guid ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public LessonType Type { get; set; }

    // Video lesson fields
    public string? VideoUrl { get; set; }
    public string? VideoBlobPath { get; set; }
    public VideoSourceType VideoSource { get; set; } = VideoSourceType.None;
    public string? VideoMimeType { get; set; }
    public int? DurationSeconds { get; set; }

    // Text lesson fields
    public string? TextContent { get; set; }

    // Link lesson fields
    public string? LinkUrl { get; set; }
    public string? LinkDescription { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Module Module { get; set; } = null!;
    public ICollection<LessonArtifact> Artifacts { get; set; } = new List<LessonArtifact>();
}

public enum LessonType
{
    Video = 1,
    Text = 2,
    Link = 3
}

public enum VideoSourceType
{
    None = 0,
    AzureBlob = 1,
    AzureFrontDoor = 2,
    External = 3,
    HlsManifest = 4,
    DashManifest = 5
}
```

### 6. LessonArtifact
**Purpose**: Attachments for lessons (files, resources)

```csharp
public class LessonArtifact : BaseEntity
{
    public Guid LessonId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Lesson Lesson { get; set; } = null!;
}
```

### 7. Assignment
**Purpose**: Work assigned to students

```csharp
public class Assignment : BaseEntity, IAuditableEntity
{
    public Guid ModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AssignmentType { get; set; } = "Challenge";
    public string Instructions { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string? AttachmentUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Module Module { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
```

### 8. Submission
**Purpose**: Student's submitted work

```csharp
public class Submission : BaseEntity, IAuditableEntity
{
    public Guid AssignmentId { get; set; }
    public Guid StudentId { get; set; }
    public int AttemptNumber { get; set; }
    public SubmissionType Type { get; set; }
    public SubmissionStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Assignment Assignment { get; set; } = null!;
    public User Student { get; set; } = null!;
    public ICollection<SubmissionArtifact> Artifacts { get; set; } = new List<SubmissionArtifact>();
    public GitHubSubmissionInfo? GitHubInfo { get; set; }
    public Grade? Grade { get; set; }
    public ICollection<FeedbackComment> FeedbackComments { get; set; } = new List<FeedbackComment>();
}

public enum SubmissionType
{
    Upload = 1,
    GitHub = 2
}

public enum SubmissionStatus
{
    Draft = 1,
    PendingUpload = 2,
    Uploaded = 3,
    Processing = 4,
    ReadyToGrade = 5,
    Grading = 6,
    Graded = 7,
    Returned = 8
}
```

### 9. SubmissionArtifact
**Purpose**: Files uploaded with a submission

```csharp
public class SubmissionArtifact : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long Size { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Checksum { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Submission Submission { get; set; } = null!;
}
```

### 10. GitHubSubmissionInfo
**Purpose**: GitHub repository information for GitHub-based submissions

```csharp
public class GitHubSubmissionInfo : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public string RepoUrl { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Submission Submission { get; set; } = null!;
}
```

### 11. Grade
**Purpose**: Instructor's evaluation of submission

```csharp
public class Grade : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Guid InstructorId { get; set; }
    public decimal TotalScore { get; set; }
    public string RubricBreakdownJson { get; set; } = string.Empty;
    public string OverallComment { get; set; } = string.Empty;
    public DateTime GradedAt { get; set; }

    // Navigation properties
    public Submission Submission { get; set; } = null!;
    public User Instructor { get; set; } = null!;
}
```

### 12. FeedbackComment
**Purpose**: Comments on submissions (can include line-specific feedback)

```csharp
public class FeedbackComment : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Guid AuthorId { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Optional file-specific feedback
    public string? FilePath { get; set; }
    public int? LineStart { get; set; }
    public int? LineEnd { get; set; }

    // Navigation properties
    public Submission Submission { get; set; } = null!;
    public User Author { get; set; } = null!;
}
```

### 13. Cohort
**Purpose**: Represents a cohort or class start date

```csharp
public class Cohort : BaseEntity, IAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<CohortCourse> CohortCourses { get; set; } = new List<CohortCourse>();
}
```

### 14. CohortCourse
**Purpose**: Junction table linking cohorts to courses

```csharp
public class CohortCourse : BaseEntity
{
    public Guid CohortId { get; set; }
    public Guid CourseId { get; set; }

    // Navigation properties
    public Cohort Cohort { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
```

### 15. Announcement
**Purpose**: Course announcements

```csharp
public class Announcement : BaseEntity, IAuditableEntity
{
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Tag { get; set; }
    public DateTime AnnouncedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Course Course { get; set; } = null!;
}
```

### 16. UserAdminNote
**Purpose**: Admin notes about users

```csharp
public class UserAdminNote : BaseEntity, IAuditableEntity
{
    public Guid TargetUserId { get; set; }
    public Guid AuthorUserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User TargetUser { get; set; } = null!;
    public User AuthorUser { get; set; } = null!;
}
```

## Base Classes & Interfaces

```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; }
}

public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
}
```

## Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User → UserCourseEnrollment | 1:N | Student enrolls in multiple courses |
| Course → UserCourseEnrollment | 1:N | Course has multiple students |
| Course → Module | 1:N | Course contains multiple modules |
| Module → Lesson | 1:N | Module contains multiple lessons |
| Module → Assignment | 1:N | Module contains multiple assignments |
| Lesson → LessonArtifact | 1:N | Lesson has multiple artifacts/attachments |
| Assignment → Submission | 1:N | Assignment receives multiple submissions |
| User → Submission | 1:N | Student submits multiple assignments |
| Submission → SubmissionArtifact | 1:N | Submission has multiple files |
| Submission → GitHubSubmissionInfo | 1:0..1 | Submission may have GitHub info |
| Submission → Grade | 1:0..1 | Each submission gets one grade (optional) |
| User → Grade | 1:N | Instructor grades multiple submissions |
| Submission → FeedbackComment | 1:N | Submission has multiple feedback comments |
| User → FeedbackComment | 1:N | User can comment on multiple submissions |
| Cohort → CohortCourse | 1:N | Cohort contains multiple courses |
| Course → CohortCourse | 1:N | Course can be in multiple cohorts |
| Course → Announcement | 1:N | Course has multiple announcements |
| User → UserAdminNote | 1:N | User can receive multiple admin notes |
| User → UserAdminNote (authored) | 1:N | User can author multiple admin notes |

## Database Indexes

**Critical for Performance:**

```sql
-- User lookups
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_Role ON Users(Role);
CREATE INDEX IX_Users_GitHubUsername ON Users(GitHubUsername);

-- Enrollment queries
CREATE INDEX IX_UserCourseEnrollments_UserId ON UserCourseEnrollments(UserId);
CREATE INDEX IX_UserCourseEnrollments_CourseId ON UserCourseEnrollments(CourseId);
CREATE INDEX IX_UserCourseEnrollments_UserId_CourseId ON UserCourseEnrollments(UserId, CourseId);

-- Course queries
CREATE INDEX IX_Courses_Title ON Courses(Title);

-- Module queries
CREATE INDEX IX_Modules_CourseId ON Modules(CourseId);
CREATE INDEX IX_Modules_Order ON Modules(CourseId, Order);

-- Lesson queries
CREATE INDEX IX_Lessons_ModuleId ON Lessons(ModuleId);
CREATE INDEX IX_Lessons_Order ON Lessons(ModuleId, Order);

-- Assignment queries
CREATE INDEX IX_Assignments_ModuleId ON Assignments(ModuleId);
CREATE INDEX IX_Assignments_DueDate ON Assignments(DueDate);

-- Submission queries
CREATE INDEX IX_Submissions_AssignmentId ON Submissions(AssignmentId);
CREATE INDEX IX_Submissions_StudentId ON Submissions(StudentId);
CREATE INDEX IX_Submissions_Status ON Submissions(Status);
CREATE INDEX IX_Submissions_AssignmentId_StudentId ON Submissions(AssignmentId, StudentId);

-- Grade queries
CREATE INDEX IX_Grades_SubmissionId ON Grades(SubmissionId);
CREATE INDEX IX_Grades_InstructorId ON Grades(InstructorId);

-- Cohort queries
CREATE INDEX IX_Cohorts_IsActive ON Cohorts(IsActive);
CREATE INDEX IX_CohortCourses_CohortId ON CohortCourses(CohortId);
CREATE INDEX IX_CohortCourses_CourseId ON CohortCourses(CourseId);

-- Announcement queries
CREATE INDEX IX_Announcements_CourseId ON Announcements(CourseId);
CREATE INDEX IX_Announcements_AnnouncedAt ON Announcements(AnnouncedAt);

-- Feedback comment queries
CREATE INDEX IX_FeedbackComments_SubmissionId ON FeedbackComments(SubmissionId);
CREATE INDEX IX_FeedbackComments_AuthorId ON FeedbackComments(AuthorId);

-- Admin note queries
CREATE INDEX IX_UserAdminNotes_TargetUserId ON UserAdminNotes(TargetUserId);
CREATE INDEX IX_UserAdminNotes_AuthorUserId ON UserAdminNotes(AuthorUserId);
```

## Data Constraints

```csharp
// User
- Email: Unique, Required, MaxLength(255)
- PasswordHash: Required
- Name: Required
- Role: Required

// Course
- Title: Required, MaxLength(200)
- Description: Required

// Module
- Title: Required
- CourseId: Required, FK to Course
- Order: Required

// Lesson
- Title: Required
- ModuleId: Required, FK to Module
- Order: Required
- Type: Required
- At least one of: VideoBlobPath (for Video), TextContent (for Text), or LinkUrl (for Link)

// Assignment
- Title: Required, MaxLength(300)
- ModuleId: Required, FK to Module
- AssignmentType: Required, MaxLength(50), Default: "Challenge"
- Instructions: Required
- DueDate: Required
- AttachmentUrl: Optional, MaxLength(2048) - URL to assignment files/resources

// Submission
- AssignmentId: Required, FK
- StudentId: Required, FK
- Type: Required
- Status: Required
- AttemptNumber: Required, >= 1
- If Type is Upload: must have at least one SubmissionArtifact
- If Type is GitHub: must have GitHubSubmissionInfo

// Grade
- SubmissionId: Required, Unique (1:1)
- InstructorId: Required, FK
- TotalScore: Required, >= 0, <= 100 (fixed 100-point scale)
- RubricBreakdownJson: Required (JSON for detailed breakdown)
- OverallComment: Required

// Cohort
- Name: Required
- StartDate: Required
- EndDate: Required

// Announcement
- Title: Required
- Body: Required
- CourseId: Required, FK
- AnnouncedAt: Required

// FeedbackComment
- SubmissionId: Required, FK
- AuthorId: Required, FK
- Message: Required

// UserAdminNote
- TargetUserId: Required, FK
- AuthorUserId: Required, FK
- Text: Required
```

## Audit Trail

All entities implementing `IAuditableEntity` automatically track:
- `CreatedAt`: Set on insert via EF Core interceptor
- `UpdatedAt`: Set on update via EF Core interceptor

This is handled by `AuditableEntityInterceptor` in the Infrastructure layer.
