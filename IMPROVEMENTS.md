# CodeStack LMS — Codebase Improvements & Roadmap

> Generated from a full codebase scan on 2026-07-09. Covers `apps/api` (ASP.NET Core, .NET 10), `apps/web` (Next.js 14), and repo-level concerns. ~34k lines of application code.

## What's Already Good

Worth stating up front — this codebase is above-average for its size:

- **Clean Architecture backend** with thin controllers, an `IApplicationDbContext` abstraction, and consistent layering.
- **Strong auth hardening**: JWT fail-fast on weak secrets, zero clock skew, BCrypt hashing, enumeration-safe forgot-password, cryptographically secure temp passwords.
- **Good upload security**: filename sanitization, content-type allowlist, double-extension blocking, size caps, blob-path ownership checks, short-lived SAS URLs.
- **No secrets committed to git** — `.env.local` and real `appsettings*.json` are correctly gitignored; only `.template` files are tracked.
- **Comprehensive DB indexing** (35+ `HasIndex` calls) and serializable transactions with EF retry strategies.
- **Centralized typed API client** on the frontend, strict TypeScript with zero `ts-ignore`, thorough open-redirect validation on login, and a race-condition guard on the dashboard fetch.
- **Solid docs** (`README.md`, `docs/01–04`) and k6 load tests with no hardcoded credentials.

---

## Findings by Severity

### 🔴 High

| # | Area | Finding | Location |
|---|------|---------|----------|
| H1 | Backend correctness | Fire-and-forget `Task.Run` writes `LastLoginAt` via the **scoped DbContext after the request returns** — race condition / `ObjectDisposedException`, with an empty `catch {}` swallowing the failure. Updates are lost non-deterministically. | `AuthService.cs:59-67` |
| H2 | Backend performance | `GetSubmissionQueueAsync` loads the **entire Submissions table** (with all includes) into memory, then filters/paginates in LINQ-to-objects. Does not scale. | `InstructorService.cs:327-334` |
| H3 | Backend performance | `GetAdminGradesAsync` and roster/my-grades load all submissions for a course and aggregate in memory — O(students × assignments). Existing DB indexes are bypassed because filtering happens client-side. | `InstructorService.cs:500-519` |
| H4 | Backend security | Hangfire dashboard is mapped **before** `UseAuthentication()`/`UseAuthorization()`, and the app only has JWT bearer auth — `HangfireAuthorizationFilter` always sees an unauthenticated user. Dashboard is effectively broken/locked out in production, and `HANGFIRE.md` documents behavior the pipeline can't deliver. | `Program.cs:182-186` vs `:205` |
| H5 | Secrets at rest | Local (gitignored) `appsettings.json` / `appsettings.Development.json` contain **live production-usable secrets**: Azure Storage account key, Gmail app password, JWT secret, real Anthropic API key. Plaintext at rest on the dev machine. | `apps/api/src/CodeStackLMS.API/appsettings*.json` |
| H6 | Frontend security | Auth token stored in a **JS-readable (non-httpOnly) cookie** via `js-cookie`; any XSS fully compromises the session. `secure`/`sameSite: strict` are set, but httpOnly set by the backend is the right model. | `apps/web/src/lib/auth.ts:9-15` |
| H7 | Frontend security | **Client-side-only role guards** — JWT decoded in the browser gates admin/instructor UI; no `middleware.ts`, and `(app)/layout.tsx` only checks cookie existence (no role, no signature). Must verify the backend authorizes every privileged endpoint (it mostly does via `[Authorize(Roles=...)]`, but this needs to be the explicit, audited boundary). | `auth.ts:21-36`, `(app)/layout.tsx:12-13` |
| H8 | Testing | **Zero automated tests in the entire repo** — no .NET test projects, no frontend test runner. For an app handling grades and auth, this is the single biggest risk multiplier. | repo-wide |

### 🟠 Medium

