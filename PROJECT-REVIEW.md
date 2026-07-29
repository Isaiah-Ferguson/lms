# CodeStack LMS — Project Review

**Date:** 28 July 2026 · **Commit:** `64aae87` (main) · **Scope:** full stack — `apps/api` (.NET 10), `apps/web` (Next.js 14.2), CI/CD, docs, security posture

---

## Remediation status

**C1 and H1–H6 are fixed** (28 July 2026). Everything else below is outstanding.

| ID | Status | What changed |
|---|---|---|
| C1 | ✅ Fixed | Lockfiles committed, `.gitignore:3` removed, Vercel switched to `npm ci`. Verified: lint, typecheck, tests, and build all pass locally — no errors had accumulated behind the broken gate. |
| H1 | ✅ Fixed | `RequireCourseAccessAsync` helper now gates `GetModuleLessonsAsync`; `GetVideoTokenAsync` refactored onto the same helper. |
| H2 | ✅ Fixed | Replaced with a single-use, 1-hour reset-token flow (`PasswordResetToken` entity + migration + `POST /api/auth/reset-password` + `/reset-password` page). Requesting a link no longer mutates the account, so the lockout DoS and the SMTP-failure bricking are both gone. |
| H3 | ✅ Fixed | `CompleteUploadAsync` now reads real blob properties via `GetBlobPropertiesAsync`, enforces the size/type/count limits against those, persists verified values, deletes over-limit blobs, and rejects duplicate paths. Ownership is checked before any storage lookup, closing the existence oracle. |
| H4 | ✅ Fixed | `RequestUploadAsync` no longer deletes anything; the grade/artifact/GitHub swap moved into `CompleteUploadAsync`, so an abandoned re-request leaves the previous attempt intact. |
| H5 | ✅ Fixed | Added `(app)/error.tsx`, `(app)/loading.tsx`, root `not-found.tsx`, `global-error.tsx`. The layout now redirects to login on 401/403 instead of crashing the whole shell. |
| H6 | ✅ Partly fixed | Backend tests 27 → 93, web tests 21 → 39 (132 total). New suites cover the upload lifecycle, lesson authorization, the grade ladder, the reset-token flow, and middleware role gates + silent refresh. Still absent: integration/E2E (`WebApplicationFactory`, Playwright), coverage thresholds, and tests for attendance, reports, and transcripts. |

Two notes carried forward: the `AddPasswordResetTokens` migration runs on the API's next startup, and the reset email now sends a link rather than a temporary password.

---

## Verdict

This is a **well-built project by a careful engineer**, and the evidence for that is specific rather than flattering: refresh tokens are stored as SHA-256 hashes and never in plaintext; the access token lives in an httpOnly cookie so XSS cannot steal it; there is **zero raw SQL** anywhere in ~11,000 lines of C#; there are **zero uses of `any`** across 148 TypeScript files; startup *refuses to boot* in production on a placeholder JWT secret. Several of these are things mature commercial codebases get wrong.

The problems are not sloppiness. They cluster into three honest patterns:

1. **A safety net that isn't attached.** CI exists, is well-designed, and has failed on 100% of its runs — the entire frontend quality gate has never once executed.
2. **Endpoints that authenticate but don't check *which* course you belong to.** Auth is strong; per-object scoping is missing on a handful of read paths.
3. **Destructive-before-confirmed write paths.** Two flows delete real user data (a grade, a password) before the operation that justifies the deletion succeeds.

Nothing here requires a rewrite. The highest-severity item is a one-line `.gitignore` fix.

**Good news up front:** git history was audited for leaked credentials and is **clean**. No real secret has ever been committed. The `.env.local` file contains only a public API URL. The gitignore strategy is working exactly as designed.

---

## Scorecard

| Area | Assessment |
|---|---|
| Security architecture | **Strong** — no critical vulns, no auth bypass, no SQLi, no XSS |
| Authorization scoping | **Gap** — 5 read endpoints authenticate but don't check enrollment |
| Backend architecture | **Strong** — Clean Architecture genuinely respected, dependencies point inward |
| Data-layer correctness | **Good** — real transactions, retry-safe, indexes match query patterns |
| Frontend type safety | **Excellent** — strict mode, zero `any`, race-condition-aware fetching |
| Frontend resilience | **Weak** — zero error/loading boundaries across 24 routes |
| CI/CD | **Broken** — web job has never passed; no lockfiles committed |
| Test coverage | **Thin** — 48 cases, all business-critical write paths untested |
| Documentation | **Stale** — docs deny a shipped feature; several phantom endpoints |

