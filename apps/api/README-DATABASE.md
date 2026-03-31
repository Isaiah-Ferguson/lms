# CodeStack LMS - Database Implementation Summary

## 📋 What's Been Generated

Complete MySQL database schema with EF Core implementation for CodeStack LMS.

## 📁 Files Created

### Domain Layer (`CodeStackLMS.Domain/`)

**Enums** (4 files):
- `Enums/UserRole.cs` - Student(1), Instructor(2), Admin(3)
- `Enums/LessonType.cs` - Video(1), Text(2), Link(3)
- `Enums/SubmissionType.cs` - Upload(1), GitHub(2)
- `Enums/SubmissionStatus.cs` - Draft(1), Submitted(2), Grading(3), Graded(4), Returned(5)

**Common** (2 files):
- `Common/BaseEntity.cs` - Base class with GUID Id
- `Common/IAuditableEntity.cs` - Interface for CreatedAt/UpdatedAt tracking

**Entities** (12 files):
- `Entities/User.cs` - Users with roles
- `Entities/Cohort.cs` - Student cohorts/groups
- `Entities/Course.cs` - Courses
- `Entities/CohortCourse.cs` - Many-to-many cohort-course relationship
- `Entities/Module.cs` - Course modules
- `Entities/Lesson.cs` - Lessons (video/text/link)
- `Entities/Assignment.cs` - Assignments with rubrics
- `Entities/Submission.cs` - Student submissions
- `Entities/SubmissionArtifact.cs` - Uploaded files
- `Entities/GitHubSubmissionInfo.cs` - GitHub repo details
- `Entities/Grade.cs` - Grading with rubric breakdown
- `Entities/FeedbackComment.cs` - Code-level feedback

### Infrastructure Layer (`CodeStackLMS.Infrastructure/`)

**Persistence** (2 files):
- `Persistence/ApplicationDbContext.cs` - Main DbContext with auto-audit
- `Persistence/ApplicationDbContextSeed.cs` - Seed data with default users

**Configurations** (12 files):
All using Fluent API for entity configuration:
- `Configurations/UserConfiguration.cs`
- `Configurations/CohortConfiguration.cs`
- `Configurations/CourseConfiguration.cs`
- `Configurations/CohortCourseConfiguration.cs`
- `Configurations/ModuleConfiguration.cs`
- `Configurations/LessonConfiguration.cs`
- `Configurations/AssignmentConfiguration.cs`
- `Configurations/SubmissionConfiguration.cs`
- `Configurations/SubmissionArtifactConfiguration.cs`
- `Configurations/GitHubSubmissionInfoConfiguration.cs`
- `Configurations/GradeConfiguration.cs`
- `Configurations/FeedbackCommentConfiguration.cs`

### API Layer (`CodeStackLMS.API/`)

- `Program.cs` - Application startup with DbContext registration
- `appsettings.json` - Production configuration
- `appsettings.Development.json` - Development configuration

### Documentation (3 files)

- `MIGRATION-NOTES.md` - EF Core migration commands and tips
- `MYSQL-SCHEMA.sql` - Raw SQL schema for reference
- `DATABASE-SETUP.md` - Complete setup guide with examples

## 🎯 Key Features Implemented

### 1. **GUID Primary Keys**
All entities use GUIDs (stored as CHAR(36) in MySQL) for globally unique identifiers.

### 2. **Automatic Audit Tracking**
Entities implementing `IAuditableEntity` automatically get:
- `CreatedAt` set on insert
- `UpdatedAt` set on update

### 3. **Comprehensive Indexes**
- Unique constraints on emails, composite keys
- Performance indexes on foreign keys, dates, status fields
- Composite indexes for common query patterns (e.g., CourseId + Order)

### 4. **Flexible Lesson Types**
Lessons support three content types:
- **Video**: URL, blob path, duration
- **Text**: Markdown content
- **Link**: External URL with description

### 5. **Dual Submission Types**
Students can submit via:
- **File Upload**: Multiple files tracked in SubmissionArtifacts
- **GitHub**: Repo URL, branch, and commit hash

### 6. **Multiple Submission Attempts**
Unique constraint on (AssignmentId, StudentId, AttemptNumber) allows tracking multiple attempts.

### 7. **JSON Storage**
- `Assignment.RubricJson` - Flexible rubric structure
- `Grade.RubricBreakdownJson` - Detailed scoring per criterion

### 8. **Code-Level Feedback**
FeedbackComments support:
- General comments
- File-level comments (FilePath)
- Line-specific comments (FilePath + LineStart/LineEnd)

### 9. **Cascading Deletes**
Proper cascade rules:
- Delete course → deletes modules, lessons, assignments
- Delete submission → deletes artifacts, GitHub info, grade, feedback
- User deletions restricted (prevent orphaned data)

## 🚀 Quick Start

### 1. Install Packages

```bash
# Navigate to Infrastructure project
cd apps/api/src/CodeStackLMS.Infrastructure

# Install MySQL provider
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design

# Navigate to API project
cd ../CodeStackLMS.API

# Install BCrypt for password hashing
dotnet add package BCrypt.Net-Next
```

