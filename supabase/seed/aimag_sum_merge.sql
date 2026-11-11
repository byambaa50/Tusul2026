-- CashmereTrace MN - validate and merge staged aimag/sum rows.
--
-- Preconditions:
--   A table named aimag_sum_import_staging is visible in search_path with
--   exactly these text columns:
--     aimag_code, aimag_name, sum_code, sum_name
--
-- The psql wrapper aimag_sum_import.sql creates and loads that table, calls
-- this file, and commits. This file does not start or commit a transaction.
--
-- The merge is idempotent: existing codes are updated only when the official
-- name changed. It never inserts fabricated rows on its own.

do $$
declare
  v_problem text;
begin
  if exists (
    select 1
      from aimag_sum_import_staging
     where btrim(aimag_code) = ''
        or btrim(aimag_name) = ''
        or btrim(sum_code) = ''
        or btrim(sum_name) = ''
  ) then
    raise exception 'aimag/sum import contains a blank code or name';
  end if;

  select string_agg(format('aimag %s has conflicting names', aimag_code), '; ')
    into v_problem
    from (
      select btrim(aimag_code) as aimag_code
        from aimag_sum_import_staging
       group by btrim(aimag_code)
      having count(distinct btrim(aimag_name)) > 1
    ) conflicts;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  select string_agg(format('aimag name %s has conflicting codes', aimag_name), '; ')
    into v_problem
    from (
      select btrim(aimag_name) as aimag_name
        from aimag_sum_import_staging
       group by btrim(aimag_name)
      having count(distinct btrim(aimag_code)) > 1
    ) conflicts;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  select string_agg(
           format('sum %s/%s has conflicting names', aimag_code, sum_code),
           '; '
         )
    into v_problem
    from (
      select btrim(aimag_code) as aimag_code, btrim(sum_code) as sum_code
        from aimag_sum_import_staging
       group by btrim(aimag_code), btrim(sum_code)
      having count(distinct btrim(sum_name)) > 1
    ) conflicts;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  select string_agg(
           format('sum name %s/%s has conflicting codes', aimag_code, sum_name),
           '; '
         )
    into v_problem
    from (
      select btrim(aimag_code) as aimag_code, btrim(sum_name) as sum_name
        from aimag_sum_import_staging
       group by btrim(aimag_code), btrim(sum_name)
      having count(distinct btrim(sum_code)) > 1
    ) conflicts;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  if exists (
    select 1
      from aimag_sum_import_staging
     group by btrim(aimag_code), btrim(aimag_name), btrim(sum_code), btrim(sum_name)
    having count(*) > 1
  ) then
    raise exception 'aimag/sum import contains duplicate rows';
  end if;
end $$;

insert into public.aimags (code, name)
select distinct btrim(aimag_code), btrim(aimag_name)
  from aimag_sum_import_staging
on conflict (code) do update
   set name = excluded.name
 where aimags.name is distinct from excluded.name;

insert into public.sums (aimag_id, code, name)
select a.id, btrim(s.sum_code), btrim(s.sum_name)
  from aimag_sum_import_staging s
  join public.aimags a on a.code = btrim(s.aimag_code)
on conflict (aimag_id, code) do update
   set name = excluded.name
 where sums.name is distinct from excluded.name;