---

## What's genuinely good

### Security done right (verified, not assumed)

- **Refresh tokens stored hashed.** `AuthService.cs:130` mints 64 random bytes via `RandomNumberGenerator`; only the SHA-256 hex is persisted. A database compromise yields no usable sessions.
- **Access token unreachable from JavaScript.** `session-cookies.ts:21-36` sets `httpOnly`, `secure`, `sameSite: lax`. `auth.ts:14-16` makes the client-readable role cookie explicitly a "UX hint only," and `getToken()` returns the literal string `"session"` — never a real token. The trust model is documented at every layer.
- **Startup refuses placeholder secrets.** `Program.cs:69-90` throws on a missing `Jwt:Secret`, on anything under 32 bytes, *and* maintains an explicit denylist of known placeholder values rejected outside Development. Better than most production codebases.
- **Zero raw SQL.** `FromSqlRaw|ExecuteSqlRaw|FromSqlInterpolated` — no matches across the entire solution. SQL injection surface is effectively nil.
- **Constant-time credential comparison.** `HangfireAuthorizationFilter.cs:74-77` uses `CryptographicOperations.FixedTimeEquals`, and the dashboard requires an Admin JWT or configured Basic auth — not the usual localhost-only hand-wave.
- **SSRF properly constrained.** GitHub submission URLs require `https` + exact host `github.com`, then only owner/repo segments interpolate into a fixed `api.github.com` base with a 10s timeout.
- **Open-redirect defense decodes *before* validating** (`safe-return-url.ts:4-20`) — the exact ordering bug most implementations get wrong — and it has tests covering encoded protocol-relative and backslash payloads.
- **Cryptographically random temporary passwords** with guaranteed character-class mix and a proper Fisher-Yates shuffle (`AuthService.cs:288-315`). No `System.Random`.

### Backend engineering

- **Transaction discipline.** `SubmissionService.cs:144-232` uses `CreateExecutionStrategy()` with explicit transactions and retry-safe closure state, deleting blobs only *after* commit so a rollback can never destroy a still-current attempt. This is a subtlety most people miss.
- **The gradebook N+1 was actively avoided.** `SubmissionQueueService.cs:27-108` resolves "latest attempt" in SQL with clamped pagination and minimal projections.
- **Indexes match real query patterns** — unique `(AssignmentId, StudentId, AttemptNumber)`, `(CourseId, StudentId, Date)`, unique email, unique enrollment pair. Each one backs an actual upsert or race in the services.
- **Clean Architecture is real, not aspirational.** Domain has zero outbound references; Infrastructure → Application → Domain holds throughout. The compromises (EF exposed via `IApplicationDbContext`) are deliberate and documented.
- **Hygiene greps come back clean:** 0 uses of `DateTime.Now`, 0 blocking `.Result`/`.Wait()`, and `CancellationToken` propagated through all 69 endpoints.

### Frontend engineering

- **Zero `any`** across 148 files with `strict: true`, and only 3 eslint-disable comments in the entire app, each justified.
- **Stale-response races are handled.** `use-api-query.ts:36-37` uses a request counter so an older response can never overwrite a newer one — and the pattern is correctly replicated in four other places.
- **Middleware silent-refresh is subtly correct.** `middleware.ts:73-93` rewrites the *incoming* request's cookie header so server components in that same request see the fresh token, then sets cookies on the response. Most hand-rolled implementations refresh only for the next request.
- **Accessible shared primitives.** `Modal.tsx` has portal, `aria-modal`, Escape-to-close, and focus save/restore; `LoadingState` uses `role="status" aria-live="polite"`; `ErrorState` uses `role="alert"`.
- **Dark mode with a pre-paint script** (`layout.tsx:20-33`) preventing FOUC, plus the `color-scheme` fix for date inputs.

### Process

