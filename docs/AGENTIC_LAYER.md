# pms-report — Agentic Layer

## Draftable Actions (AI drafts, human reviews)
- **Draft executive summary** for senior management — risk: low (auto-draft, HR edits before sending).
- **Draft reminder** to staff who haven't submitted — risk: medium (draft text, HR approves before send).

## Executable After Approval
- **Send reminder email** to non-submitter — risk: high (HR approves each send).
- **Close appraisal cycle** — risk: high (locks all submissions, HR confirms).

## Human-Only Actions
- **Delete a submission** — risk: critical.
- **Delete a staff record** — risk: critical.
- **Modify a rating after cycle closure** — risk: critical.

## Named Tools (v1 = none active; later)
| Tool | Risk | Trigger |
|------|------|---------|
| `draft_executive_summary` | low | HR clicks "Draft Summary" |
| `draft_reminder` | medium | HR selects overdue staff |
| `send_reminder_email` | high | HR approves drafted reminder |
| `close_cycle` | high | HR confirms on cycle page |

No raw `run_any` / `send_any` — only these named tools.

## Audit Log Fields
`action`, `actor_id`, `target_type`, `target_id`, `details (jsonb)`, `created_at`.

## v1 vs Later
**v1:** No automated actions. All status changes and exports are manual. Audit logging of submission updates is active.
**Later:** Draft summary + draft reminders + send reminders with approval flow.