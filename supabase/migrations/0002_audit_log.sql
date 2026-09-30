create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on audit_log (created_at desc);
alter table audit_log enable row level security;
drop policy if exists "audit_log_v1_read" on audit_log;
create policy "audit_log_v1_read" on audit_log for select using (true);
drop policy if exists "audit_log_v1_write" on audit_log;
create policy "audit_log_v1_write" on audit_log for insert with check (true);
