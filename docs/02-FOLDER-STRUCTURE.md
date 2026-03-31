# CodeStack LMS - Monorepo Folder Structure

## Root Structure

```
codestack-lms/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── frontend-ci.yml
│       ├── api-ci.yml
│       └── deploy.yml
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # ASP.NET Core API
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docs/                       # Architecture & API docs
├── scripts/                    # Build & deployment scripts
├── .gitignore
├── .editorconfig
├── README.md
└── docker-compose.yml          # Local development stack
```

## Frontend Structure (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/       # Protected routes
│   │   │   ├── layout.tsx     # Dashboard layout with nav
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx   # Course list
│   │   │   │   └── [courseId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── lessons/
│   │   │   │           └── [lessonId]/
│   │   │   │               └── page.tsx
│   │   │   ├── assignments/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [assignmentId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── submit/
│   │   │   │           └── page.tsx
│   │   │   ├── submissions/   # Student view
│   │   │   │   └── page.tsx
│   │   │   ├── grading/       # Instructor view
│   │   │   │   └── page.tsx
│   │   │   └── admin/         # Admin panel
│   │   │       └── page.tsx
│   │   ├── api/               # API route handlers (if needed)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── course/
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseList.tsx
│   │   │   └── LessonPlayer.tsx
│   │   ├── assignment/
│   │   │   ├── AssignmentCard.tsx
│   │   │   ├── SubmissionForm.tsx
│   │   │   └── FileUploader.tsx
│   │   ├── grading/
│   │   │   ├── RubricEditor.tsx
│   │   │   ├── GradingForm.tsx
│   │   │   └── SubmissionViewer.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── ProtectedRoute.tsx
│   ├── lib/
│   │   ├── api/               # API client
│   │   │   ├── client.ts      # Axios/fetch wrapper
│   │   │   ├── courses.ts
│   │   │   ├── assignments.ts
│   │   │   ├── submissions.ts
│   │   │   └── auth.ts
│   │   ├── auth/
│   │   │   ├── session.ts     # Session management
│   │   │   └── permissions.ts # Client-side permission checks
│   │   ├── hooks/
│   │   │   ├── useCourses.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useUpload.ts
│   │   ├── utils/
│   │   │   ├── cn.ts          # Class name utility
│   │   │   ├── date.ts
│   │   │   └── validation.ts
│   │   └── constants.ts
│   └── types/
│       ├── api.ts             # API response types
│       ├── models.ts          # Domain models
│       └── forms.ts           # Form schemas
├── public/
│   ├── images/
│   └── icons/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Backend Structure (`apps/api/`)

```
apps/api/
├── src/
│   ├── CodeStackLMS.API/              # Web API project
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── CourseController.cs
│   │   │   ├── LessonsController.cs
│   │   │   ├── AssignmentsController.cs
│   │   │   ├── SubmissionsController.cs
│   │   │   ├── GradesController.cs
│   │   │   ├── InstructorController.cs
│   │   │   ├── AdminParticipantsController.cs
│   │   │   ├── CommentsController.cs
│   │   │   ├── ProfileController.cs
│   │   │   ├── DebugController.cs
│   │   │   └── HomeController.cs
│   │   ├── Middleware/
│   │   │   ├── ExceptionHandlingMiddleware.cs
│   │   │   ├── JwtMiddleware.cs
│   │   │   └── RequestLoggingMiddleware.cs
│   │   ├── Filters/
│   │   │   ├── AuthorizeRolesAttribute.cs
│   │   │   └── ValidateModelAttribute.cs
│   │   ├── Extensions/
│   │   │   ├── ServiceCollectionExtensions.cs
│   │   │   └── ApplicationBuilderExtensions.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── Program.cs
│   │   └── CodeStackLMS.API.csproj
│   │
│   ├── CodeStackLMS.Application/      # Application layer
│   │   ├── Common/
│   │   │   ├── Interfaces/
│   │   │   │   ├── IApplicationDbContext.cs
│   │   │   │   ├── ICurrentUserService.cs
│   │   │   │   ├── IBlobStorageService.cs
│   │   │   │   ├── IEmailService.cs
│   │   │   │   ├── IAuthService.cs
│   │   │   │   ├── ICourseDetailService.cs
│   │   │   │   ├── IAssignmentService.cs
│   │   │   │   ├── ISubmissionService.cs
│   │   │   │   ├── ILessonService.cs
│   │   │   │   ├── IInstructorService.cs
│   │   │   │   ├── IAdminParticipantsService.cs
│   │   │   │   ├── ICommentService.cs
│   │   │   │   ├── IProfileService.cs
│   │   │   │   └── IHomeService.cs
│   │   │   ├── Exceptions/
│   │   │   │   ├── AppException.cs
│   │   │   │   ├── ValidationException.cs
│   │   │   │   ├── NotFoundException.cs
│   │   │   │   └── ForbiddenException.cs
│   │   │   └── Models/
│   │   │       ├── Result.cs
│   │   │       └── PaginatedList.cs
│   │   ├── Auth/
│   │   │   ├── AuthService.cs
│   │   │   └── DTOs/
│   │   │       └── LoginDto.cs
│   │   ├── Courses/
│   │   │   ├── CourseDetailService.cs
│   │   │   └── DTOs/
│   │   │       └── CourseDetailDtos.cs
│   │   ├── Lessons/
│   │   │   ├── LessonService.cs
│   │   │   └── DTOs/
│   │   │       └── LessonDtos.cs
│   │   ├── Assignments/
│   │   │   ├── AssignmentService.cs
│   │   │   └── DTOs/
│   │   │       └── AssignmentDtos.cs
│   │   ├── Submissions/
│   │   │   ├── SubmissionService.cs
│   │   │   └── DTOs/
│   │   │       └── SubmissionDtos.cs
│   │   ├── Instructor/
│   │   │   ├── InstructorService.cs
│   │   │   └── DTOs/
│   │   │       └── InstructorDtos.cs
│   │   ├── AdminParticipants/
│   │   │   ├── AdminParticipantsService.cs
│   │   │   └── DTOs/
│   │   │       └── AdminParticipantsDtos.cs
│   │   ├── Comments/
│   │   │   ├── CommentService.cs
│   │   │   └── DTOs/
│   │   │       └── CommentDtos.cs
│   │   ├── Profile/
│   │   │   ├── ProfileService.cs
│   │   │   └── DTOs/
│   │   │       └── ProfileDtos.cs
│   │   ├── Home/
│   │   │   ├── HomeService.cs
│   │   │   └── DTOs/
│   │   │       └── HomeDtos.cs
│   │   └── CodeStackLMS.Application.csproj
│   │
│   ├── CodeStackLMS.Domain/           # Domain layer
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   ├── Course.cs
│   │   │   ├── UserCourseEnrollment.cs
│   │   │   ├── Module.cs
│   │   │   ├── Lesson.cs
│   │   │   ├── LessonArtifact.cs
│   │   │   ├── Assignment.cs
│   │   │   ├── Submission.cs
│   │   │   ├── SubmissionArtifact.cs
│   │   │   ├── GitHubSubmissionInfo.cs
│   │   │   ├── Grade.cs
│   │   │   ├── FeedbackComment.cs
│   │   │   ├── Cohort.cs
│   │   │   ├── CohortCourse.cs
│   │   │   ├── Announcement.cs
│   │   │   └── UserAdminNote.cs
│   │   ├── Enums/
│   │   │   ├── UserRole.cs
│   │   │   ├── SubmissionType.cs
│   │   │   ├── SubmissionStatus.cs
│   │   │   ├── LessonType.cs
│   │   │   └── VideoSourceType.cs
│   │   ├── Common/
│   │   │   ├── BaseEntity.cs
│   │   │   └── IAuditableEntity.cs
│   │   └── CodeStackLMS.Domain.csproj
│   │
│   ├── CodeStackLMS.Infrastructure/   # Infrastructure layer
│   │   ├── Persistence/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── ApplicationDbContextSeed.cs
│   │   │   ├── Configurations/        # EF Core configurations
│   │   │   │   ├── UserConfiguration.cs
│   │   │   │   ├── CourseConfiguration.cs
│   │   │   │   ├── ModuleConfiguration.cs
│   │   │   │   ├── LessonConfiguration.cs
│   │   │   │   ├── AssignmentConfiguration.cs
│   │   │   │   ├── SubmissionConfiguration.cs
│   │   │   │   ├── GradeConfiguration.cs
│   │   │   │   ├── CohortConfiguration.cs
│   │   │   │   ├── CohortCourseConfiguration.cs
│   │   │   │   ├── AnnouncementConfiguration.cs
│   │   │   │   ├── FeedbackCommentConfiguration.cs
│   │   │   │   └── UserAdminNoteConfiguration.cs
│   │   │   ├── Migrations/
│   │   │   └── Interceptors/
│   │   │       └── AuditableEntityInterceptor.cs
│   │   ├── Identity/
│   │   │   ├── CurrentUserService.cs
│   │   │   └── PasswordHasher.cs
│   │   ├── Email/
│   │   │   ├── SmtpEmailService.cs
│   │   │   └── EmailOptions.cs
│   │   ├── Storage/
│   │   │   ├── AzureBlobStorageService.cs
│   │   │   └── SasTokenGenerator.cs
│   │   └── DependencyInjection.cs
│   │   └── CodeStackLMS.Infrastructure.csproj
│   │
│   └── CodeStackLMS.Tests/            # Test projects
│       ├── Unit/
│       │   ├── Application/
│       │   └── Domain/
│       ├── Integration/
│       │   ├── API/
│       │   └── Infrastructure/
│       └── CodeStackLMS.Tests.csproj
│
├── CodeStackLMS.sln
└── README.md
```

## Shared Package (`packages/shared/`)

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── assignment.ts
│   │   ├── submission.ts
│   │   └── grade.ts
│   ├── enums/
│   │   ├── roles.ts
│   │   ├── submissionTypes.ts
│   │   └── gradeStatus.ts
│   ├── constants/
│   │   └── permissions.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Key Conventions

### Backend (C#)
- **Naming**: PascalCase for classes, methods, properties
- **Async**: All I/O operations use async/await
- **Service Pattern**: Services encapsulate business logic (no CQRS/Commands/Queries)
- **Validation**: FluentValidation for DTOs
- **Mapping**: Manual mapping or AutoMapper for Entity ↔ DTO

### Frontend (TypeScript)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Functional components with hooks
- **State**: React Context + hooks (consider Zustand for complex state)
- **Forms**: React Hook Form + Zod validation
- **API calls**: SWR or TanStack Query for caching

### Database Migrations
- Located in: `apps/api/src/CodeStackLMS.Infrastructure/Persistence/Migrations/`
- Generated via: `dotnet ef migrations add <Name>`
- Applied via: `dotnet ef database update`

### Environment Variables

**Frontend (`.env.local`)**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BLOB_STORAGE_URL=https://codestack.blob.core.windows.net
```

**Backend (`appsettings.json`)**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=codestack_lms;..."
  },
  "AzureStorage": {
    "ConnectionString": "...",
    "ContainerName": "submissions"
  },
  "Jwt": {
    "Secret": "...",
    "Issuer": "CodeStackLMS",
    "Audience": "CodeStackLMS",
    "ExpiryMinutes": 60
  }
}
```
