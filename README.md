# CodeStack LMS

A modern Learning Management System built with **Next.js 14**, **ASP.NET Core (.NET 10)**, **SQL Server**, and **Azure Blob Storage**.

## Overview

CodeStack LMS is a full-featured learning management system designed for coding bootcamps and computer-science courses. It supports:

- **Role-based access** — Students, Instructors, and Admins with granular permissions
- **Video lessons** — Streaming via Azure Blob Storage with short-lived SAS URLs
- **Flexible submissions** — Both file uploads (zip/individual files) and GitHub repository URLs with commit hashes
- **Rubric-based grading** — Criterion-level scores with overall feedback
- **Background jobs** — Async notifications and maintenance via Hangfire
- **Academic-year cohorts** — Courses scoped to cohort years with enrollment and archival

## Documentation

Additional architecture and implementation notes live in the `docs/` and `apps/api/` folders:

- [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) — High-level system design and technology decisions
- [`docs/02-DOMAIN-ENTITIES.md`](docs/02-DOMAIN-ENTITIES.md) — Core entities, relationships, and database schema
- [`docs/03-API-ENDPOINTS.md`](docs/03-API-ENDPOINTS.md) — REST API reference grouped by feature
- [`apps/api/HANGFIRE.md`](apps/api/HANGFIRE.md) — Background job configuration and dashboard access
- [`apps/api/README-DEPLOY.md`](apps/api/README-DEPLOY.md) — Backend deployment to Azure App Service

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend                     │
│          (TypeScript, TailwindCSS, App Router)              │
└─────────────────────────────────────────────────────────────┘
                            ↓ REST API (JWT)
┌─────────────────────────────────────────────────────────────┐
│                  ASP.NET Core Web API                       │
│                        (.NET 10)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Controllers  │  │ Application  │  │ Domain       │       │
│  │              │→ │ Services     │→ │ Entities     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│   SQL Server   │   Azure Blob Storage   │   Hangfire Jobs   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend (`apps/web`)
- **Framework** — Next.js 14.2.5 (App Router, Server Components)
- **Language** — TypeScript 5
- **Styling** — TailwindCSS 3.4
- **Icons / UI** — `lucide-react`, `framer-motion`, custom components (no external component library)
- **Forms** — `react-hook-form` + `zod` validation
- **Charts** — `recharts`
- **Calendar** — `@fullcalendar/*`
- **Video** — `hls.js`
- **Auth storage** — `js-cookie`

