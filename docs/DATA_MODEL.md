# pms-report — Data Model

## appraisal_cycles
| Field | Type |
|------|------|
| id | uuid PK |
| name | text |
| start_date | date |
| due_date | date |
| status | text (active/closed) |
| user_id | uuid nullable |
| created_at | timestamptz |

## staff
| Field | Type |
|------|------|
| id | uuid PK |
| employee_id | text unique |
| full_name | text |
| department | text |
| position | text |
| user_id | uuid nullable |
| created_at | timestamptz |

## appraisal_submissions
| Field | Type |
|------|------|
| id | uuid PK |
| cycle_id | uuid → appraisal_cycles |
| staff_id | uuid → staff |
| status | text (not_submitted/submitted/late/overdue) |
| submission_date | date nullable |
| rating | text nullable |
| reviewer_name | text nullable |
| comments | text nullable |
| user_id | uuid nullable |
| created_at | timestamptz |

Unique: (cycle_id, staff_id) — one submission per staff per cycle.

## Relationships
- One cycle → many submissions. One staff → many submissions (across cycles).

## Status Derivation Rule
- No date, today ≤ due → `not_submitted`
- No date, today > due → `overdue`
- Date ≤ due → `submitted`
- Date > due → `late`

## RLS Notes
v1: permissive read/write for demo. Lock-down: `auth.uid() = user_id`; HR role reads all, edits submissions.

## AI Fields
None in v1. Later AI-drafted summary will store value + source + confidence + review_status.