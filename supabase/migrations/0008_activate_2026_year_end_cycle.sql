-- Activate the SPSB 2026 year-end cycle and assign every current staff member.
begin;
do $$
declare workspace uuid; active_cycle uuid;
begin
  select id into workspace from public.teams where name='Company workspace' order by created_at limit 1;
  if workspace is null then raise exception 'Company workspace not found'; end if;
  select id into active_cycle
  from public.appraisal_cycles
  where team_id=workspace and status='active'
  order by created_at desc
  limit 1;

  if active_cycle is null then
    select id into active_cycle
    from public.appraisal_cycles
    where team_id=workspace
      and name='2026 Year-End Performance & Development Review'
    order by created_at desc
    limit 1;
  end if;

  if active_cycle is null then
    insert into public.appraisal_cycles(team_id,name,start_date,due_date,status)
    values(workspace,'2026 Year-End Performance & Development Review','2026-11-10','2026-12-20','active')
    returning id into active_cycle;
  else
    update public.appraisal_cycles
    set name='2026 Year-End Performance & Development Review',
        start_date='2026-11-10',
        due_date='2026-12-20',
        status='active'
    where id=active_cycle;
  end if;

  update public.appraisal_cycles
  set status='closed'
  where team_id=workspace and status='active' and id<>active_cycle;

  insert into public.appraisal_submissions(team_id,cycle_id,staff_id,status,workflow_stage)
  select workspace,active_cycle,s.id,'not_submitted','employee_draft'
  from public.staff s
  where s.team_id=workspace
    and not exists (
      select 1
      from public.appraisal_submissions a
      where a.cycle_id=active_cycle and a.staff_id=s.id
    );
end $$;
commit;