### Backend (`apps/api`)
- **Framework** — ASP.NET Core Web API on **.NET 10**
- **Architecture** — Clean Architecture (API → Application → Domain, with Infrastructure adapter)
- **ORM** — Entity Framework Core (code-first migrations)
- **Auth** — JWT bearer tokens (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- **Password hashing** — `BCrypt.Net-Next`
- **Background jobs** — Hangfire with SQL Server storage
- **Storage** — `Azure.Storage.Blobs` + `Azure.Identity`

### Infrastructure
- **Database** — SQL Server (Hangfire uses the same database for job storage)
- **Object storage** — Azure Blob Storage (short-lived SAS URLs)
- **API hosting** — Azure App Service (see `apps/api/README-DEPLOY.md`)

## Project Structure

```
lms/
├── apps/
│   ├── web/                              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                      # App Router pages ((app), (auth))
│   │   │   ├── components/               # React components
│   │   │   └── lib/                      # API client, hooks, utils
│   │   └── package.json
│   │
│   └── api/                              # ASP.NET Core API
│       ├── src/
│       │   ├── CodeStackLMS.API/         # Controllers, Program.cs, middleware
│       │   ├── CodeStackLMS.Application/ # Services, DTOs, interfaces
│       │   ├── CodeStackLMS.Domain/      # Entities, value objects
│       │   └── CodeStackLMS.Infrastructure/ # EF Core, Azure adapters, Hangfire jobs
│       ├── CodeStackLMS.sln
│       ├── HANGFIRE.md
│       └── README-DEPLOY.md
│
├── docs/                                 # Architecture documentation
└── load-tests/                           # Load / performance test scripts
```

## Getting Started

### Prerequisites
- **Node.js 20+**
- **.NET 10 SDK**
- **SQL Server** (local instance, LocalDB, or Docker container)
- **Azure Storage Account** (or Azurite for local development)

### Backend Setup

```bash
cd apps/api

# Restore NuGet packages
dotnet restore

# Configure connection string & secrets in src/CodeStackLMS.API/appsettings.Development.json
# (see "Environment Variables" below)

# Apply EF Core migrations (Program.cs also runs MigrateAsync() on startup)
dotnet ef database update \
  --project src/CodeStackLMS.Infrastructure \
  --startup-project src/CodeStackLMS.API

# Run the API
dotnet run --project src/CodeStackLMS.API
```

The API listens on `http://localhost:5000` (HTTP) and `https://localhost:5001` (HTTPS). Swagger UI is exposed at `/swagger` in Development only.

### Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Create .env.local with:
#   NEXT_PUBLIC_API_URL=http://localhost:5000
echo 'NEXT_PUBLIC_API_URL=http://localhost:5000' > .env.local

# Run the dev server
npm run dev
```

The frontend is served at `http://localhost:3000`.

## Key Features

### For Students
- Browse and enroll in courses by academic year
- Watch video lessons streamed from Azure Blob Storage
- Submit assignments via file upload or GitHub repo URL + commit hash
- View grades, feedback, and rubric breakdown
- Track submission status across courses

### For Instructors
- Manage course content, weeks, and announcements
- Create assignments with rubrics
- Review and grade submissions with criterion-level feedback
- Return submissions to students with a reason (pre-grade feedback loop)
- Queue view for all pending submissions across assigned courses

### For Admins
- Manage users, roles, and cohort enrollments
- Create / archive academic years
- System-wide gradebook and participant management
- Monitor background jobs via the Hangfire dashboard (`/hangfire`)

## Security

- **JWT bearer auth** — 60-minute access tokens signed with HS256
- **Role-based authorization** — `Admin`, `Instructor`, `Student` role checks on endpoints
- **Hangfire dashboard** — Open in Development; `Admin`-only in Production
- **CORS** — Any `localhost` origin allowed in Development; configured whitelist (`Frontend:Url`) in Production
- **Blob access** — Short-lived SAS URLs generated server-side for uploads and downloads
- **HTTPS redirection** — Enforced via `app.UseHttpsRedirection()`
- **Request body limit** — 100 MB for multipart uploads

## Background Jobs (Hangfire)

Currently implemented jobs (see `apps/api/src/CodeStackLMS.Infrastructure/BackgroundJobs/`):

- **Grade notifications** — Notify student when a submission is graded
- **Submission-returned notifications** — Notify student when a submission is returned with a reason

See [`apps/api/HANGFIRE.md`](apps/api/HANGFIRE.md) for dashboard access and configuration.

## API Documentation

Interactive Swagger UI is available at `http://localhost:5000/swagger` when the API is running in Development.

## Deployment

### Backend — Azure App Service
See [`apps/api/README-DEPLOY.md`](apps/api/README-DEPLOY.md) or run the `/deploy-api-azure` IDE workflow.

```bash
cd apps/api
dotnet publish src/CodeStackLMS.API -c Release -o ./publish
# Then deploy the ./publish folder to Azure App Service
```

### Frontend
The Next.js app can be deployed to any Node.js host (Vercel, Azure Static Web Apps, Azure App Service, etc.). Remember to set `NEXT_PUBLIC_API_URL` to the deployed API origin.

## Environment Variables

### Backend — `apps/api/src/CodeStackLMS.API/appsettings.Development.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=codestack_lms;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "AzureStorage": {
    "ConnectionString": "UseDevelopmentStorage=true",
    "ContainerName": "codestack-storage"
  },
  "Jwt": {
    "Secret": "your-256-bit-secret",
    "Issuer": "codestack-lms",
    "Audience": "codestack-lms",
    "ExpiryMinutes": 60
  },
  "Frontend": {
    "Url": "http://localhost:3000"
  },
  "Hangfire": {
    "WorkerCount": 5
  }
}
```

### Frontend — `apps/web/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Built for educators and students.**
