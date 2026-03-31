# EF Core Migration Notes for MySQL

## Prerequisites

1. Install EF Core tools:
```bash
dotnet tool install --global dotnet-ef
```

2. Install MySQL packages:
```bash
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design
```

## Connection String

Add to `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=codestack_lms;User=root;Password=your_password;"
  }
}
```

## Generate Initial Migration

From the `CodeStackLMS.Infrastructure` project directory:

```bash
dotnet ef migrations add InitialCreate --startup-project ../CodeStackLMS.API --context ApplicationDbContext
```

## Apply Migration to Database

```bash
dotnet ef database update --startup-project ../CodeStackLMS.API --context ApplicationDbContext
```

## Seed Data

The seed data will be applied automatically when the application starts. See `ApplicationDbContextSeed.cs`.

Default users created:
- **Admin**: admin@codestack.com / Admin123!
- **Instructor**: instructor@codestack.com / Instructor123!
- **Student**: student@codestack.com / Student123!

## Generate SQL Script (Optional)

To generate a SQL script without applying it:

```bash
dotnet ef migrations script --startup-project ../CodeStackLMS.API --context ApplicationDbContext --output migration.sql
```

## Remove Last Migration (if needed)

```bash
dotnet ef migrations remove --startup-project ../CodeStackLMS.API --context ApplicationDbContext
```

## MySQL-Specific Considerations

1. **JSON Columns**: MySQL 5.7.8+ supports native JSON type
2. **GUID Storage**: Stored as CHAR(36) by default
3. **Case Sensitivity**: Table/column names are case-sensitive on Linux
4. **Character Set**: UTF8MB4 recommended for full Unicode support

## Indexes Created

### Users
- `IX_Users_Email` (Unique)
- `IX_Users_Role`
- `IX_Users_IsActive`

### Cohorts
- `IX_Cohorts_Name`
- `IX_Cohorts_DateRange` (StartDate, EndDate)

### Courses
- `IX_Courses_Title`

### CohortCourses
- `IX_CohortCourses_CohortId_CourseId` (Unique)
- `IX_CohortCourses_CourseId`

### Modules
- `IX_Modules_CourseId`
- `IX_Modules_CourseId_Order`

### Lessons
- `IX_Lessons_ModuleId`
- `IX_Lessons_ModuleId_Order`
- `IX_Lessons_Type`

### Assignments
- `IX_Assignments_ModuleId`
- `IX_Assignments_DueDate`

### Submissions
- `IX_Submissions_AssignmentId`
- `IX_Submissions_StudentId`
- `IX_Submissions_AssignmentId_StudentId_AttemptNumber` (Unique)
- `IX_Submissions_Status`
- `IX_Submissions_CreatedAt`

### SubmissionArtifacts
- `IX_SubmissionArtifacts_SubmissionId`
- `IX_SubmissionArtifacts_BlobPath`
- `IX_SubmissionArtifacts_Checksum`

### GitHubSubmissionInfos
- `IX_GitHubSubmissionInfos_SubmissionId` (Unique)
- `IX_GitHubSubmissionInfos_CommitHash`

### Grades
- `IX_Grades_SubmissionId` (Unique)
- `IX_Grades_InstructorId`
- `IX_Grades_GradedAt`

### FeedbackComments
- `IX_FeedbackComments_SubmissionId`
- `IX_FeedbackComments_AuthorId`
- `IX_FeedbackComments_CreatedAt`
- `IX_FeedbackComments_SubmissionId_FilePath`

## Performance Tips

1. **Composite Indexes**: Used for common query patterns (e.g., CourseId + Order)
2. **Foreign Key Indexes**: Automatically created for better join performance
3. **Unique Constraints**: Prevent duplicate data at database level
4. **JSON Columns**: RubricJson and RubricBreakdownJson for flexible schema

## Troubleshooting

### Error: "Table already exists"
```bash
dotnet ef database drop --startup-project ../CodeStackLMS.API
dotnet ef database update --startup-project ../CodeStackLMS.API
```

### Error: "No DbContext named 'ApplicationDbContext' was found"
Make sure you're running commands from the Infrastructure project directory or specify the full path.

### Error: "Unable to create an object of type 'ApplicationDbContext'"
Ensure your Startup/Program.cs has the DbContext registered:
```csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    ));
```
