create table if not exists appraisal_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  due_date date not null,
  status text not null default 'active',
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  full_name text not null,
  department text,
  position text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists appraisal_submissions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references appraisal_cycles(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  status text not null default 'not_submitted',
  submission_date date,
  rating text,
  reviewer_name text,
  comments text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists appraisal_cycles_name_key on appraisal_cycles (name);
create unique index if not exists staff_employee_id_key on staff (employee_id);
create unique index if not exists appraisal_submissions_cycle_staff_key on appraisal_submissions (cycle_id, staff_id);

alter table appraisal_cycles enable row level security;
alter table staff enable row level security;
alter table appraisal_submissions enable row level security;

drop policy if exists "appraisal_cycles_v1_read" on appraisal_cycles;
create policy "appraisal_cycles_v1_read" on appraisal_cycles for select using (true);
drop policy if exists "appraisal_cycles_v1_write" on appraisal_cycles;
create policy "appraisal_cycles_v1_write" on appraisal_cycles for all using (true) with check (true);

drop policy if exists "staff_v1_read" on staff;
create policy "staff_v1_read" on staff for select using (true);
drop policy if exists "staff_v1_write" on staff;
create policy "staff_v1_write" on staff for all using (true) with check (true);

drop policy if exists "appraisal_submissions_v1_read" on appraisal_submissions;
create policy "appraisal_submissions_v1_read" on appraisal_submissions for select using (true);
drop policy if exists "appraisal_submissions_v1_write" on appraisal_submissions;
create policy "appraisal_submissions_v1_write" on appraisal_submissions for all using (true) with check (true);

insert into appraisal_cycles (name, start_date, due_date, status) values
  ('2024 Year-End Appraisal', '2024-11-01', '2024-12-20', 'active')
on conflict (name) do nothing;

insert into staff (employee_id, full_name, department, position) values
  ('EMP001', 'Sarah Chen', 'Finance', 'Senior Analyst'),
  ('EMP002', 'James Okoro', 'Engineering', 'Software Engineer'),
  ('EMP003', 'Maria Santos', 'Human Resources', 'HR Officer'),
  ('EMP004', 'David Kim', 'Sales', 'Sales Manager'),
  ('EMP005', 'Priya Patel', 'Engineering', 'Tech Lead'),
  ('EMP006', 'Tom Wright', 'Operations', 'Operations Coordinator')
on conflict (employee_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'submitted', '2024-12-15'::date, 'Exceeds Expectations', 'Jane Director', 'Strong performance on Q4 deliverables.'
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP001'
on conflict (cycle_id, staff_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'submitted', '2024-12-18'::date, 'Meets Expectations', 'Jane Director', 'Consistent performer.'
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP002'
on conflict (cycle_id, staff_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'not_submitted', null, null, null, null
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP003'
on conflict (cycle_id, staff_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'late', '2024-12-28'::date, 'Below Expectations', 'Jane Director', 'Submitted after deadline.'
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP004'
on conflict (cycle_id, staff_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'submitted', '2024-12-10'::date, 'Outstanding', 'Jane Director', 'Exceptional leadership.'
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP005'
on conflict (cycle_id, staff_id) do nothing;

insert into appraisal_submissions (cycle_id, staff_id, status, submission_date, rating, reviewer_name, comments)
select c.id, s.id, 'overdue', null, null, null, null
from appraisal_cycles c, staff s
where c.name = '2024 Year-End Appraisal' and s.employee_id = 'EMP006'
on conflict (cycle_id, staff_id) do nothing;