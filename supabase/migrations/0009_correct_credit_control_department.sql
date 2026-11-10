-- Keep the SPSB staff master data aligned with HR's corrected department name.
begin;

update public.staff
set department = 'Credit Control'
where lower(email) = 'sharmila@selangorproperties.com.my'
  and department is distinct from 'Credit Control';

update public.staff
set department = 'CEO Office'
where department = 'CEO';

update public.staff
set department = 'Human Resource & Administration'
where department = 'HR';

update public.staff
set department = 'Information Technology'
where department = 'IT';

commit;
