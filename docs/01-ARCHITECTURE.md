# CodeStack LMS - High-Level Architecture

## System Overview

CodeStack LMS is a modern learning management system built with a decoupled architecture:
- **Frontend**: Next.js 14+ (App Router, TypeScript, React Server Components)
- **Backend**: ASP.NET Core Web API (.NET 10)
- **Database**: Azure SQL Server with EF Core
- **Storage**: Azure Blob Storage (assignments, submissions, videos)
- **Authentication**: JWT bearer tokens (access token only — no refresh flow today)
- **Background Processing**: Hangfire for async email jobs

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  Next.js 14 App Router (SSR/CSR) + TailwindCSS + shadcn/ui  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY / BFF                         │
│              ASP.NET Core Web API (.NET 10)                 │
│  ┌──────────────┐  ┌────────────-──┐  ┌──────────────┐      │
│  │   Auth/JWT   │  │ Rate Limiting │  │ CORS/Logging │      │
│  └──────────────┘  └───────────-───┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Courses  │ │ Lessons  │ │ Assign.  │ │ Grading  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ Users    │ │ Enroll.  │ │ Submiss. │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                             │
│  Entities, Value Objects, Domain Services, Interfaces       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Azure SQL    │  │ Azure Blob   │  │ Hangfire     │       │
│  │ (EF Core)    │  │ Storage      │  │ (Jobs)       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. **Monorepo Structure**
Single repository with clear separation between frontend, backend, and shared code.

### 2. **Clean Architecture (Backend)**
- Domain-centric design with clear boundaries
- Dependency inversion (Infrastructure depends on Domain)
- Testable business logic isolated from frameworks

### 3. **API-First Design**
- RESTful API with consistent patterns
- OpenAPI/Swagger documentation (dev environment only)

### 4. **Security-First**
- JWT access tokens (no refresh token today)
- Role-based authorization (Student, Instructor, Admin)
- SAS tokens for blob access (short-lived, scoped)
- HTTPS only, secure headers

### 5. **Async Processing**
- Background jobs for heavy operations (grading notifications, video processing prep)
- Event-driven for decoupling (e.g., submission → notification)

### 6. **Scalability Considerations**
- Stateless API (horizontal scaling)
- CDN-ready static assets
- Database connection pooling
- Blob storage for large files (not DB)

## Data Flow Examples

### Submission Upload Flow
```
1. Student → POST /api/submissions/{assignmentId}/request-upload (file metadata)
2. API validates files, resolves cohort, creates (or reuses) a submission record
3. API → Generate a per-file write SAS (15-minute expiry) and return the slots
4. Client → PUT each file directly to Azure Blob using its SAS URL
5. Client → POST /api/submissions/{submissionId}/complete-upload
6. API verifies blobs exist, persists SubmissionArtifacts, transitions to ReadyToGrade
```

### Video Streaming Flow (Current MVP)
```
1. Instructor uploads video → Azure Blob
2. Lesson stores blob URL in DB
3. Student requests lesson → API returns SAS URL (1-hour expiry)
4. Client streams from blob URL
```

## Technology Justifications

|         Technology        |                                          Reason                                             |
|---------------------------|---------------------------------------------------------------------------------------------|
| **Next.js 14 App Router** | SSR/SSG for SEO, React Server Components, built-in routing, TypeScript support.             |
|      **ASP.NET Core**     | High performance, mature ecosystem, excellent async support, EF Core integration.           |
|    **Azure SQL Server**   | Managed service, ACID compliance, AAD integration, pairs naturally with an Azure-hosted API |
|    **Azure Blob Storage** | Cost-effective, SAS tokens for secure access, globally distributed, 99.9% SLA               |
|          **JWT**          | Stateless auth, works across domains, industry standard, easy to validate                   |
|        **Hangfire**       | .NET native, persistent jobs, retry logic, dashboard; uses SQL Server storage               |

## Non-Functional Requirements

- **Performance**: API response < 200ms (p95), page load < 2s
- **Availability**: 99.9% uptime (allows ~8h downtime/year)
- **Security**: OWASP Top 10 awareness, regular dependency updates
- **Scalability**: Support 10K concurrent users (MVP: 500)
