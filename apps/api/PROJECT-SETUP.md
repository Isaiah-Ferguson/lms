# CodeStack LMS - Project Setup Instructions

## ✅ Projects Created

I've created all the necessary .csproj files and solution file:

```
apps/api/
├── CodeStackLMS.sln                          # Solution file
└── src/
    ├── CodeStackLMS.Domain/
    │   └── CodeStackLMS.Domain.csproj        # Domain entities & enums
    ├── CodeStackLMS.Application/
    │   └── CodeStackLMS.Application.csproj   # Business logic (future)
    ├── CodeStackLMS.Infrastructure/
    │   └── CodeStackLMS.Infrastructure.csproj # EF Core, DbContext
    └── CodeStackLMS.API/
        └── CodeStackLMS.API.csproj           # Web API
```

## 🚀 Quick Start

### 1. Restore Packages

From the solution directory:

```powershell
cd C:\Users\Ifergusonlll.DPJPA\Desktop\lms\apps\api
dotnet restore
```

This will download all NuGet packages including:
- Pomelo.EntityFrameworkCore.MySql (8.0.0)
- Microsoft.EntityFrameworkCore.Design (8.0.0)
- BCrypt.Net-Next (4.0.3)

### 2. Build Solution

```powershell
dotnet build
```

### 3. Configure MySQL Connection

Edit `src/CodeStackLMS.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=codestack_lms;User=root;Password=YOUR_PASSWORD_HERE;AllowPublicKeyRetrieval=true;CharSet=utf8mb4;"
  }
}
```

**Replace `YOUR_PASSWORD_HERE` with your MySQL root password.**

### 4. Create Initial Migration

From the Infrastructure project directory:

```powershell
cd src\CodeStackLMS.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ..\CodeStackLMS.API
```

### 5. Apply Migration to Database

```powershell
dotnet ef database update --startup-project ..\CodeStackLMS.API
```

This will:
- Create the `codestack_lms` database
- Create all 12 tables
- Apply all indexes and constraints

### 6. Run the API

```powershell
cd ..\CodeStackLMS.API
dotnet run
```

The application will:
- Start on https://localhost:5001 (or http://localhost:5000)
- Automatically seed default users on first run
- Open Swagger UI at https://localhost:5001/swagger

## 📦 Packages Included

### Infrastructure Project
- **Pomelo.EntityFrameworkCore.MySql** (8.0.0) - MySQL provider for EF Core
- **Microsoft.EntityFrameworkCore.Design** (8.0.0) - EF Core tools for migrations
- **BCrypt.Net-Next** (4.0.3) - Password hashing

### API Project
- **Microsoft.AspNetCore.OpenApi** (8.0.0) - OpenAPI support
- **Swashbuckle.AspNetCore** (6.5.0) - Swagger UI

## 👥 Default Users (Auto-Seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@codestack.com | Admin123! |
| Instructor | instructor@codestack.com | Instructor123! |
| Student | student@codestack.com | Student123! |

## 🔧 Common Commands

### Build
```powershell
dotnet build
```

### Run
```powershell
cd src\CodeStackLMS.API
dotnet run
```

### Watch (auto-reload on changes)
```powershell
cd src\CodeStackLMS.API
dotnet watch run
```

### Create Migration
```powershell
cd src\CodeStackLMS.Infrastructure
dotnet ef migrations add MigrationName --startup-project ..\CodeStackLMS.API
```

### Apply Migrations
```powershell
cd src\CodeStackLMS.Infrastructure
dotnet ef database update --startup-project ..\CodeStackLMS.API
```

### Rollback Migration
```powershell
cd src\CodeStackLMS.Infrastructure
dotnet ef database update PreviousMigrationName --startup-project ..\CodeStackLMS.API
```

### Drop Database
```powershell
cd src\CodeStackLMS.Infrastructure
dotnet ef database drop --startup-project ..\CodeStackLMS.API --force
```

## 🐛 Troubleshooting

### "Could not find any project"
- Make sure you're in the correct directory
- The .csproj files should now exist in each project folder

### "Unable to connect to MySQL"
- Verify MySQL is running
- Check your connection string credentials
- Ensure port 3306 is accessible

### "Build failed"
- Run `dotnet restore` first
- Check for syntax errors in entity files
- Verify all project references are correct

### Migration Errors
- Ensure MySQL is running
- Check connection string in appsettings.json
- Run from Infrastructure project directory
- Specify `--startup-project ..\CodeStackLMS.API`

## 📁 Project Structure

```
CodeStackLMS.Domain/
├── Common/
│   ├── BaseEntity.cs
│   └── IAuditableEntity.cs
├── Entities/
│   ├── User.cs
│   ├── Cohort.cs
│   ├── Course.cs
│   ├── CohortCourse.cs
│   ├── Module.cs
│   ├── Lesson.cs
│   ├── Assignment.cs
│   ├── Submission.cs
│   ├── SubmissionArtifact.cs
│   ├── GitHubSubmissionInfo.cs
│   ├── Grade.cs
│   └── FeedbackComment.cs
└── Enums/
    ├── UserRole.cs
    ├── LessonType.cs
    ├── SubmissionType.cs
    └── SubmissionStatus.cs

CodeStackLMS.Infrastructure/
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

CodeStackLMS.API/
├── Program.cs
├── appsettings.json
└── appsettings.Development.json
```

## ✅ Next Steps

1. ✅ Projects created with .csproj files
2. ✅ NuGet packages configured
3. ✅ Solution file created
4. ⏭️ Run `dotnet restore`
5. ⏭️ Configure MySQL connection string
6. ⏭️ Create and apply migrations
7. ⏭️ Run the application

## 📚 Additional Documentation

- **README-DATABASE.md** - Complete database implementation summary
- **DATABASE-SETUP.md** - Detailed setup guide with examples
- **MIGRATION-NOTES.md** - EF Core migration commands
- **MYSQL-SCHEMA.sql** - Raw SQL schema for reference

---

**Note**: I'm using .NET 8.0 (net8.0) as the target framework since .NET 10 isn't released yet. When .NET 10 is available, simply update the `<TargetFramework>` in all .csproj files to `net10.0`.
