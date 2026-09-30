# pms-report — Tasks

## Sprint 1 — DB + Submission Engine + Dashboard
**Goal:** Core engine works end-to-end, no login.
- Create tables + seed 6 staff with mixed statuses + data-access layer (`lib/data/`).
- Dashboard: list submissions for active cycle, status badges, progress bar (X/Y).
- Edit submission: date + rating + reviewer + comments → persists → status derives.
- Sidebar nav shell (desktop sidebar / mobile hamburger).
- Loading / empty / error states.
**Done:** See 6 seeded staff → edit one → enter date+rating → save → status + progress update.

## Sprint 2 — Staff + Cycles + Report Export ← v1 FUNCTIONAL
- Staff directory: list, add, edit, remove staff.
- Cycle page: create with start + due date; set active.
- Reports: completion summary (rate, on-time, overdue by dept) + Export to Excel (.xlsx).
- All five UI states; seed data editable/deletable.
**Done:** Add staff → create submission → mark submitted → export Excel — no login.

## Sprint 3 — Intelligence + Audit
- Auto-flip status to overdue when due_date passes.
- Completion scoring + department ranking.
- Draft executive summary (rule-based).
- Draft reminder for overdue staff.
- Audit log table + write logging.
**Done:** Overdue auto-flips; Draft Summary produces text; audit log captures writes.

## Sprint 4 — Lock Down
- Supabase Auth (login/signup).
- Owner-scoped RLS (`auth.uid() = user_id`).
- Gate writes behind login; assign user_id on records.
- Security review of RLS policies.
**Done:** Anonymous cannot write; HR can; policies tested.

## Text Gantt
```
S1 ██ DB + Submission engine + Dashboard
S2 ██ Staff + Cycles + Export  ← v1 functional
S3 ██ Auto-status + Scoring + Drafts + Audit
S4 ██ Auth + RLS lock-down
```