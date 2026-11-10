-- Track whether each HR staff record has a usable Supabase login account.
begin;

alter table public.staff
  add column if not exists account_invited_at timestamptz,
  add column if not exists account_activated_at timestamptz;

update public.staff s
set account_invited_at = coalesce(s.account_invited_at,u.created_at),
    account_activated_at = coalesce(s.account_activated_at,u.email_confirmed_at)
from auth.users u
where lower(s.email)=lower(u.email)
  and (s.account_invited_at is null or s.account_activated_at is null);

create or replace function public.mark_spsb_account_active() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(coalesce(new.email,'')) ~ '^[^@]+@selangorproperties\.com\.my$' then
    update public.staff
    set account_invited_at=coalesce(account_invited_at,new.created_at,now()),
        account_activated_at=case
          when new.email_confirmed_at is not null then coalesce(account_activated_at,new.email_confirmed_at,now())
          else account_activated_at
        end
    where lower(email)=lower(new.email);
  end if;
  return new;
end $$;
revoke all on function public.mark_spsb_account_active() from public;

drop trigger if exists mark_spsb_account_active_after_auth on auth.users;
create trigger mark_spsb_account_active_after_auth
after insert or update of email,email_confirmed_at on auth.users
for each row execute function public.mark_spsb_account_active();

commit;
