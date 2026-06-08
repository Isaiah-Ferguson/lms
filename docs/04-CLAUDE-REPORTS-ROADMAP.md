# Roadmap 1 — Claude AI Weekly Progress Reports

**Status**: Phases 1–3 implemented (Phase 4 — attendance — pending Roadmap 2)
**Goal**: Automatically generate a comprehensive weekly progress report covering **all students** (~50 max), combining grades, academic status (probation), and — eventually — attendance.

---

## Summary

A scheduled background job runs once per week, gathers each active student's data from SQL Server, sends a structured summary to the Claude API, and stores the generated narrative report. Instructors/admins review reports before they are shared.

Because the system already runs **Hangfire**, this is a natural fit: a recurring job, not a blocking HTTP request.

---

## Why the backend (not the frontend)

- **API key security** — the Anthropic API key must never reach the browser. It stays in server-side config/secrets.
- **Data access** — grades, probation status, and enrollments already live behind the API services and EF Core.
- **Latency** — LLM calls are slow; running them in a background job means no user is left waiting.

---

## Architecture

```
Hangfire recurring trigger (e.g. Monday 06:00)
        │
        ▼
WeeklyProgressReportJob (Infrastructure)
  1. Query all active students + grades + probation status (+ attendance later)
  2. Compute deterministic flags/trends in C# (NOT in Claude)
  3. For each student → build a structured prompt
  4. Call Claude API (per student, ~50 calls)
  5. Persist one ProgressReport row per student (+ a run summary)
        │
        ▼
Admin/Instructor reviews → optionally publish / email
```

---

## Key design rules

- **Compute facts in C#, narrate in Claude.** Probation eligibility, averages, on-time/late counts, and trends are deterministic business rules. Calculate them in code and pass the results to Claude. Claude only writes the prose explanation and recommendations — it never *decides* who is on probation.
- **Send structured data, not raw dumps.** Pass clean, labeled fields. Better and cheaper output.
- **Use a system prompt** to fix the report's audience, tone, and section format once.
- **Handle partial failure.** If one student's call fails, log it, mark that report `Failed`, and continue the run. Never abort the whole batch.
- **Review gate.** Probation is sensitive — let an admin/instructor review before any report reaches a student.

---

## Cost & scale (~50 students)

- One Claude call per student per week ≈ 50 calls/week. With `claude-haiku` this is pennies/week; `claude-sonnet` is still modest.
- Anthropic enforces requests/tokens-per-minute limits. With Hangfire, process students in small chunks (or with a short delay) to stay under limits — trivial at this volume.

---

## Phased plan

### Phase 1 — Pipeline proof-of-concept
- [ ] Create Anthropic account + API key (`console.anthropic.com`).
- [ ] Store key in .NET user-secrets (local) and Azure App Service app settings (prod) as `Anthropic:ApiKey`. Never commit it.
- [x] Add Claude client as an **Infrastructure adapter** (`ClaudeClient` via raw `HttpClient`).
- [x] Define `IProgressReportService` in the **Application** layer; implement in Infrastructure.
- [x] Add a `ProgressReport` entity + EF Core migration (studentId, weekOf, status, content, model, generatedAt).
- [x] Build prompt from **grades + probation status** for a *single* student; verify output quality manually.

### Phase 2 — Batch + schedule
- [x] Add `WeeklyProgressReportJob` (matches existing Hangfire job pattern in Infrastructure).
- [x] Loop over all active students with chunking + retry + per-student failure handling.
- [x] Register the recurring job (`RecurringJob.AddOrUpdate(..., Cron.Weekly())`).
- [ ] Add a run-summary record so admins can see "X generated, Y failed".

### Phase 3 — Surface in the UI
- [x] Admin/instructor endpoint to list + read reports (`/api/reports/...`).
- [x] Frontend page to view reports (render Claude's markdown; optionally pair with existing `recharts` charts).
- [x] Draft → Published status with a review/approve action.
- [ ] (Optional) email/notification delivery.

### Phase 4 — Add attendance (depends on Roadmap 2)
- [ ] Once the attendance tracker exists, add attendance metrics as **one more input field** in the per-student prompt.
- [ ] No change to report structure — only the data source expands.

---

## Data inputs per student

| Input | Source (existing) | Notes |
|-------|-------------------|-------|
| Identity / level | `UserCourseEnrollment` → `Course` (level) | Anonymize name if policy requires |
| Grades | grading/submission services | Compute averages + trend in C# |
| Probation status | `User.IsOnProbation`, `ProbationReason` | Already deterministic |
| Attendance | *Roadmap 2 (future)* | Added in Phase 4 |

---

## Privacy notes

- Student names + grades leaving your servers to Anthropic: confirm this is acceptable under your institution's policy. If not, send an opaque student ID + "Student" placeholder and re-map names locally after generation.
- Send only the fields the report needs — nothing more.

---

## Dependencies / open questions

- Confirm the exact probation rule (e.g. GPA threshold) so it can be computed deterministically.
- Choose model (`haiku` vs `sonnet`) after reviewing Phase 1 output quality.
- Decide delivery: in-app only first, email later.
