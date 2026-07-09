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
- [x] Fix Hangfire dashboard middleware ordering + auth — mapped after auth middleware; accepts Admin JWT or `Hangfire:Dashboard` Basic-auth credentials; `HANGFIRE.md` reconciled (H4).
- [x] Push filtering/pagination into SQL for the submission queue and gradebook queries (H2, H3).
- [ ] Guard the Claude response parsing (M3).
- [ ] Restore or de-reference `docs/05-ATTENDANCE-ROADMAP.md` (M21); fix the shadcn/ui doc claim (L13); ~~normalize the template API-key placeholder (L14)~~ done.
- [ ] Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json` (M17).

### Phase 2 — Safety net: CI + first tests (3–5 days)

Everything after this gets cheaper once this exists.

- [ ] Add GitHub Actions: `dotnet build` for the API; `npm run lint && npm run typecheck && npm run build` for web, on every PR (M18).
- [ ] Create `CodeStackLMS.Application.Tests` — first targets: `AuthService` (login/forgot/change-password), `SubmissionService` state transitions and cohort resolution, `InstructorService` grading (H8).
- [ ] Add Vitest to the frontend — first targets: `api-client.ts` error handling, `auth.ts` JWT decode, the login `returnUrl` open-redirect validator (H8).
- [ ] Add a root `package.json` with workspace scripts (or Turborepo) so `lint`/`build`/`test` run from the root (M19), plus Husky + lint-staged (M20).
- [ ] Align .NET packages to `10.0.x` to match the `net10.0` target; verify build in CI (M10).

### Phase 3 — Auth hardening (1 week)

- [ ] Implement refresh tokens with a short-lived access token (15–30 min) and revocation; the frontend type already anticipates this (M7).
- [ ] Move the auth token to an **httpOnly cookie set by the backend**; add a Next.js `middleware.ts` for route/role gating instead of client-only checks (H6, H7).
- [ ] Audit every controller for `[Authorize(Roles=...)]` coverage and add an integration test asserting anonymous/wrong-role access is rejected on privileged endpoints (H7).
- [ ] Add per-account throttling to auth endpoints (L6); reject placeholder JWT secrets at startup (M9).
- [ ] Add DataAnnotations/FluentValidation to request DTOs so bad input returns 400, not 500 (M6).

### Phase 4 — Structural refactors (1–2 weeks)

Do these *after* the test safety net exists.

- [ ] Split `InstructorService` into grading / queue / gradebook services (M1); extract the prompt builder from `WeeklyProgressReportJob` (M2).
- [ ] Split `api-client.ts` into per-domain modules (M11).
- [ ] Introduce a shared `useApiQuery` hook (or React Query) and migrate the ~16 hand-rolled fetch effects; standardize on `useAuthedToken` (M12, M15).
- [ ] Consolidate duplicated `Modal` / `VideoPlayer` / `FiltersBar` into `components/ui/`; add shared `LoadingState`/`ErrorState` (M13, L9).
- [ ] Parallelize SAS URL generation (M4); move blob deletion after transaction commit (M5); exact-match blob ownership check (L4).
- [ ] Consolidate role checks into authorization policies (L1); move doc generators to Infrastructure (L2); remove the `PendingModelChangesWarning` suppression (L3); rely on `UpdateAuditableEntities` for timestamps (L5); move Hangfire scheduling out of `Program.cs` (L7).

### Phase 5 — Polish & modernization (ongoing)

- [ ] Convert read-heavy pages (grades, course detail) to server components following the dashboard pattern (M14).
- [ ] Accessibility pass: `aria-label` on icon buttons, `alt` text, keyboard traps in modals (L10).
- [ ] Fix the remaining `any` casts (L8); shorten external video URL expiry or document the exception (M8).
- [ ] Upgrade ESLint to v9, add Prettier + root `.editorconfig` (L12); plan the Next.js 15 upgrade once CI is green (L15).
- [ ] Wire the k6 load tests into a scheduled or pre-release CI job.

---

## Suggested Order of Attack (TL;DR)

1. **Today**: rotate secrets, fix the fire-and-forget DbContext write, fix Hangfire middleware order.
2. **This week**: SQL-side pagination for queue/gradebook, CI pipeline, first test projects.
3. **Next two weeks**: refresh tokens + httpOnly cookie + middleware auth, DTO validation.
4. **Then**: the structural refactors, protected by the tests you now have.
