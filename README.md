# CodeStack LMS

A modern Learning Management System built with Next.js 14, ASP.NET Core (.NET 10), PostgreSQL, and Azure Blob Storage.

## 🎯 Overview

CodeStack LMS is a full-featured learning management system designed for coding bootcamps and computer science courses. It supports:

- **Role-Based Access**: Students, Instructors, and Admins with granular permissions
- **Video Lessons**: Secure video streaming with Azure Blob Storage
- **Flexible Submissions**: Accept both file uploads (zip/files) and GitHub repository URLs with commit hashes
- **Rubric-Based Grading**: Structured grading with detailed feedback per criterion
- **Background Jobs**: Async processing for notifications and maintenance tasks
- **Secure Storage**: Short-lived SAS tokens for direct client-to-blob uploads/downloads

## 📚 Documentation

Comprehensive architecture and implementation documentation is available in the `docs/` folder:

1. **[Architecture Overview](docs/01-ARCHITECTURE.md)** - High-level system design, technology stack, and design decisions
2. **[Folder Structure](docs/02-FOLDER-STRUCTURE.md)** - Monorepo organization for frontend, backend, and shared code
3. **[Domain Entities](docs/03-DOMAIN-ENTITIES.md)** - Core entities, relationships, and database schema
4. **[API Endpoints](docs/04-API-ENDPOINTS.md)** - Complete REST API reference grouped by feature
5. **[Security Model](docs/05-SECURITY-MODEL.md)** - Role-based permissions matrix and authorization patterns
6. **[Storage Strategy](docs/06-STORAGE-STRATEGY.md)** - Azure Blob Storage with SAS token implementation
7. **[Background Jobs](docs/07-BACKGROUND-JOBS.md)** - Async operations using Hangfire
8. **[MVP Scope](docs/08-MVP-SCOPE.md)** - Sprint breakdown, feature priorities, and launch plan

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend                     │
│              (TypeScript, TailwindCSS, shadcn/ui)           │
└─────────────────────────────────────────────────────────────┘
                            ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                  ASP.NET Core Web API                       │
│                      (.NET 10)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Controllers  │  │ Application  │  │ Domain       │       │
│  │              │→ │ (CQRS)       │→ │ Entities     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL    │  Azure Blob Storage  │  Hangfire Jobs      │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Components**: shadcn/ui
- **State**: React Context + Hooks
- **Forms**: React Hook Form + Zod

### Backend
- **Framework**: ASP.NET Core Web API (.NET 10)
- **Architecture**: Clean Architecture (Domain-Driven Design)
- **ORM**: Entity Framework Core
- **Auth**: JWT with pluggable provider (future Entra ID support)
- **Jobs**: Hangfire
- **Validation**: FluentValidation

### Infrastructure
- **Database**: PostgreSQL 15+
- **Storage**: Azure Blob Storage
- **Hosting**: Azure App Service (API), Vercel (Frontend)
- **Monitoring**: Application Insights

## 📦 Project Structure

```
codestack-lms/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # API client, hooks, utils
│   │   │   └── types/         # TypeScript types
│   │   └── package.json
│   │
│   └── api/                    # ASP.NET Core API
│       ├── src/
│       │   ├── CodeStackLMS.API/           # Web API layer
│       │   ├── CodeStackLMS.Application/   # Business logic (CQRS)
│       │   ├── CodeStackLMS.Domain/        # Domain entities
│       │   ├── CodeStackLMS.Infrastructure/# Data access, storage
│       │   └── CodeStackLMS.Tests/         # Unit & integration tests
│       └── CodeStackLMS.sln
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── docs/                       # Architecture documentation
├── scripts/                    # Build & deployment scripts
└── docker-compose.yml          # Local development stack
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- .NET 10 SDK
- PostgreSQL 15+
- Azure Storage Account (or Azurite for local dev)

### Backend Setup

```bash
cd apps/api

# Restore dependencies
dotnet restore

# Update connection string in appsettings.Development.json
# Run migrations
dotnet ef database update --project src/CodeStackLMS.Infrastructure

# Run API
dotnet run --project src/CodeStackLMS.API
```

API will be available at `http://localhost:5000`

### Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Update NEXT_PUBLIC_API_URL=http://localhost:5000