### 2. Configure Connection String

Edit `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=codestack_lms;User=root;Password=your_password;"
  }
}
```

### 3. Create and Apply Migration

```bash
# From Infrastructure project directory
cd apps/api/src/CodeStackLMS.Infrastructure

# Create migration
dotnet ef migrations add InitialCreate --startup-project ../CodeStackLMS.API

# Apply to database
dotnet ef database update --startup-project ../CodeStackLMS.API
```

### 4. Run Application

```bash
cd ../CodeStackLMS.API
dotnet run
```

Database will be automatically seeded with default users on first run.

## 👥 Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@codestack.com | Admin123! |
| Instructor | instructor@codestack.com | Instructor123! |
| Student | student@codestack.com | Student123! |

## 📊 Database Schema Overview

```
Users (12 entities total)
├── User (authentication & roles)
├── Cohort (student groups)
├── Course (course catalog)
├── CohortCourse (cohort-course linking)
├── Module (course structure)
├── Lesson (content: video/text/link)
├── Assignment (with JSON rubric)
├── Submission (student work)
├── SubmissionArtifact (uploaded files)
├── GitHubSubmissionInfo (GitHub repos)
├── Grade (with JSON breakdown)
└── FeedbackComment (code-level feedback)
```

## 🔍 Example Queries

### Get Course with Modules and Lessons
```csharp
var course = await _context.Courses
    .Include(c => c.Modules.OrderBy(m => m.Order))
        .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
    .FirstOrDefaultAsync(c => c.Id == courseId);
```

### Get Submission with Grade and Feedback
```csharp
var submission = await _context.Submissions
    .Include(s => s.Assignment)
    .Include(s => s.Grade)
        .ThenInclude(g => g.Instructor)
    .Include(s => s.FeedbackComments)
        .ThenInclude(fc => fc.Author)
    .Include(s => s.Artifacts)
    .Include(s => s.GitHubInfo)
    .FirstOrDefaultAsync(s => s.Id == submissionId);
```

### Get All Submissions for Assignment
```csharp
var submissions = await _context.Submissions
    .Include(s => s.Student)
    .Include(s => s.Artifacts)
    .Where(s => s.AssignmentId == assignmentId)
    .OrderByDescending(s => s.CreatedAt)
    .ToListAsync();
```

## 📈 Performance Optimizations

### Indexes Created (40+ total)
- **Unique**: Email, CohortId+CourseId, AssignmentId+StudentId+AttemptNumber, SubmissionId (grades/GitHub)
- **Foreign Keys**: All relationships indexed
- **Composite**: CourseId+Order, ModuleId+Order, SubmissionId+FilePath
- **Query**: Status, CreatedAt, DueDate, Role, Type fields

### Connection Pooling
Configured in Program.cs with:
- Retry on failure (3 attempts)
- Command timeout (30 seconds)
- Detailed errors in development

## 🛡️ Security Features

1. **BCrypt Password Hashing** - Work factor 11
2. **Parameterized Queries** - Via EF Core (SQL injection prevention)
3. **Unique Email Constraint** - Prevent duplicate accounts
4. **Foreign Key Constraints** - Data integrity
5. **Cascade Rules** - Prevent orphaned records

## 📝 Migration Commands

```bash
# Create migration
dotnet ef migrations add MigrationName --startup-project ../CodeStackLMS.API

# Apply migrations
dotnet ef database update --startup-project ../CodeStackLMS.API

# Rollback
dotnet ef database update PreviousMigrationName --startup-project ../CodeStackLMS.API

# Generate SQL script
dotnet ef migrations script --output migration.sql --startup-project ../CodeStackLMS.API

# Remove last migration (if not applied)
dotnet ef migrations remove --startup-project ../CodeStackLMS.API

# Drop database
dotnet ef database drop --force --startup-project ../CodeStackLMS.API
```

## 🔧 Troubleshooting

### Build Errors
The lint errors in Program.cs are expected until you:
1. Create the actual .NET projects (.csproj files)
2. Add project references between API → Infrastructure → Domain
3. Install NuGet packages

### Connection Issues
- Verify MySQL is running
- Check credentials in connection string
- Ensure port 3306 is accessible
- Add `AllowPublicKeyRetrieval=true` if needed

### Character Encoding
Use UTF8MB4 for full Unicode support:
```sql
ALTER DATABASE codestack_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📚 Additional Resources

- **MIGRATION-NOTES.md** - Detailed migration instructions
- **DATABASE-SETUP.md** - Complete setup guide with examples
- **MYSQL-SCHEMA.sql** - Raw SQL schema for reference

## ✅ Next Steps

1. Create .NET projects and add references
2. Install required NuGet packages
3. Run migrations to create database
4. Verify seed data loaded correctly
5. Implement repository pattern (optional)
6. Add unit tests for DbContext
7. Configure logging for SQL queries

---

**Generated for**: CodeStack LMS  
**Database**: MySQL 8.0+  
**EF Core**: .NET 10  
**Provider**: Pomelo.EntityFrameworkCore.MySql
