begin;

-- Reclassify the former HR-review stage because reaching HR now completes the PDR.
update public.appraisal_submissions
set workflow_stage = 'completed',
    hr_reviewed_at = coalesce(hr_reviewed_at, updated_at, now()),
    updated_at = now()
where workflow_stage = 'hr_review';

commit;
