begin;

alter table public.appraisal_submissions
  add column if not exists form_data jsonb not null default '{}'::jsonb,
  add column if not exists pdr_date date,
  add column if not exists kpi_period_start date,
  add column if not exists kpi_period_end date;

comment on column public.appraisal_submissions.form_data is
  'Complete SPSB year-end PDR Sections A-E, KPI/KRA, training and sign-off responses.';

commit;