**Backend**
- M1 — `InstructorService.cs` (647 lines) is a god class mixing grading, queue, gradebook, and roster concerns. Split into `GradingService`, `SubmissionQueueService`, `GradebookService`.
- M2 — `WeeklyProgressReportJob.cs` (605 lines) mixes 200+ lines of prompt-building with job orchestration. Extract `IProgressReportPromptBuilder` and a cohort-scope resolver.
- M3 — `ClaudeClient.cs:59-64` assumes `content[0].text` exists; a `tool_use` or empty content block throws an unguarded exception. Guard block type/length.
- M4 — SAS URLs generated sequentially in `foreach` loops (`InstructorService.cs:53-71`, `SubmissionService.cs:451-457`) — batch with `Task.WhenAll` (already done correctly in `CompleteUploadAsync`).
- M5 — Blob deletions aren't compensated if the DB transaction fails (`SubmissionService.cs:275-276`) — orphaned or prematurely-deleted blobs on partial failure. Delete blobs only after commit.
- M6 — **No input validation attributes anywhere** (zero `[Required]`/`[EmailAddress]`/`[StringLength]` across all DTOs) — missing fields surface as `NullReferenceException` → 500 instead of 400. Adopt DataAnnotations or FluentValidation.
- M7 — JWT lifetime hardcoded to 24h with no refresh/revocation (`AuthService.cs:19`); a leaked token is valid all day. The frontend's `AuthTokens.refreshToken` type already exists but is unused.
- M8 — External video sources get a **1-year** URL (`LessonService.cs:91`); tighten expiry or document why it's safe.
- M9 — Placeholder JWT secret in templates exactly satisfies the 32-byte fail-fast gate, so an unchanged prod deploy wouldn't be caught. Reject known placeholder values.
- M10 — .NET package/framework mismatch: projects target `net10.0` but EF Core & most `Microsoft.*` packages are pinned to `9.0.0` (while others are on 10.x). Align everything to `10.0.x`.

**Frontend**
- M11 — `api-client.ts` is 857 lines spanning 12 API domains plus blob upload/download. Split into `api/` submodules sharing the `apiFetch` core.
- M12 — ~16 pages re-implement the same `loading/error/useEffect` fetch pattern, and 55 call sites use raw `getToken()` while the cleaner `useAuthedToken` hook is used in only 10. Adopt a shared `useApiQuery` hook or React Query.
- M13 — Duplicated components: two `VideoPlayer.tsx`, two `Modal.tsx`, two `FiltersBar.tsx` — none in `components/ui/`. Consolidate.
- M14 — Nearly everything is a client component; most pages fetch after mount, causing spinners on every navigation. The server-side dashboard fetch pattern (`lib/dashboard-data.ts`) should be extended to grades/courses pages.
- M15 — Several `eslint-disable` suppressions of `exhaustive-deps` in fetch effects (`home/page.tsx:95`, `admin/reports/page.tsx:279`, `Sidebar.tsx:43`, `VideoPlayer.tsx:218`) risk stale closures — stabilize with `useCallback` instead.
- M16 — Derived-state-in-effect pattern for `selectedYearId` (`home/page.tsx:98-120`) is fragile; derive during render or `useMemo`.
- M17 — No `typecheck` script in `package.json` despite strict TS — type errors only surface at build.

**Repo / infrastructure**
- M18 — **No CI/CD** — no GitHub Actions at all. No automated build/lint/test on push or PR.
- M19 — **No monorepo tooling** — no root `package.json`, turbo, or nx; the two apps are entirely disconnected.
- M20 — No pre-commit hooks (Husky/lint-staged) — nothing stops committing broken code or secrets locally.
- M21 — `docs/03-API-ENDPOINTS.md:602` references `docs/05-ATTENDANCE-ROADMAP.md`, which is deleted in the working tree — broken link once committed.

### 🟡 Low

- L1 — Ad-hoc string role checks inside services (`_currentUser.Role is not ("Admin" or "Instructor")`) duplicate controller attributes — consolidate on policies.
- L2 — Document generators (`WordDocumentGenerator`, `TranscriptPdfGenerator`) live in the API layer; move behind interfaces in Infrastructure.
- L3 — `PendingModelChangesWarning` globally suppressed in `ApplicationDbContext.cs:19-20` — hides migration drift.
- L4 — Blob ownership check uses substring `Contains(submissionId)` (`SubmissionService.cs:249`) instead of exact path-segment match.
- L5 — `CreatedAt`/`UpdatedAt` set manually in services, duplicating the centralized `UpdateAuditableEntities` logic.
- L6 — Auth rate limit is per-IP only (300/min) — coarse for classroom NAT; add per-account throttling.
- L7 — Recurring Hangfire job registered inline in `Program.cs:234-240` with inline date math — untestable; move to a startup service.
- L8 — Frontend `any` casts: `ChangePasswordModal.tsx:58`, `AssignmentList.tsx:99,112` paper over type mismatches.
- L9 — No shared `<LoadingState>`/`<ErrorState>` components — ~16 inconsistent inline implementations.
- L10 — Accessibility: many icon-only buttons lack `aria-label`; only 8 `alt=` attributes across the app.
- L11 — `<img>` instead of `next/image` for avatars (defensible, but flagged).
- L12 — ESLint 8 is EOL; migrate to v9 flat config. No Prettier or root `.editorconfig`.
- L13 — Docs claim shadcn/ui but the app uses Tailwind + custom components only — correct the stack description.
- L14 — Dev appsettings template uses `sk-ant-api03-your-key-here` — a real-looking key format that can trigger secret scanners; normalize to `YOUR_ANTHROPIC_API_KEY`.
- L15 — Next.js pinned at 14.2.35 — one major behind; plan the 15 upgrade after CI exists.