- **Backend tests use SQLite, not EF InMemory** (`TestSupport/TestDb.cs`), so correlated subqueries and pagination are verified as real SQL translation. This is the right call and rarer than it should be.
- **The auth tests are genuinely good** — 18 cases covering the security-critical negatives: refresh after revocation, refresh after password change, deactivated accounts, enumeration-safe forgot-password.
- **Load testing is deliberately manual** (`load-test.yml` is `workflow_dispatch`-only) with an explicit comment that load-testing production should be a decision, not a side effect.
- **Supply-chain awareness** — csproj files carry explicit version pins with CVE advisory IDs in comments.

---

## Findings

### CRITICAL

#### C1 — CI has never passed; the entire frontend quality gate is decorative

**Evidence:** All 4 CI runs in history show `failure`. Run `29051924555` fails in **8 seconds** at `actions/setup-node@v4`:

```
##[error]Some specified paths were not resolved, unable to cache dependencies.
```

**Root cause:** [.gitignore:3](.gitignore#L3) ignores `package-lock.json` globally. `git ls-files` returns **zero** tracked lockfiles, and `git log --all --follow` confirms neither was ever tracked. But [ci.yml:19-23](.github/workflows/ci.yml#L19-L23) sets `cache-dependency-path: apps/web/package-lock.json` and then runs `npm ci` — which cannot function without a lockfile.

**Impact:** `npm run lint`, `typecheck`, all 21 frontend tests, and `next build` have **never executed in CI**. The API job passes, so the repo shows a red X that is easy to read as "the known web thing" while the frontend is entirely unguarded. Separately, `vercel.json` uses `installCommand: "npm install"`, so production deploys resolve dependencies fresh every time — a bad transitive release can break production with zero code changes.

**Fix:** Delete line 3 of `.gitignore`, commit both lockfiles, switch Vercel to `npm ci`. One line un-breaks CI, caching, and reproducible builds. *Expect the first green run to surface real lint/type errors that have accumulated unchecked.*

---

### HIGH

#### H1 — `GET /api/lessons?moduleId=` returns download URLs with no enrollment check

**File:** [LessonService.cs:284-329](apps/api/src/CodeStackLMS.Application/Lessons/LessonService.cs#L284-L329) · controller [LessonsController.cs:152-160](apps/api/src/CodeStackLMS.API/Controllers/LessonsController.cs#L152-L160)

`GetModuleLessonsAsync` never references `_currentUser`. It has no enrollment check and no role check beyond the class-level `[Authorize]` — yet for every lesson it mints a **1-hour read SAS URL** per artifact and returns it in the response body.

This is provably an oversight rather than a design decision: the sibling method `GetVideoTokenAsync` in the *same file* (lines 57-66) correctly enforces `IsStaff() || enrolled-in-course` and throws `ForbiddenException`.

**Attack:** Any authenticated user — including a student enrolled in nothing — who learns a `moduleId` (from a shared link, a support ticket, a log) receives live SAS download links to all course materials for that module. The SAS *is* the only access control on those blobs, so the links work directly against Azure Blob Storage for the next hour, from any IP, with no further authentication.

**Fix:** Mirror the `GetVideoTokenAsync` guard at the top of the method. Also consider dropping the artifact SAS from 1 hour to the 10 minutes used for submission artifacts.

#### H2 — Forgot-password resets the password *before* sending the email, and swallows send failures

**File:** [AuthService.cs:215-252](apps/api/src/CodeStackLMS.Application/Auth/AuthService.cs#L215-L252)

The flow overwrites `PasswordHash`, sets `MustChangePassword`, and revokes every session — then tries to email the new temporary password, catching and logging any failure (lines 247-251). There is no emailed reset *link*; the reset is immediate and unauthenticated.

Two distinct failure modes:
- **Account-lockout DoS.** Anyone who knows a student's email can repeatedly invalidate their password and force-logout all their sessions. The 300/min per-IP limiter barely inconveniences this.
- **Silent account bricking.** If SMTP fails, the password has already changed and the user never receives it. They cannot log in, and nothing alerts anyone.

**Fix:** Switch to a time-limited reset token emailed as a link, changing the password only on redemption. As a minimum stopgap, send the email *before* committing and roll back on send failure.

*(Note: the enumeration handling in this same method is done correctly — unknown and deactivated accounts are indistinguishable. That part is a strength.)*

#### H3 — Upload size and content-type limits are not actually enforced

**File:** [AzureBlobStorageService.cs:37-78](apps/api/src/CodeStackLMS.Infrastructure/Storage/AzureBlobStorageService.cs#L37-L78) · [SubmissionService.cs:240-318](apps/api/src/CodeStackLMS.Application/Submissions/SubmissionService.cs#L240-L318)

`GenerateUploadSasAsync` accepts a `maxSizeBytes` parameter and **never uses it** — a SAS cannot cap upload size. The `BlobSasBuilder.ContentType` it sets is a *read-response* header override, not a PUT constraint, directly contradicting the code comment `// Enforces Content-Type header on PUT`.

`CompleteUploadAsync` then trusts the client completely: it persists the client-declared `SizeBytes`, `ContentType`, and `Checksum` without ever calling `GetPropertiesAsync` on the actual blob, without re-running the extension/MIME allowlist (that runs only at request-upload time), without capping `dto.Files.Count` (`CompleteUploadDto` has `MinLength(1)` and no maximum, versus a 20-file cap at request time), and without de-duplicating blob paths.

**Impact:** A student can PUT arbitrarily large blobs of any type within the 15-minute SAS window and register unlimited artifact rows in a single call. Your storage bill and your malware surface are both effectively unbounded.

**Fix:** At complete-upload, call `GetPropertiesAsync` per blob, persist the *real* length and content type, enforce the 100 MB / 500 MB / 20-file limits server-side, and delete anything oversized.

#### H4 — Requesting an upload destroys the existing grade before anything is uploaded

**File:** [SubmissionService.cs:159-203](apps/api/src/CodeStackLMS.Application/Submissions/SubmissionService.cs#L159-L203)

For an existing submission, `RequestUploadAsync` removes the `Grade` row, all artifacts, and `GitHubInfo`, then resets status to `PendingUpload` — with **no status guard** and no requirement that an upload ever completes.

**Impact:** A student unhappy with a score calls request-upload and simply never uploads. The grade is permanently gone — no history is retained and `AttemptNumber` never increments, so there is no audit trail that a grade ever existed. This is trivially discoverable by any student who clicks "resubmit" once.

**Fix:** Defer deletion of the old grade and artifacts to `CompleteUploadAsync` (swap on success), or at minimum refuse to re-request on `Graded` status without an explicit instructor return.

#### H5 — Zero error/loading boundaries; one API hiccup renders an unstyled crash page

**Files:** [(app)/layout.tsx:15](apps/web/src/app/(app)/layout.tsx#L15) · [dashboard-data.ts:35-37](apps/web/src/lib/dashboard-data.ts#L35-L37)

The shared `(app)` layout awaits `getDashboardDataFromApi`, which throws a plain `Error` on any non-OK response. There are **0** `error.tsx`, **0** `loading.tsx`, **0** `not-found.tsx`, and **0** `global-error.tsx` files across all 24 routes.

**Impact:** Any backend blip during a hard navigation renders Next's default unstyled "Application error" page — with no retry, no branding, and no useful message — simultaneously on *every* authenticated route. Every server-rendered navigation also blocks on that fetch with zero visual feedback, and there is no branded 404.

**Fix:** Add `(app)/error.tsx` and `loading.tsx` reusing the existing `ErrorState`/`LoadingState` components, add a root `not-found.tsx`, and make the layout degrade gracefully instead of throwing.

#### H6 — Every business-critical write path is untested

48 test cases exist and the ones that exist are good — but they cover auth, the submission queue, and two gradebook paths. **Untested:** `GradingService` (grade submission, score bounds, return-with-reason), `SubmissionService` (the entire upload → SAS → complete → ReadyToGrade lifecycle), `AttendanceService`, `ProgressReportService`, `TranscriptService`, `GradeScale` (a pure function — trivially testable), plus every authorization and ownership rule.

Two details make this sharper: `FakeBlobStorageService` already exists in `TestSupport/Fakes.cs`, purpose-built for submission tests, and is **used by nothing**. And on the frontend, the proxy route's 401→refresh→retry path and middleware's role gates are both plain functions over `NextRequest` — directly testable in the existing Vitest setup — and neither has a single test.

There is also no integration/E2E layer at all (no `WebApplicationFactory`, no Playwright), meaning controllers, middleware, the rate limiter, and the security headers execute in **no test whatsoever**. No coverage measurement exists in either app.

---

### MEDIUM

**M1 — Enrollment scoping missing on course and assignment reads.** `GET /api/courses/{courseId}` ([CourseDetailService.cs:22-59](apps/api/src/CodeStackLMS.Application/Courses/CourseDetailService.cs#L22-L59)) returns the full syllabus, announcements, and **live Zoom URL** to any authenticated user — a student can join classes for cohorts they aren't in. The three assignment read endpoints ([AssignmentService.cs:20-106](apps/api/src/CodeStackLMS.Application/Assignments/AssignmentService.cs#L20-L106)) never touch `_currentUser`, exposing instructions and attachments across all courses. Same fix shape as H1 — do all four together with a shared helper.

**M2 — Instructors are entirely unscoped.** There is no instructor-to-course relationship in the domain at all (`Course.cs` has no `InstructorId`), so every instructor endpoint authorizes on role alone. Any instructor can read every student's submissions, grades, and AI progress reports across all cohorts, and silently alter any grade in the system. `SubmissionService.cs:470` acknowledges this in a comment. This is a design gap needing a migration — schedule it as its own piece of work, and until then treat instructor accounts as near-admin.

**M3 — Hardcoded live Zoom URL with embedded passcode in source.** [CourseDetailService.cs:251-252](apps/api/src/CodeStackLMS.Application/Courses/CourseDetailService.cs#L251-L252) — `DefaultZoomUrl` is returned for any course lacking a configured URL. Move to configuration; return null when unset.

**M4 — Refresh tokens never rotate and have no reuse detection.** [AuthService.cs:81-107](apps/api/src/CodeStackLMS.Application/Auth/AuthService.cs#L81-L107) returns the *same* token on refresh. A stolen refresh token is a renewable 14-day session with no theft signal — the legitimate user's token keeps working identically, so nothing anywhere indicates compromise. The table also grows unboundedly; no purge job exists. Rotate on refresh, chain via `ReplacedByTokenId`, and revoke the whole family on replay.

**M5 — No account lockout; login limiter too loose.** 300 requests/min per IP ([Program.cs:160-172](apps/api/src/CodeStackLMS.API/Program.cs#L160-L172)) = 18,000 guesses/hour against one account, trivially multiplied across IPs. No failure counter exists anywhere. Add a per-account limiter keyed on normalized email plus `FailedLoginCount`/`LockoutEnd` on `User`.

**M6 — Password policy is length-only (`>= 8`) and enforced on exactly one path** ([AuthService.cs:203-204](apps/api/src/CodeStackLMS.Application/Auth/AuthService.cs#L203-L204)). No complexity, no breach-list check, no reuse prevention, no shared validator — so any future password path starts with zero validation. Combined with M5 this makes online guessing realistic.

**M7 — HTML injection into notification emails.** `SendGradeNotificationJob.cs:40-48` and `SendSubmissionReturnedNotificationJob.cs:37-45` interpolate the student's self-editable display name, grade comments, and return reason raw into HTML email bodies. `AuthService` HtmlEncodes the same class of data — the jobs don't. A student-set display name can inject links into mail sent from your domain.

**M8 — `EmailNotificationsEnabled` is stored, displayed, and never honored.** No consumer exists; both notification jobs email regardless. Users who opt out still receive everything.

**M9 — Students and admins see different overall percentages for identical grades.** `GradesClient.tsx:47-51` divides by graded rows only; `admin/grades/page.tsx:30-32` divides by all rows including ungraded. A student with 100/100 on their one graded assignment of ten sees **100%**; the admin sees **10%**. Extract one shared `computeOverall`.

**M10 — No frontend security headers.** [next.config.mjs](apps/web/next.config.mjs) is empty — no CSP, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`, no `X-Content-Type-Options`, `poweredByHeader` not disabled. The API sets a strict CSP; the app rendering all authenticated UI sets none, leaving no clickjacking defense on `/admin` or `/profile`.

**M11 — `useApiQuery` has no cache, dedupe, abort, or timeout.** Every mount refetches; nothing is shared; in-flight requests are never aborted; and `apiFetch` has **no timeout**, so a hung backend hangs the UI indefinitely. `homeApi.getDashboard` is independently fetched by the layout plus five pages — the same payload twice per navigation.

**M12 — Logged-in users visiting `/` are shown the login form.** [page.tsx:4](apps/web/src/app/page.tsx#L4) unconditionally redirects to `/login`, and middleware passes public paths through without checking for an existing session. Change to `redirect("/home")`.

**M13 — ~816 lines of dead code, including an entire secure video stack.** `components/lessons/VideoPlayer.tsx` (251 LOC) — the token-based HLS player with SAS expiry auto-refresh and dynamic import — is imported nowhere, and is the *only* consumer of `hls.js`. The live player drops `lesson.videoUrl` into a `<video src>` with no expiry handling and a weaker `toEmbedUrl` (plain `youtube.com` vs the dead one's `youtube-nocookie.com`). Also dead: `CommentsThread` (179), the entire impersonation flow, 5 smaller components, and an orphan `submission-guidelines` route stating "max 50 MB" where the real uploader enforces 100 MB. **Either delete `hls.js`, or better — wire the good player back in.**

**M14 — `/health` is a static 200.** [Program.cs:226](apps/api/src/CodeStackLMS.API/Program.cs#L226) probes nothing. App Service health checks and the k6 baseline both trust it; the API reports healthy with the database down. Add `AddDbContextCheck<ApplicationDbContext>()` as a readiness endpoint.

**M15 — Auto-migrate + seed on every startup** ([Program.cs:229-249](apps/api/src/CodeStackLMS.API/Program.cs#L229-L249)) with no coordination lock (races on scale-out or slot swap) and **zero mentions of backup or rollback** anywhere in the docs. Fail-fast behavior is correct; the strategy just needs documenting.

**M16 — Deprecated non-Unicode `TEXT` columns** for `Grade.OverallComment`, `FeedbackComment.Message`, and `Lesson.TextContent`. Emoji and non-Latin characters in grade feedback will be mangled on save. `RubricBreakdownJson` two lines away correctly uses `NVARCHAR(MAX)`.

**M17 — Updating a lesson clobbers its video configuration.** `LessonService.cs:173-177` unconditionally recomputes `VideoSource`, so renaming an Azure-blob-hosted lesson silently flips it to `None` and breaks playback while `VideoBlobPath` still points at the video.

**M18 — The comments feature cannot connect instructors to students.** Both read and write resolve through *the caller's own* submission (`CommentService.cs:28-96`), so an instructor commenting auto-creates an instructor-owned Draft placeholder in a thread no student will ever see. Instructor feedback via comments is silently lost.

**M19 — Docs actively contradict shipped code.** `docs/01-ARCHITECTURE.md:10` and `docs/03-API-ENDPOINTS.md:39` both state "no refresh token flow" — the refresh flow shipped in migration `20260709_AddRefreshTokens` and `AuthController.cs:38,53`. `docs/03` also documents a `POST /api/auth/register` that **does not exist** (echoed in `load-tests/README.md`). `HANGFIRE.md` references **PostgreSQL** twice (the store is SQL Server) and says "no recurring jobs yet" while three jobs exist. `README-DEPLOY.md` hardcodes a personal `/Users/.../Downloads/` path and references a `deploy-api.yml` workflow that doesn't exist.

**M20 — Two of three load-test scripts cannot succeed.** `stress-test.js` throws immediately without `TEST_USERS`, which the workflow provides no way to pass. `spike-test.js` targets Swagger endpoints that `Program.cs:181-185` serves only in Development — against any deployed URL it measures 404s. Meanwhile `authenticated-load-test.js`, the best script, isn't offered in the workflow at all.

**M21 — Missing CI gates this repo demonstrably needs.** No dependency audit and no Dependabot — yet three recent commits are *manual* CVE patches, including one where a patched `Microsoft.OpenApi` was binary-incompatible with Swashbuckle and only failed at runtime. Also missing: EF migration drift check, `prettier --check` (configured but enforced nowhere), coverage thresholds, and a `concurrency` group.

**M22 — Node 20 is past EOL** (April 2026; today is July 2026) and pinned in CI, with no `global.json`, no `engines`, and no `.nvmrc`. Move to Node 22 and pin the toolchain.

---

### LOW

- **L1 — Login leaks account existence.** Deactivated accounts get a distinct message while unknown emails and wrong passwords share one. Ironically `ForgotPasswordAsync` handles this correctly — the two paths disagree.
- **L2 — Dark-mode contrast bugs at 12 sites** using `dark:text-slate-700/800` (near-invisible on slate-900), plus an invalid `dark:text-white-600` at `admin/attendance/page.tsx:311` that silently generates nothing.
- **L3 — Modal sprawl:** 11 hand-rolled overlays vs 5 users of the shared `Modal`. Three have no Escape handling and no focus restore; none has a focus trap (the shared one lacks it too — Tab escapes the dialog).
- **L4 — `alert()`/`confirm()` for user-facing errors in 9 places**, alongside two separately hand-rolled toast implementations.
- **L5 — `admin/grades` can load forever.** `load()` only runs when `activeCohortId !== null`, which the catch path never sets. Two sibling pages already fixed this exact bug in two different ways.
- **L6 — No API response is runtime-validated.** Every `apiFetch<T>` is a cast; zod covers only 3 auth forms. The dashboard response shape is hand-declared in **three** places that can drift independently, and `ProfileData` exists twice with different shapes for the same endpoint.
- **L7 — Form stack split:** react-hook-form + zod on 3 auth pages; ~15 other forms hand-rolled. Visible consequence: the instructor grading page silently saves an empty score as **0**.
- **L8 — `PublishReportAsync` throws unmapped exception types**, returning 500 where the controller advertises 404/400.
- **L9 — Report list over-fetches** full tracked entities including `NVARCHAR(MAX)` AI content for a summary view, with no `AsNoTracking` and no paging; `AdminParticipantsService` awaits a blob existence probe per user sequentially — an N+1 against Azure Storage.
- **L10 — Lesson artifact upload builds the blob path from the raw client filename** without `Path.GetFileName` (the submission path does this correctly). Staff-only, which caps severity.
- **L11 — Rate-limiter partition trusts unvalidated forwarded headers** (`KnownNetworks.Clear()`), safe in the intended Azure topology but topology-dependent.
- **L12 — Proxy route forwards to any backend path.** Not SSRF (the base is a fixed prefix, verified), but `params.path[0]` should be restricted to `"api"` as defense in depth.
- **L13 — 3 data tables can clip on mobile**, missing the `overflow-x-auto` wrapper two sibling tables use correctly.
- **L14 — Heavy libraries are static top-level imports** — recharts in 3 pages, FullCalendar with 5 plugins, framer-motion in `Sidebar.tsx` (so it ships in every page's shared bundle). The only `dynamic()` import in the app is inside the dead video player.
- **L15 — No per-page metadata** — every browser tab reads "CodeStack LMS".
- **L16 — Route config exported from a client component is a no-op** (`home/page.tsx:20`).
- **L17 — Cookie name hardcoded in 3 files** instead of importing `TOKEN_COOKIE`.
- **L18 — Swallowed diagnostics:** `Debug.WriteLine` for SAS failures (invisible in production), plus bare `catch {}` in three places — one of which makes an instructor see "No files" when artifact loading fails, risking grading a submission believed empty.
- **L19 — Culture-sensitive `DateOnly.TryParse`** without `InvariantCulture` in two services.
- **L20 — Dead domain concepts:** `SubmissionStatus.Uploaded/Processing/Grading` are never assigned; `AttemptNumber` is always 1, yet three services still order by it.
- **L21 — Component testing is structurally impossible today** — `vitest.config.ts` sets `environment: "node"` and includes only `*.test.ts`, excluding `.tsx`; no jsdom installed.
- **L22 — No `CLAUDE.md`, `CONTRIBUTING.md`, or `CODEOWNERS`**, no Docker/compose recipe for the SQL Server dependency, and no single command that runs both apps.
- **L23 — BCrypt work factor** is the library default (11). Fine today; consider 12–13.

---

## Secrets: audited and clean

Git history was searched specifically for leaked credentials. **Nothing real was ever committed:**

| Check | Result |
|---|---|
| Any non-template `appsettings*.json` ever added | **None** |
| `apps/web/.env.local` ever tracked | **Never** (contains only `NEXT_PUBLIC_API_URL` — not sensitive) |
| Commits containing `AccountKey=` | 2, both in a deleted deploy doc — values measured at 8 and 17 chars, i.e. `YOUR_…` placeholders |
| Commits containing `sk-ant-` | 3 — a placeholder in real key *format* (since remediated) and the changelog entry describing that fix |

**No rotation is required on account of git history.** The gitignore strategy worked.

**One hygiene recommendation:** the working-tree `appsettings.json` holds live credentials (Azure storage account key, Gmail app password, Anthropic API key, App Insights connection string) in plaintext on disk. That's normal for local dev but one `git add -f`, screen-share, or backup away from exposure. Move local development secrets to `dotnet user-secrets`, which keeps them outside the repo tree entirely.

---

## Suggested order of work

**First — restore the safety net (hours, not days)**
1. **C1** — commit the lockfiles. One line. Expect the first green run to surface accumulated lint/type errors; fix those before anything else.
2. **H5** — add `error.tsx` / `loading.tsx` / `not-found.tsx`. Small diff, removes the worst user-facing failure mode.

**Second — close the authorization gap (one focused change)**

3. **H1 + M1** — one shared `RequireCourseAccess(courseId)` helper applied to lesson listing, course detail, and the three assignment reads. The pattern already exists in `GetVideoTokenAsync`; this is mostly mechanical.

**Third — stop destructive-before-confirmed writes**

4. **H4** — defer grade/artifact deletion to successful completion.
5. **H2** — move to a token-based reset link.
6. **H3** — verify real blob properties at complete-upload and enforce limits server-side.

**Fourth — harden and cover**

7. **M5 + M6** — account lockout and a real password policy as one auth pass.
8. **M4** — refresh-token rotation with reuse detection.
9. **H6** — tests for `GradeScale`, `GradingService`, `SubmissionService` (the fakes are already written), plus the proxy route and middleware role gates.
10. **M10** — frontend security headers; a few lines in `next.config.mjs`.

**Then, as scheduled work**

11. **M2** — the instructor-to-course domain model. Needs a migration; treat as its own project.
12. **M13** — dead-code purge, and decide the video player question.
13. **M19** — one documentation pass for the refresh-token feature and the HANGFIRE/deploy staleness.
14. Next 15 + ESLint 9 migration together, as already planned.

---

## Appendix — measurements

**Backend:** 4 source projects + 1 test project · ~11,000 LOC non-generated C# · 14 controllers · 69 endpoints · 16 services · 19 entities · 18 EF configurations · 4 Hangfire jobs. Largest: `SubmissionService.cs` (648), `ProfileService.cs` (482), `AuthService.cs` (385).

**Frontend:** 16,820 LOC · 148 `.ts`/`.tsx` files · 24 pages (21 app, 3 auth) · 3 route handlers · 70 files marked `"use client"` · 0 `any` · 3 eslint-disables · 18 runtime deps. Largest: `SubmissionCard.tsx` (577), `instructor/submissions/[submissionId]/page.tsx` (570), `admin/participants/page.tsx` (468), `admin/reports/page.tsx` (455), `weeks/[weekNumber]/page.tsx` (404).

**Tests:** 5 files, 48 cases — API 27 (`AuthServiceTests` 18, `InstructorServiceQueueTests` 9), web 21 (`jwt` 9, `safe-return-url` 8, `api-client` 4). No integration/E2E. No coverage measurement.

**Dependency posture:** `next@14.2.35` is patched against the notable 14.2-line CVEs (CVE-2025-29927 middleware auth bypass, fixed 14.2.25; middleware SSRF, fixed 14.2.32). `System.IdentityModel.Tokens.Jwt` 8.4.0, `BCrypt.Net-Next` 4.0.3, `Azure.Storage.Blobs` 12.23.0, `Hangfire` 1.8.17, EF Core 10.0.0 — no known-vulnerable pins found.

**Route protection:** all `(app)` routes are covered by the middleware matcher; `/admin/*` and `/instructor/*` carry additional role gates. No unprotected authenticated routes found.
