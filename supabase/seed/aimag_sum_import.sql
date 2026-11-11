-- CashmereTrace MN - psql wrapper for the official aimag/sum CSV import.
--
-- Usage, from the repository root:
--   psql "$DATABASE_URL" -v csv_path='supabase/seed/aimag_sum_import.csv' \
--     -f supabase/seed/aimag_sum_import.sql
--
-- The CSV must contain the header:
--   aimag_code,aimag_name,sum_code,sum_name
--
-- Do not use this script with an unverified or third-party list. The source
-- and retrieval date must be recorded in aimag_sum_source.md first.

\set ON_ERROR_STOP on

begin;

create temp table aimag_sum_import_staging (
  aimag_code text not null,
  aimag_name text not null,
  sum_code text not null,
  sum_name text not null
) on commit drop;

\copy aimag_sum_import_staging (aimag_code, aimag_name, sum_code, sum_name) from :'csv_path' with (format csv, header true)

\ir aimag_sum_merge.sql

commit;
