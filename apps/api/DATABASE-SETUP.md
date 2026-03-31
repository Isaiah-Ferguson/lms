# CodeStack LMS - Database Setup Guide

## Overview

This document provides complete setup instructions for the MySQL database with EF Core for CodeStack LMS.

## File Structure

```
apps/api/src/
├── CodeStackLMS.Domain/
│   ├── Common/
│   │   ├── BaseEntity.cs
│   │   └── IAuditableEntity.cs
│   ├── Entities/
│   │   ├── User.cs
│   │   ├── Cohort.cs
│   │   ├── Course.cs
│   │   ├── CohortCourse.cs
│   │   ├── Module.cs
│   │   ├── Lesson.cs
│   │   ├── Assignment.cs
│   │   ├── Submission.cs
│   │   ├── SubmissionArtifact.cs
│   │   ├── GitHubSubmissionInfo.cs
│   │   ├── Grade.cs
│   │   └── FeedbackComment.cs
│   └── Enums/
│       ├── UserRole.cs
│       ├── LessonType.cs
│       ├── SubmissionType.cs
│       └── SubmissionStatus.cs
│
└── CodeStackLMS.Infrastructure/
    └── Persistence/
        ├── ApplicationDbContext.cs
        ├── ApplicationDbContextSeed.cs
        └── Configurations/
            ├── UserConfiguration.cs
            ├── CohortConfiguration.cs
            ├── CourseConfiguration.cs
            ├── CohortCourseConfiguration.cs
            ├── ModuleConfiguration.cs
            ├── LessonConfiguration.cs
            ├── AssignmentConfiguration.cs
            ├── SubmissionConfiguration.cs
            ├── SubmissionArtifactConfiguration.cs
            ├── GitHubSubmissionInfoConfiguration.cs
            ├── GradeConfiguration.cs
            └── FeedbackCommentConfiguration.cs
```

## Entity Relationships

```
User (1) ──────────────────────────────────┐
  │                                         │
  │ (1:N)                                   │ (1:N)
  │                                         │
Submission (N) ───(N:1)──▶ Assignment (N)  │
  │                           │             │
  │ (1:1)                     │ (N:1)       │ (1:N)
  │                           │             │
Grade (1)                   Module (N)      │
  │                           │             │
  │ (N:1)                     │ (N:1)       │
  │                           │             │
  └────────────────────────▶ User      Course (N)
                              │             │
                              │ (1:N)       │ (N:M)
                              │             │
                        FeedbackComment   CohortCourse
                                            │
                                            │ (N:1)
                                            │
                                          Cohort
```

## Key Features

### 1. GUID Primary Keys
All entities use GUID (Char(36) in MySQL) for globally unique identifiers.

### 2. Auditable Entities
Entities implementing `IAuditableEntity` automatically track:
- `CreatedAt`: Set on insert
- `UpdatedAt`: Set on update

### 3. Enum Storage
Enums stored as integers for performance:
- UserRole: 1=Student, 2=Instructor, 3=Admin
- LessonType: 1=Video, 2=Text, 3=Link
- SubmissionType: 1=Upload, 2=GitHub
- SubmissionStatus: 1=Draft, 2=Submitted, 3=Grading, 4=Graded, 5=Returned

### 4. JSON Columns
- `Assignment.RubricJson`: Flexible rubric structure
- `Grade.RubricBreakdownJson`: Detailed scoring breakdown

### 5. Flexible Lesson Content
Lessons support three types with conditional fields:
- **Video**: VideoUrl, VideoBlobPath, DurationSeconds
- **Text**: TextContent (markdown)
- **Link**: LinkUrl, LinkDescription

### 6. Submission Tracking
- Multiple attempts per assignment (AttemptNumber)
- Both file uploads (SubmissionArtifact) and GitHub repos (GitHubSubmissionInfo)
- Unique constraint on (AssignmentId, StudentId, AttemptNumber)

### 7. Code-Level Feedback
FeedbackComments support:
- General comments (no file/line)
- File-level comments (FilePath only)
- Line-specific comments (FilePath + LineStart/LineEnd)

## Indexes

### Performance Indexes
- **Users**: Email (unique), Role, IsActive
- **Submissions**: AssignmentId, StudentId, Status, CreatedAt
- **Modules/Lessons**: Composite indexes on (ParentId, Order) for sorting
- **Grades**: SubmissionId (unique), InstructorId, GradedAt

### Unique Constraints
- `Users.Email`: Prevent duplicate accounts
- `CohortCourses.(CohortId, CourseId)`: Prevent duplicate course assignments
- `Submissions.(AssignmentId, StudentId, AttemptNumber)`: Track attempts
- `GitHubSubmissionInfos.SubmissionId`: 1:1 relationship
- `Grades.SubmissionId`: 1:1 relationship

## Setup Instructions

### 1. Install Required Packages

```bash
cd apps/api/src/CodeStackLMS.Infrastructure
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design

cd ../CodeStackLMS.API
dotnet add package BCrypt.Net-Next
```

### 2. Configure Connection String

Edit `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=codestack_lms;User=root;Password=your_password;AllowPublicKeyRetrieval=true;"
  }
}
```

