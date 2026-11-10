-- Keep the SPSB staff master data aligned with HR's corrected department name.
begin;

update public.staff
set department = 'Credit Control'
where lower(email) = 'sharmila@selangorproperties.com.my'
  and department is distinct from 'Credit Control';

commit;
