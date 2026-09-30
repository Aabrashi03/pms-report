# pms-report — Test Plan

## v1 Success Scenario
1. Open app (no login) → dashboard loads with 6 seeded staff, mixed statuses.
2. Progress bar shows "3 of 6 submitted."
3. Click "Tom Wright" (overdue) → edit form opens.
4. Enter date "2024-12-18" → rating "Meets Expectations" → reviewer "Jane Director" → Save.
5. Dashboard shows Tom as "submitted" → progress bar updates to "4 of 6."
6. Go to Reports → summary shows 4/6, on-time rate, overdue count.
7. Click "Export to Excel" → .xlsx downloads with all staff, statuses, dates, ratings.

## Empty State
- Delete all staff → dashboard: "No staff yet. Add staff to begin." + "Add Staff" button.

## Error State
- Invalid date format → form: "Please enter a valid date."
- Network error on save → toast: "Could not save. Please retry."

## Loading State
- Dashboard shows skeleton rows + spinner while fetching.

## Edge Cases
- Submission date after due date → status "late" (amber badge).
- No active cycle → dashboard: "Create an appraisal cycle to begin."
- Duplicate employee_id → blocked: "Employee ID already exists."