### 3. Register DbContext in Program.cs

```csharp
using CodeStackLMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString),
        mySqlOptions =>
        {
            mySqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null);
        }
    ));

var app = builder.Build();

// Seed database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await context.Database.MigrateAsync();
    await ApplicationDbContextSeed.SeedAsync(context);
}

app.Run();
```

### 4. Create Migration

```bash
cd apps/api/src/CodeStackLMS.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../CodeStackLMS.API
```

### 5. Apply Migration

```bash
dotnet ef database update --startup-project ../CodeStackLMS.API
```

## Seed Data

Default users (from `ApplicationDbContextSeed.cs`):

| Role | Email | Password | Name |
|------|-------|----------|------|
| Admin | admin@codestack.com | Admin123! | Admin User |
| Instructor | instructor@codestack.com | Instructor123! | John Instructor |
| Student | student@codestack.com | Student123! | Jane Student |

Sample data also includes:
- 1 Cohort: "Fall 2026 Cohort"
- 1 Course: "Introduction to Web Development"
- 1 Module: "Getting Started with HTML"
- 3 Lessons: Video, Text, and Link types
- 1 Assignment: "Build Your First HTML Page"

## Common Queries

### Get all submissions for an assignment with student info
```csharp
var submissions = await _context.Submissions
    .Include(s => s.Student)
    .Include(s => s.Artifacts)
    .Include(s => s.GitHubInfo)
    .Where(s => s.AssignmentId == assignmentId)
    .OrderByDescending(s => s.CreatedAt)
    .ToListAsync();
```

### Get course with all modules and lessons
```csharp
var course = await _context.Courses
    .Include(c => c.Modules.OrderBy(m => m.Order))
        .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
    .FirstOrDefaultAsync(c => c.Id == courseId);
```

### Get student's submission with grade and feedback
```csharp
var submission = await _context.Submissions
    .Include(s => s.Assignment)
    .Include(s => s.Grade)
        .ThenInclude(g => g.Instructor)
    .Include(s => s.FeedbackComments)
        .ThenInclude(fc => fc.Author)
    .FirstOrDefaultAsync(s => s.Id == submissionId);
```

### Get all courses for a cohort
```csharp
var courses = await _context.CohortCourses
    .Include(cc => cc.Course)
        .ThenInclude(c => c.Modules)
    .Where(cc => cc.CohortId == cohortId)
    .Select(cc => cc.Course)
    .ToListAsync();
```

## Migration Commands Reference

```bash
# Create new migration
dotnet ef migrations add MigrationName --startup-project ../CodeStackLMS.API

# Apply migrations
dotnet ef database update --startup-project ../CodeStackLMS.API

# Rollback to specific migration
dotnet ef database update PreviousMigrationName --startup-project ../CodeStackLMS.API

# Remove last migration (if not applied)
dotnet ef migrations remove --startup-project ../CodeStackLMS.API

# Generate SQL script
dotnet ef migrations script --startup-project ../CodeStackLMS.API --output migration.sql

# Drop database
dotnet ef database drop --startup-project ../CodeStackLMS.API --force
```

## Troubleshooting

### Connection Issues

**Error**: "Unable to connect to MySQL server"
- Verify MySQL is running: `sudo systemctl status mysql`
- Check connection string credentials
- Ensure MySQL port 3306 is accessible

### Migration Issues

**Error**: "Build failed"
- Ensure all projects compile: `dotnet build`
- Check for missing package references

**Error**: "No DbContext found"
- Verify you're in the Infrastructure project directory
- Or specify full path: `--project src/CodeStackLMS.Infrastructure`

### Character Encoding

**Error**: "Incorrect string value"
- Ensure database uses utf8mb4: `ALTER DATABASE codestack_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- Check connection string includes: `CharSet=utf8mb4`

## Performance Optimization

### Connection Pooling
```csharp
options.UseMySql(connectionString, serverVersion, mySqlOptions =>
{
    mySqlOptions.CommandTimeout(30);
    mySqlOptions.EnableRetryOnFailure(3);
});
```

### Query Optimization
- Use `.AsNoTracking()` for read-only queries
- Use `.Select()` to project only needed fields
- Avoid N+1 queries with `.Include()`
- Use pagination for large result sets

### Index Usage
```sql
-- Check index usage
SHOW INDEX FROM Submissions;

-- Analyze query performance
EXPLAIN SELECT * FROM Submissions WHERE StudentId = 'guid';
```

## Backup and Restore

### Backup
```bash
mysqldump -u root -p codestack_lms > backup.sql
```

### Restore
```bash
mysql -u root -p codestack_lms < backup.sql
```

## Security Considerations

1. **Password Hashing**: BCrypt with work factor 11
2. **SQL Injection**: Parameterized queries via EF Core
3. **Connection String**: Store in environment variables or Azure Key Vault
4. **Least Privilege**: Database user should have minimal required permissions

## Next Steps

1. Implement repository pattern (optional)
2. Add unit tests for DbContext
3. Configure logging for SQL queries
4. Set up database migrations in CI/CD
5. Configure read replicas for scaling (production)
