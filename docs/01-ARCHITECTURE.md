# CodeStack LMS - High-Level Architecture

## System Overview

CodeStack LMS is a modern learning management system built with a decoupled architecture:
- **Frontend**: Next.js 14+ (App Router, TypeScript, React Server Components)
- **Backend**: ASP.NET Core Web API (.NET 10)
- **Database**: Azure SQL Server with EF Core
- **Storage**: Azure Blob Storage (assignments, submissions, videos)
- **Authentication**: JWT access tokens (30 min) plus opaque refresh tokens (14 days), both held in httpOnly cookies set by the Next.js server
- **Background Processing**: Hangfire for async jobs (email notifications, weekly Claude progress reports)
- **AI**: Anthropic Claude API for generated weekly progress reports (server-side only)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  Next.js 14 App Router (SSR/CSR) + TailwindCSS + custom UI  │
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
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Users    │ │ Enroll.  │ │ Submiss. │ │Attendance│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ Reports  │ │Transcript│   (Reports = Claude AI)          │
│  └──────────┘ └──────────┘                                  │
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
- Short-lived JWT access tokens (30 min) refreshed via opaque refresh tokens (14 days)
- Refresh tokens are stored as SHA-256 hashes only; the raw value never leaves the client cookie
- Tokens live in httpOnly cookies — browser JavaScript can't read them, so XSS can't steal a session
- Role-based authorization (Student, Instructor, Admin), plus per-course enrollment checks on course content
- SAS tokens for blob access (short-lived, scoped to a single blob)
- HTTPS only, secure headers, rate limiting on unauthenticated auth endpoints

### 5. **Async Processing**
- Background jobs for heavy operations (grading notifications, submission-returned notifications, video processing prep)
- Weekly Claude AI progress reports via a Hangfire recurring job (`WeeklyProgressReportJob`, Mondays 06:00) — also triggerable on demand. See `docs/04-CLAUDE-REPORTS-ROADMAP.md`.
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
6. API reads each blob's real properties, re-checks the size/type/count limits
   against them, persists SubmissionArtifacts, transitions to ReadyToGrade
```

A SAS cannot cap upload size and cannot pin content type on a PUT — the
`ContentType` set on the SAS is a response-header override applied on read. So
everything the client declares at step 5 is untrusted: the API calls
`GetBlobPropertiesAsync` per blob and enforces the limits against what storage
actually holds, deleting anything over the limit.

Re-submitting is a swap, not a wipe. Step 1 leaves any previous attempt — its
artifacts *and* its grade — in place; the replacement happens at step 6, once the
new files are confirmed present. A student who requests an upload and then
abandons it keeps the grade they already earned.

### Video Streaming Flow (Current MVP)
```
1. Instructor uploads video → Azure Blob
2. Lesson stores blob URL in DB
3. Student requests lesson → API checks enrollment, returns SAS URL (1-hour expiry)
4. Client streams from blob URL
```

Both lesson read paths (`GET /api/lessons/{id}/video-token` and
`GET /api/lessons?moduleId=`) require the caller to be enrolled in the owning
course, or to be an Instructor/Admin. This matters because the SAS is the only
access control on the blob once it leaves the API — an ungated listing would hand
out working download links for course material to anyone who knew a module id.

### Session Flow
```
1. Client → POST /api/auth/login
2. Next.js route handler stores accessToken + refreshToken in httpOnly cookies
3. Browser calls go to /api/proxy/*, which injects the bearer server-side
4. On 401, the proxy (or middleware) refreshes once and retries transparently
5. Middleware rewrites the in-flight request's cookie header so server
   components in the same request already see the refreshed token
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
