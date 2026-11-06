-- SPSB employee master data and direct reporting-line access.
-- Apply after 0004_team_workspaces.sql.
begin;

-- The original workspace migration supported only administrators and reviewers.
-- Add ordinary employees and HODs so every Microsoft-authenticated SPSB user can
-- be attached to the same private workspace without receiving HR privileges.
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members drop constraint if exists team_members_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('owner','editor','viewer','manager','hod','employee'));

alter table public.staff
  add column if not exists email text,
  add column if not exists manager_email text,
  add column if not exists hod_name text,
  add column if not exists hod_email text,
  add column if not exists head_of_division text,
  add column if not exists head_of_division_email text,
  add column if not exists is_manager boolean not null default false,
  add column if not exists is_confirmation_staff boolean not null default false;

create unique index if not exists staff_team_email_key
  on public.staff(team_id, lower(email)) where email is not null;
create index if not exists staff_manager_email_idx on public.staff(team_id, lower(manager_email));
create index if not exists staff_hod_email_idx on public.staff(team_id, lower(hod_email));
create index if not exists staff_division_email_idx on public.staff(team_id, lower(head_of_division_email));

alter table public.appraisal_submissions
  add column if not exists workflow_stage text not null default 'employee_draft'
    check (workflow_stage in ('employee_draft','manager_review','hod_endorsement','hr_review','completed','returned')),
  add column if not exists employee_submitted_at timestamptz,
  add column if not exists manager_rating text,
  add column if not exists manager_comments text,
  add column if not exists manager_submitted_at timestamptz,
  add column if not exists hod_comments text,
  add column if not exists hod_endorsed_at timestamptz,
  add column if not exists hr_comments text,
  add column if not exists hr_reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.current_company_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(coalesce(auth.jwt()->>'email',''))
$$;
revoke all on function public.current_company_email() from public;
grant execute on function public.current_company_email() to authenticated;

create or replace function public.is_spsb_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_company_email() ~ '^[^@]+@selangorproperties\.com\.my$'
$$;
revoke all on function public.is_spsb_account() from public;
grant execute on function public.is_spsb_account() to authenticated;

create or replace function public.can_read_staff_record(workspace uuid, staff_record uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_spsb_account() and exists (
    select 1 from public.staff s
    where s.team_id=workspace and s.id=staff_record and (
      lower(s.email)=public.current_company_email()
      or lower(coalesce(s.manager_email,''))=public.current_company_email()
      or lower(coalesce(s.hod_email,''))=public.current_company_email()
      or lower(coalesce(s.head_of_division_email,''))=public.current_company_email()
      or public.team_role(workspace) in ('owner','editor','viewer')
    )
  )
$$;
revoke all on function public.can_read_staff_record(uuid,uuid) from public;
grant execute on function public.can_read_staff_record(uuid,uuid) to authenticated;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='staff' loop
    execute format('drop policy %I on public.staff',p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname='public' and tablename='appraisal_submissions' loop
    execute format('drop policy %I on public.appraisal_submissions',p.policyname);
  end loop;
end $$;

create policy spsb_staff_read on public.staff for select to authenticated
  using(public.can_read_staff_record(team_id,id));
create policy hr_staff_insert on public.staff for insert to authenticated
  with check(public.is_spsb_account() and public.team_role(team_id) in ('owner','editor'));
create policy hr_staff_update on public.staff for update to authenticated
  using(public.is_spsb_account() and public.team_role(team_id) in ('owner','editor'))
  with check(public.is_spsb_account() and public.team_role(team_id) in ('owner','editor'));
create policy hr_staff_delete on public.staff for delete to authenticated
  using(public.is_spsb_account() and public.team_role(team_id) in ('owner','editor'));

create policy spsb_submission_read on public.appraisal_submissions for select to authenticated
  using(public.can_read_staff_record(team_id,staff_id));
create policy spsb_submission_insert on public.appraisal_submissions for insert to authenticated
  with check(public.is_spsb_account() and public.can_read_staff_record(team_id,staff_id));
create policy spsb_submission_update on public.appraisal_submissions for update to authenticated
  using(public.is_spsb_account() and public.can_read_staff_record(team_id,staff_id))
  with check(public.is_spsb_account() and public.can_read_staff_record(team_id,staff_id));
create policy hr_submission_delete on public.appraisal_submissions for delete to authenticated
  using(public.is_spsb_account() and public.team_role(team_id) in ('owner','editor'));

-- Employees need the active cycle heading/dates even when they cannot see other
-- employees. Reporting-line access to submissions remains enforced separately.
drop policy if exists spsb_cycle_read on public.appraisal_cycles;
create policy spsb_cycle_read on public.appraisal_cycles for select to authenticated
  using(public.is_spsb_account() and public.team_role(team_id) is not null);

-- When an SPSB colleague signs in for the first time, connect the Microsoft
-- identity to the matching HR master-data row. HR roles are never auto-granted.
create or replace function public.sync_spsb_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare matched_team uuid; matched_manager boolean;
begin
  if lower(coalesce(new.email,'')) !~ '^[^@]+@selangorproperties\.com\.my$' then return new; end if;
  select s.team_id, s.is_manager into matched_team, matched_manager
  from public.staff s where lower(s.email)=lower(new.email) limit 1;
  if matched_team is not null then
    insert into public.team_members(team_id,user_id,role,departments)
    values(matched_team,new.id,case when matched_manager then 'manager' else 'employee' end,array[]::text[])
    on conflict(user_id) do update set team_id=excluded.team_id,
      role=case when public.team_members.role in ('owner','editor','viewer','hod') then public.team_members.role else excluded.role end;
  end if;
  return new;
end $$;
revoke all on function public.sync_spsb_membership() from public;
drop trigger if exists sync_spsb_membership_after_auth on auth.users;
create trigger sync_spsb_membership_after_auth after insert or update of email on auth.users
for each row execute function public.sync_spsb_membership();

insert into public.team_members(team_id,user_id,role,departments)
select s.team_id,u.id,case when s.is_manager then 'manager' else 'employee' end,array[]::text[]
from auth.users u join public.staff s on lower(s.email)=lower(u.email)
on conflict(user_id) do nothing;

commit;