# Run dev server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Docker Compose (Full Stack)

```bash
# Start all services (PostgreSQL, API, Frontend)
docker-compose up

# Stop services
docker-compose down
```

## 🔐 Initial Admin

On first startup, the API seeds a single admin account using values from configuration:

- `Seed:AdminEmail`
- `Seed:AdminPassword`

Set these in your local `appsettings.json` (or via `dotnet user-secrets`) **before** starting the API for the first time. The seeded admin is forced to change their password on first login. If either value is missing, seeding is skipped and no admin is created.

## 🧪 Testing

### Backend Tests
```bash
cd apps/api
dotnet test
```

### Frontend Tests
```bash
cd apps/web
npm run test        # Unit tests
npm run test:e2e    # E2E tests (Playwright)
```

## 📊 Key Features

### For Students
- ✅ Browse and enroll in courses
- ✅ Watch video lessons with secure streaming
- ✅ Submit assignments via file upload or GitHub URL
- ✅ View grades and feedback with rubric breakdown
- ✅ Track progress across courses

### For Instructors
- ✅ Create and manage courses
- ✅ Upload lesson videos to Azure Blob Storage
- ✅ Create assignments with custom rubrics
- ✅ Grade submissions with criterion-level feedback
- ✅ View gradebook for all students
- ✅ Receive notifications for new submissions

### For Admins
- ✅ Manage users and roles
- ✅ Oversee all courses and enrollments
- ✅ Access system statistics
- ✅ Monitor background jobs via Hangfire dashboard

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Role-Based Authorization**: Granular permissions per role
- **SAS Tokens**: Short-lived (1-hour) tokens for blob access
- **HTTPS Only**: TLS 1.2+ enforced
- **Input Validation**: Server-side validation on all endpoints
- **Rate Limiting**: 100 requests/minute per user
- **CORS**: Whitelist frontend domain only

## 🎯 MVP Roadmap

### Sprint 1 (Weeks 1-2): Foundation
- User authentication and authorization
- Basic dashboard layouts
- Database schema and migrations

### Sprint 2 (Weeks 3-4): Core Features
- Course and lesson management
- Video upload and streaming
- Assignment creation with rubrics

### Sprint 3 (Weeks 5-6): Submissions & Grading
- File and GitHub submissions
- Rubric-based grading interface
- Email notifications
- Gradebook

**Target Launch**: 6 weeks from kickoff

## 📈 Performance Targets

- API Response Time: < 200ms (p95)
- Page Load Time: < 2s
- Video Streaming: < 3s to first frame
- Uptime: 99.9%
- Test Coverage: 80%+

## 🔄 Background Jobs

Automated tasks running via Hangfire:

- **Submission Notifications**: Notify instructors of new submissions
- **Grade Notifications**: Notify students when graded
- **Due Date Reminders**: Email students 24h before deadline
- **Cleanup Jobs**: Remove expired temp files and tokens
- **Statistics**: Pre-compute course analytics

## 🌐 API Documentation

Interactive API documentation available at:
- Development: `http://localhost:5000/swagger`
- Production: `https://api.codestack.com/swagger`

## 🚢 Deployment

### Backend (Azure App Service)
```bash
cd apps/api
dotnet publish -c Release -o ./publish
# Deploy to Azure App Service
```

### Frontend (Vercel)
```bash
cd apps/web
vercel --prod
```

See [MVP Scope](docs/08-MVP-SCOPE.md) for detailed deployment instructions.

## 📝 Environment Variables

### Backend (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=codestack_lms;..."
  },
  "AzureStorage": {
    "ConnectionString": "...",
    "ContainerName": "codestack-storage"
  },
  "Jwt": {
    "Secret": "your-256-bit-secret",
    "Issuer": "CodeStackLMS",
    "Audience": "CodeStackLMS",
    "ExpiryMinutes": 60
  }
}
```

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BLOB_STORAGE_URL=https://codestack.blob.core.windows.net
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- shadcn for the beautiful UI components
- ASP.NET Core team for the robust backend framework
- Azure for reliable cloud infrastructure

## 📞 Support

- Documentation: See `docs/` folder
- Issues: GitHub Issues
- Email: support@codestack.com

---

**Built with ❤️ for educators and students**