---

## Roadmap

### Phase 1 — Stop the bleeding (1–2 days)

Small, high-impact, low-risk fixes.

- [x] **Move local dev secrets to `dotnet user-secrets`** — done 2026-07-09; `appsettings.json`/`appsettings.Development.json` no longer contain secrets. **Rotation of the previously exposed keys (Anthropic key, Azure Storage key, Gmail app password, JWT secret) still needs to be done manually** (H5).
- [x] Fix the fire-and-forget `LastLoginAt` write — now saved synchronously with logged failure (H1).
- [x] Home-page derived-state-in-effect refactored to `useMemo`-derived selection (M16).
- [x] Fix Hangfire dashboard middleware ordering + auth — mapped after auth middleware; accepts Admin JWT or `Hangfire:Dashboard` Basic-auth credentials; `HANGFIRE.md` reconciled (H4).
- [x] Push filtering/pagination into SQL for the submission queue and gradebook queries (H2, H3).
- [x] Guard the Claude response parsing (M3) — content blocks are now validated and text blocks concatenated; non-text/empty responses throw a descriptive error.
- [x] Restore or de-reference `docs/05-ATTENDANCE-ROADMAP.md` (M21); fixed the shadcn/ui doc claim (L13); normalized the template API-key placeholder (L14).
- [x] Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json` (M17).

### Phase 2 — Safety net: CI + first tests (3–5 days)

Everything after this gets cheaper once this exists.

- [x] GitHub Actions CI at `.github/workflows/ci.yml` (M18) — web job: lint + typecheck + test + build; api job: restore + build + test, on push to main and every PR. Also added `apps/web/.eslintrc.json` (next/core-web-vitals) — `next lint` had never actually been configured — and fixed the lint errors it surfaced.
- [x] Created `apps/api/tests/CodeStackLMS.Application.Tests` (xUnit + SQLite in-memory against the real `ApplicationDbContext`) — 22 tests covering `AuthService` (login/change/forgot-password, enumeration safety, LastLoginAt) and `InstructorService` queue/gradebook SQL (latest-attempt, filters, pagination, role check) (H8). Next targets: `SubmissionService` state transitions and cohort resolution.
- [x] Added Vitest to the frontend (`npm run test`, `npm run typecheck`) — 21 tests covering the `returnUrl` open-redirect validator (extracted to `lib/safe-return-url.ts`), JWT decode/expiry/role helpers, and `apiFetch` error mapping (H8, M17).
- [x] Root `package.json` with cross-app scripts (`npm run test` / `build` / `lint` / `typecheck` from the repo root) (M19), plus a Husky pre-commit hook that typechecks apps/web and builds apps/api only when their files are staged (M20).
- [x] Aligned all Microsoft/EF packages to `10.0.x` for the `net10.0` target (M10); bumped `Azure.Identity` to 1.14.2 and pinned patched `Microsoft.OpenApi` 2.10.0 and `SQLitePCLRaw` to clear NU1903 vulnerability warnings.

### Phase 3 — Auth hardening (1 week)

- [x] **httpOnly session cookie via BFF pattern** (H6) — done 2026-07-09. Because web (Vercel) and API (Azure) are cross-site, the cookie is set first-party by Next.js route handlers: `/api/auth/login` proxies login and stores the JWT httpOnly; `/api/proxy/[...path]` attaches it to backend calls server-side; `/api/auth/logout` clears it. Client JS never holds the JWT (a readable `cslms_role` cookie exists for UI display only). Blob uploads/video still go direct via SAS URLs.
- [x] **Server-side route guards** (H7) — `src/middleware.ts` redirects unauthenticated/expired sessions to login (clearing stale cookies) and role-gates `/admin` (Admin) and `/instructor` (Admin/Instructor).
- [x] **Backend authz audit** (H7) — every controller has class-level `[Authorize]` (or stricter); `[AllowAnonymous]` only on login/forgot-password; `{userId}`-parameterized endpoints (transcript, profile) verify self-or-staff in the service layer. Follow-up: an integration test asserting anonymous/wrong-role rejection.
- [x] **Refresh tokens + 30-minute access tokens** (M7) — done 2026-07-09. New `RefreshToken` entity (SHA-256 hash at rest, 14-day expiry, `AddRefreshTokens` migration applies on next API start), `POST /api/auth/refresh` and `POST /api/auth/logout` endpoints (rate-limited), revocation of all sessions on password change/reset. The BFF does silent refresh in two places: the middleware refreshes on page navigations (rewriting the request cookie so server components see the fresh token), and `/api/proxy` retries once after a 401. Refresh tokens live in an httpOnly `cslms_refresh` cookie; client JS never sees any token. Non-rotating by design (avoids concurrent-refresh races) — rotation with reuse detection is a possible future hardening.
- [ ] Add per-account throttling to auth endpoints (L6) — now more relevant since proxied logins share Vercel egress IPs in the per-IP bucket. ~~Reject placeholder JWT secrets at startup (M9)~~ done: known placeholder values are rejected outside Development.
- [x] DataAnnotations on request DTOs (M6) — auth, grading, return, comments, submissions (upload/complete/GitHub), assignments, and announcements now validate email format, lengths, ranges (score 0–100, file size ≤100 MB), returning 400s via `[ApiController]` automatic validation.
- [ ] Lesson-artifact uploads (`POST /api/lessons/{id}/artifacts`) now pass through the Vercel proxy, which caps request bodies (~4.5 MB). Move them to SAS-based direct upload like submissions/avatars.

### Phase 4 — Structural refactors (1–2 weeks)

Do these *after* the test safety net exists.

- [x] Split `InstructorService` (647 lines) into `GradingService`, `SubmissionQueueService`, `GradebookService` with focused interfaces (M1); extracted `ProgressReportPromptBuilder` (pure, unit-testable) from `WeeklyProgressReportJob` (605 → 317 lines) (M2).
- [x] Split `api-client.ts` into 16 domain modules under `src/lib/api/`; `api-client.ts` is now pure re-exports so no import site changed (M11).
- [x] Added `useApiQuery` hook (loading/error/stale-response guard/login redirect) and migrated three representative pages; removed all four `eslint-disable react-hooks/exhaustive-deps` suppressions by stabilizing callbacks (M12, M15). Remaining hand-rolled fetch effects can migrate incrementally.
- [x] Consolidated the duplicated `Modal` into `components/ui/Modal.tsx` (M13). The two `VideoPlayer`s and `FiltersBar`s were inspected and intentionally left separate — they are different components (token-based streaming player vs. resolved-URL card; role/status selects vs. quick-filter chips).
- [x] Shared `LoadingState`/`ErrorState` components in `components/ui/`, adopted across 8 pages (L9).
- [x] Parallelized SAS URL generation with `Task.WhenAll` in submission detail, artifact list, and lesson list (M4); blob deletions now happen only after the DB transaction commits, best-effort with logging (M5).
- [x] Exact-match blob ownership check — the submission-id path segment must match exactly instead of a substring anywhere in the path (L4).
- [x] Centralized role checks in `ICurrentUserService.IsAdmin()`/`IsStaff()` extensions — one place role strings are compared; controllers' `[Authorize(Roles=...)]` remain the primary gate (L1).
- [x] Moved `WordDocumentGenerator`/`TranscriptPdfGenerator` (and their QuestPDF/OpenXml packages) to `Infrastructure/Documents` behind `IWordDocumentGenerator`/`ITranscriptPdfGenerator` (L2).
- [x] Removed the `PendingModelChangesWarning` suppression; verified `dotnet ef migrations has-pending-model-changes` reports the model in sync (L3).
- [x] Removed the 9 redundant manual `UpdatedAt` assignments — `UpdateAuditableEntities` is the single writer; intentional `CreatedAt` business logic (resubmission date reset) kept (L5).
- [x] Recurring-job registration moved to `RecurringJobsRegistrar`, and **fixed a real bug**: the weekly report job's date argument was serialized once at deploy time, freezing "current week" forever; the job now computes its week at execution (L7).

### Phase 5 — Polish & modernization (ongoing)

- [x] Grades page converted to a server component (dashboard pattern): enrollments + first course's grades render with the HTML; course switching stays client-side via the proxy (M14). Course-detail page remains a candidate for the same treatment.
- [x] Accessibility pass: `aria-label` on all icon-only buttons, focus management in the shared Modal (focus on open, restore on close), alt text verified (L10). A dependency-free focus-trap remains a nice-to-have.
- [x] Zero `any`/`as any` remain in apps/web; fixing `AssignmentList` uncovered and fixed a latent bug where the edit form opened with `undefined` fields (L8). M8 (external video URL expiry) intentionally kept — needed for archiving.
- [x] Prettier + root `.editorconfig` added (config only, no mass reformat) (L12). **Deferred by design:** ESLint 9 (eslint-config-next 14 requires ESLint 8) and the Next.js 15 upgrade — do them together as one migration now that CI is green (L15).
- [x] k6 load tests wired into a manual `workflow_dispatch` CI job (`.github/workflows/load-test.yml`) with selectable script and target URL — deliberately not automatic.

---

## Suggested Order of Attack (TL;DR)

1. **Today**: rotate secrets, fix the fire-and-forget DbContext write, fix Hangfire middleware order.
2. **This week**: SQL-side pagination for queue/gradebook, CI pipeline, first test projects.
3. **Next two weeks**: refresh tokens + httpOnly cookie + middleware auth, DTO validation.
4. **Then**: the structural refactors, protected by the tests you now have.
