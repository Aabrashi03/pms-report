# pms-report — Intelligence Layer

## Messy Inputs
- Free-text comments → categorize by topic (later).
- Inconsistent rating text → normalize to 5-point scale: Outstanding / Exceeds / Meets / Below / Unsatisfactory.
- Manual status entry → system overrides with derived status from dates.

## Auto-Structure (v1)
Status derivation is rule-based:
```json
{
  "staff_id": "uuid",
  "cycle_due_date": "2024-12-20",
  "submission_date": "2024-12-15",
  "derived_status": "submitted",
  "on_time": true
}
```

## Events to Track
- `submission_created` — new record added
- `submission_updated` — date/rating changed
- `status_changed` — derived status flipped
- `cycle_due_passed` — due date reached, unsubmitted → overdue

## Scoring Rules (v1, rule-based)
- **Completion rate** = (submitted + late) / total staff
- **On-time rate** = submitted / (submitted + late)
- **Overdue count** = overdue + not_submitted after due date
- **Department completion** = completion rate grouped by department

## What Gets Ranked
- Departments by completion rate (lowest first → needs chasing).
- Staff by submission date (latest first → who still needs to submit).

## v1 vs Later
**v1:** Rule-based status derivation + completion stats. No AI.
**Later:** AI-drafted executive summary, anomaly detection, smart reminder prioritization.