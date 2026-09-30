-- Operator must first SET pms.admin_email to the verified initial admin email.
-- Entire migration rolls back if that account is missing. Existing records are
-- assigned to the one company workspace in this same transaction.
begin;
do $$ begin
  if nullif(current_setting('pms.admin_email', true),'') is null then
    raise exception 'Set pms.admin_email to the verified company administrator before applying';
  end if;
  if not exists(select 1 from auth.users where lower(email)=lower(current_setting('pms.admin_email',true)) and email_confirmed_at is not null) then
    raise exception 'The company administrator must have a verified authentication account';
  end if;
end $$;
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer','manager')),
  departments text[] not null default array[]::text[],
  primary key (team_id,user_id),
  unique(user_id),
  check(role <> 'manager' or coalesce(array_length(departments,1),0)>0)
);
create function public.team_role(workspace uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.team_members where team_id = workspace and user_id = auth.uid()
$$;
revoke all on function public.team_role(uuid) from public;
grant execute on function public.team_role(uuid) to authenticated;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
create policy team_read on public.teams for select to authenticated using (public.team_role(id) is not null);
create policy member_read on public.team_members for select to authenticated using (user_id=auth.uid() or public.team_role(team_id)='owner');
alter table public.staff add column team_id uuid references public.teams(id);
alter table public.appraisal_cycles add column team_id uuid references public.teams(id);
alter table public.appraisal_submissions add column team_id uuid references public.teams(id);
alter table public.audit_log add column team_id uuid references public.teams(id);
do $$ declare company uuid; administrator uuid; begin
  select id into strict administrator from auth.users where lower(email)=lower(current_setting('pms.admin_email',true)) and email_confirmed_at is not null;
  insert into public.teams(name) values('Company workspace') returning id into company;
  insert into public.team_members(team_id,user_id,role) values(company,administrator,'owner');
  update public.staff set team_id=company;
  update public.appraisal_cycles set team_id=company;
  update public.appraisal_submissions set team_id=company;
  update public.audit_log set team_id=company;
end $$;
alter table public.staff alter column team_id set not null;
alter table public.appraisal_cycles alter column team_id set not null;
alter table public.appraisal_submissions alter column team_id set not null;
alter table public.audit_log alter column team_id set not null;
drop index public.staff_employee_id_key;
drop index public.appraisal_cycles_name_key;
create unique index staff_team_employee_key on public.staff(team_id,employee_id);
create unique index cycles_team_name_key on public.appraisal_cycles(team_id,name);
alter table public.staff add constraint staff_team_id_key unique(team_id,id);
alter table public.appraisal_cycles add constraint cycles_team_id_key unique(team_id,id);
alter table public.appraisal_submissions add constraint submission_staff_team_fk foreign key(team_id,staff_id) references public.staff(team_id,id) on delete cascade;
alter table public.appraisal_submissions add constraint submission_cycle_team_fk foreign key(team_id,cycle_id) references public.appraisal_cycles(team_id,id) on delete cascade;
create index submissions_team_idx on public.appraisal_submissions(team_id);
create index audit_team_idx on public.audit_log(team_id);
do $$ declare t text; p record; begin
  foreach t in array array['staff','appraisal_cycles','appraisal_submissions','audit_log'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('create policy team_select on public.%I for select to authenticated using (public.team_role(team_id) in (''owner'',''editor'',''viewer''))',t);
    if t <> 'audit_log' then
      execute format('create policy team_insert on public.%I for insert to authenticated with check (public.team_role(team_id) in (''owner'',''editor''))',t);
      execute format('create policy team_update on public.%I for update to authenticated using (public.team_role(team_id) in (''owner'',''editor'')) with check (public.team_role(team_id) in (''owner'',''editor''))',t);
      execute format('create policy team_delete on public.%I for delete to authenticated using (public.team_role(team_id) in (''owner'',''editor''))',t);
    end if;
  end loop;
end $$;
create policy team_audit_insert on public.audit_log for insert to authenticated with check(public.team_role(team_id) is not null and actor_id=auth.uid());
create function public.can_read_department(workspace uuid, department_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.team_members where team_id=workspace and user_id=auth.uid()
    and role='manager' and department_name=any(departments))
$$;
revoke all on function public.can_read_department(uuid,text) from public;
grant execute on function public.can_read_department(uuid,text) to authenticated;
create policy manager_staff_read on public.staff for select to authenticated using(public.can_read_department(team_id,department));
create policy manager_cycle_read on public.appraisal_cycles for select to authenticated using(public.team_role(team_id)='manager');
create policy manager_submission_read on public.appraisal_submissions for select to authenticated using(
  public.team_role(team_id)='manager' and exists(select 1 from public.staff s where s.id=staff_id and s.team_id=appraisal_submissions.team_id)
);
create function public.set_company_member(workspace uuid, member_email text, member_role text, allowed_departments text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare member_id uuid;
begin
  if public.team_role(workspace) is distinct from 'owner' then raise exception 'Administrator access required'; end if;
  if member_role not in ('editor','viewer','manager') then raise exception 'Invalid role'; end if;
  if member_role='manager' and coalesce(array_length(allowed_departments,1),0)=0 then raise exception 'Choose at least one department'; end if;
  if member_role='manager' and exists(select 1 from unnest(allowed_departments) d where d is null or trim(d)='' or not exists(select 1 from public.staff s where s.team_id=workspace and s.department=d)) then raise exception 'Choose existing department names exactly as recorded'; end if;
  select id into member_id from auth.users where lower(email)=lower(trim(member_email)) and email_confirmed_at is not null;
  if member_id is null then raise exception 'Ask this colleague to register and verify their email first'; end if;
  if exists(select 1 from public.team_members where team_id=workspace and user_id=member_id and role='owner') then raise exception 'Administrator membership cannot be changed here'; end if;
  insert into public.team_members(team_id,user_id,role,departments) values(workspace,member_id,member_role,case when member_role='manager' then allowed_departments else array[]::text[] end)
  on conflict(team_id,user_id) do update set role=excluded.role,departments=excluded.departments;
  insert into public.audit_log(team_id,actor_id,action,target_type,target_id,details) values(workspace,auth.uid(),'access_updated','team_member',member_id,jsonb_build_object('role',member_role,'departments',allowed_departments));
end $$;
create function public.remove_company_member(workspace uuid, member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(workspace) is distinct from 'owner' then raise exception 'Administrator access required'; end if;
  delete from public.team_members where team_id=workspace and user_id=member_id and role <> 'owner';
  if found then insert into public.audit_log(team_id,actor_id,action,target_type,target_id) values(workspace,auth.uid(),'access_removed','team_member',member_id); end if;
end $$;
revoke all on function public.set_company_member(uuid,text,text,text[]), public.remove_company_member(uuid,uuid) from public;
grant execute on function public.set_company_member(uuid,text,text,text[]), public.remove_company_member(uuid,uuid) to authenticated;
commit;

