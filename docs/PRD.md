# pms-report — PRD

## Problem
HR personnel track year-end appraisal submissions across all staff, chase late submissions by hand, and compile a status report for senior management. Today this lives in a sprawling Excel sheet that is manually updated, error-prone, and gives no live completion picture.

## Target User
HR personnel responsible for ensuring every staff member's appraisal is submitted on time and for reporting completion status and ratings to senior management.

## Core Objects
- **Appraisal Cycle** — a named appraisal period with a due date (e.g., "2024 Year-End Appraisal").
- **Staff** — an employee being appraised (name, department, position, employee ID).
- **Appraisal Submission** — one record per staff per cycle: status, submission date, rating, reviewer, comments.

## MVP (v1) — Must-Haves
- [ ] Dashboard of all staff submissions for the active cycle, color-coded by status.
- [ ] Create / edit a submission: set submission date, rating, reviewer, comments.
- [ ] Status auto-derives from submission date vs cycle due date.
- [ ] Staff directory: add, edit, remove staff.
- [ ] Cycle setup: create a cycle with start and due date.
- [ ] Completion summary: X of Y submitted, on-time rate, overdue count.
- [ ] Export the cycle report to Excel (.xlsx) for senior management.

## Non-Goals (v1)
- Login / authentication (demo-first; locked down later).
- 360-degree feedback or multi-reviewer workflows.
- Goal-setting or OKR tracking.
- Email automation or calendar integration.
- Multi-cycle historical comparison.

## Success Criteria
HR opens the app, sees 6 seeded staff with mixed statuses, clicks an overdue staff member, enters their submission date and rating, the status flips to "late" (date is after the cycle due date), the dashboard completion count updates from 3/6 to 4/6, and HR exports the full report to Excel — replacing the manual spreadsheet end-to-end.