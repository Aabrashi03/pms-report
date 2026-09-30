-- Align untouched demo seed data with the PRD's required 3/6 -> 4/6 success scenario.
-- The predicates deliberately avoid overwriting a record that a user has edited.
update appraisal_submissions submission
set status = 'overdue',
    submission_date = null,
    rating = null,
    reviewer_name = null,
    comments = null
from appraisal_cycles cycle, staff employee
where submission.cycle_id = cycle.id
  and submission.staff_id = employee.id
  and cycle.name = '2024 Year-End Appraisal'
  and employee.employee_id = 'EMP004'
  and submission.submission_date = '2024-12-28'::date
  and submission.reviewer_name = 'Jane Director'
  and submission.comments = 'Submitted after deadline.';
