# pms-report — Security

## Secret Handling
- Supabase URL + anon key: public (safe for client).
- Service role key: server-only, never in frontend. Stored in Vercel env vars.
- No other secrets in v1.

## Permission Model
**v1 (demo-first):** All tables have permissive RLS — anonymous read/write. No login wall. Seed data is viewable immediately. Intentional for demo and early building.

**Lock-down sprint (later):**
- Replace permissive policies with owner-scoped: `auth.uid() = user_id`.
- HR role: read all staff/submissions, edit submissions and staff.
- Senior management: read-only access to reports.

## Approved-Tools Rule
Only named tools (`draft_executive_summary`, `draft_reminder`, `send_reminder_email`, `close_cycle`) may act. No raw SQL execution or arbitrary API calls. Agent inherits the logged-in user's permissions.

## Audit Principle
Every meaningful write (create/update/delete submission, staff, cycle) is logged with actor, action, target, timestamp. Status changes are auditable. Export actions are logged.

## Honesty Note
If RLS policy design or role-based access is beyond current ability, stop and get a human security reviewer before the lock-down sprint. Do not ship permissive policies to production with real staff data.