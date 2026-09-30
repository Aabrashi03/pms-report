# pms-report — Architecture

## Stack
Next.js 15 (App Router) + Supabase (Postgres) + Vercel. Tailwind for UI. `xlsx` for Excel export.

## Build Now vs Later
**Now:** submission tracking dashboard, staff directory, cycle setup, Excel export, rule-based status derivation.
**Later:** login + access control, AI-drafted executive summary, reminder drafts, historical comparison.

## Key User Action Flow (Update a Submission)
1. HR opens dashboard → staff list with status badges for active cycle.
2. Clicks a staff row → edit form (date, rating, reviewer, comments).
3. Enters date + rating → saves → Supabase persists to `appraisal_submissions`.
4. App recalculates status (date ≤ due → "submitted"; date > due → "late").
5. Dashboard progress bar and counts update.

## Responsive Nav Shell
Persistent left sidebar on desktop (Dashboard, Staff, Cycles, Reports); collapses to hamburger on mobile. Current section highlighted. Keyboard-accessible.

## Layer Plan
1. **Data first** — Supabase tables + data-access layer (`lib/data/`).
2. **App logic** — server actions for CRUD + status derivation.
3. **Smart features** — completion scoring, draft summary (later).

Core runs without AI: all CRUD, status derivation, and Excel export are pure rule-based logic.

## Repo Structure
```
app/           # routes (page.tsx per section)
components/    # sidebar, status-badge, submission-form, progress-bar
lib/data/      # all DB reads/writes
lib/ai/        # draft summary (later)
tests/         # beside code
```

## Module Map
| Module | Owns | Order |
|--------|------|-------|
| submissions | appraisal_submissions CRUD + status derivation | 1st |
| staff | staff directory CRUD | 2nd |
| cycles | appraisal_cycles CRUD | 2nd |
| reporting | summary stats + Excel export | 3rd |
| auth | login + RLS (later) | 4th |