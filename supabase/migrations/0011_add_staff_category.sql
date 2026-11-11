alter table public.staff
  add column if not exists category text;

update public.staff as staff
set category = source.category
from (
  values
    ('G009', 'Non-Executive'),
    ('G023', 'Manager'),
    ('G121', 'Executive'),
    ('G063', 'Non-Executive'),
    ('A002.', 'Manager'),
    ('G131', 'Manager'),
    ('G030', 'Executive'),
    ('G148', 'Non-Executive'),
    ('G129', 'Manager'),
    ('G101', 'Non-Executive'),
    ('G048', 'Non-Executive'),
    ('G042', 'Executive'),
    ('P027', 'Manager'),
    ('G073', 'Manager'),
    ('G125', 'Manager'),
    ('G020', 'Non-Executive'),
    ('G116', 'Executive'),
    ('G088', 'Executive'),
    ('G144', 'Manager'),
    ('G115', 'Manager'),
    ('G077', 'Manager'),
    ('G112', 'Manager'),
    ('P009', 'Executive'),
    ('G151', 'Manager'),
    ('P001', 'Manager'),
    ('G153', 'Manager'),
    ('G154', 'Manager'),
    ('G106-1', 'Manager'),
    ('G067', 'Manager'),
    ('G152', 'Manager'),
    ('M001', 'Manager')
) as source(employee_id, category)
where staff.employee_id = source.employee_id;

alter table public.staff
  drop constraint if exists staff_category_check;

alter table public.staff
  add constraint staff_category_check
  check (category is null or category in ('Manager', 'Executive', 'Non-Executive'));
