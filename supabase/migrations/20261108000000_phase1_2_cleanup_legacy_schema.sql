-- CashmereTrace MN - Phase 1.2 cleanup of the legacy public schema
-- Project: cgzilsadexddvsiugbkx (tusul2026)
-- Proposed migration timestamp: 20261108000000
--
-- PURPOSE
--   Remove only the 12 incorrect legacy public tables, their 18 foreign keys,
--   and the legacy public.set_updated_at() trigger function, so that the
--   approved migrations can create the CashmereTrace MN schema:
--
--     20261109000000_schema.sql
--     20261109000100_functions.sql
--     20261109000200_rls.sql
--     20261109000300_phase1_1_finalization.sql
--
-- SCOPE / NON-GOALS
--   * Does NOT drop or modify the public schema itself.
--   * Does NOT use DROP SCHEMA.
--   * Does NOT use CASCADE on any DROP.
--   * Does NOT touch auth, storage, vault, realtime, graphql, graphql_public,
--     extensions, supabase_migrations, or any other schema.
--   * Does NOT drop extensions, roles, publications, or Supabase-managed
--     objects.
--   * Does NOT introduce password_hash, a separate public.users auth table,
--     or batch_supply_links. It removes those legacy concepts.
--
-- SAFETY MODEL
--   The migration refuses to run unless the live public schema still has the
--   exact legacy shape that was inspected on 2026-11-10, all 12 legacy tables
--   are empty, and there are no unexpected dependencies. It obtains ACCESS
--   EXCLUSIVE locks on the legacy tables before the final data/dependency
--   checks, so the checks and drops see a stable schema.
--
--   Apply only through the Supabase migration runner (or inside a single
--   explicit transaction if applying manually). Do not paste only part of this
--   file into the SQL editor.
--
-- ROLLBACK
--   Before the four approved migrations run, the logical backups in
--   backups/phase1_2_20261110/ can recreate the empty legacy schema. After the
--   approved migrations run, rollback requires a reviewed reverse migration;
--   do not restore the legacy schema on top of the approved schema.

set lock_timeout = '10s';

-- ---------------------------------------------------------------------------
-- 1. Preflight: the public schema must contain exactly the inspected legacy
--    objects, with the legacy signatures, and nothing else that could be
--    damaged by the drops below.
-- ---------------------------------------------------------------------------

do $preflight_objects$
declare
  v_expected_tables text[] := array[
    'audit_logs',
    'batch_supply_links',
    'districts',
    'provinces',
    'publication_settings',
    'qr_codes',
    'raw_material_batches',
    'suppliers',
    'supply_records',
    'system_settings',
    'test_results',
    'users'
  ];
  v_expected_sequences text[] := array[
    'audit_logs_audit_id_seq',
    'batch_supply_links_link_id_seq',
    'districts_district_id_seq',
    'provinces_province_id_seq',
    'publication_settings_publication_id_seq',
    'qr_codes_qr_id_seq',
    'raw_material_batches_batch_id_seq',
    'suppliers_supplier_id_seq',
    'supply_records_supply_id_seq',
    'system_settings_setting_id_seq',
    'test_results_test_id_seq',
    'users_user_id_seq'
  ];
  v_expected_triggers text[] := array[
    'publication_settings.trg_publication_settings_updated_at',
    'system_settings.trg_system_settings_updated_at'
  ];
  v_actual_tables text[];
  v_actual_sequences text[];
  v_actual_functions text[];
  v_actual_triggers text[];
  v_bad text;
begin
  if to_regnamespace('public') is null then
    raise exception 'Refusing cleanup: schema public does not exist';
  end if;

  -- Exactly the 12 legacy base tables, no more and no fewer.
  select array_agg(c.relname::text order by c.relname collate "C")
    into v_actual_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  if v_actual_tables is distinct from v_expected_tables then
    raise exception
      'Refusing cleanup: public base tables are %, expected exactly %',
      v_actual_tables, v_expected_tables;
  end if;

  -- No partitioned tables, views, materialized views, foreign tables, or
  -- standalone composite types in public.
  select string_agg(c.relname || ' (' || c.relkind::text || ')', ', ' order by c.relname)
    into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('p', 'v', 'm', 'f', 'c');

  if v_bad is not null then
    raise exception 'Refusing cleanup: unexpected public relations: %', v_bad;
  end if;

  -- Exactly the 12 identity-owned legacy sequences.
  select array_agg(c.relname::text order by c.relname collate "C")
    into v_actual_sequences
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'S';

  if v_actual_sequences is distinct from v_expected_sequences then
    raise exception
      'Refusing cleanup: public sequences are %, expected exactly %',
      v_actual_sequences, v_expected_sequences;
  end if;

  select string_agg(s.relname, ', ' order by s.relname)
    into v_bad
  from pg_class s
  join pg_namespace sn on sn.oid = s.relnamespace
  where sn.nspname = 'public'
    and s.relkind = 'S'
    and not exists (
      select 1
      from pg_depend d
      where d.classid = 'pg_class'::regclass
        and d.objid = s.oid
        and d.refclassid = 'pg_class'::regclass
        and d.deptype = 'i'
        and d.refobjid in (
          select c.oid
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r'
        )
    );

  if v_bad is not null then
    raise exception
      'Refusing cleanup: public sequences are not identity-owned by the legacy tables: %',
      v_bad;
  end if;

  -- Exactly one public function: the legacy trigger function.
  select array_agg(p.proname::text order by p.proname collate "C")
    into v_actual_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f';

  if v_actual_functions is distinct from array['set_updated_at'] then
    raise exception
      'Refusing cleanup: public functions are %, expected exactly {set_updated_at}',
      v_actual_functions;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('p', 'a', 'w')
  ) then
    raise exception 'Refusing cleanup: unexpected public procedures/aggregates/window functions';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Refusing cleanup: public.set_updated_at() does not exist';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and p.prorettype = 'pg_catalog.trigger'::regtype
      and p.pronargs = 0
  ) then
    raise exception 'Refusing cleanup: public.set_updated_at() is not the expected zero-argument trigger function';
  end if;

  -- No custom enum, domain, or composite types in public.
  select string_agg(t.typname, ', ' order by t.typname)
    into v_bad
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typtype in ('e', 'd', 'c')
    and not exists (
      select 1 from pg_class c where c.reltype = t.oid
    );

  if v_bad is not null then
    raise exception 'Refusing cleanup: unexpected public custom types: %', v_bad;
  end if;

  -- Exactly the two legacy updated_at triggers.
  select array_agg(c.relname || '.' || t.tgname order by c.relname collate "C", t.tgname collate "C")
    into v_actual_triggers
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal;

  if v_actual_triggers is distinct from v_expected_triggers then
    raise exception
      'Refusing cleanup: public triggers are %, expected exactly %',
      v_actual_triggers, v_expected_triggers;
  end if;

  -- No RLS policies exist on the legacy schema. If any appeared, stop rather
  -- than silently discarding policy definitions.
  if exists (select 1 from pg_policies where schemaname = 'public') then
    raise exception 'Refusing cleanup: unexpected RLS policies exist in public';
  end if;

  -- All legacy tables are owned by postgres and have RLS enabled but not
  -- forced, matching the inspected state.
  select string_agg(c.relname, ', ' order by c.relname)
    into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      pg_get_userbyid(c.relowner) <> 'postgres'
      or not c.relrowsecurity
      or c.relforcerowsecurity
    );

  if v_bad is not null then
    raise exception
      'Refusing cleanup: unexpected ownership/RLS state on: %',
      v_bad;
  end if;

  -- Every table must have its exact inspected column count.
  select string_agg(e.table_name || '=' || a.column_count::text, ', ' order by e.table_name)
    into v_bad
  from (values
    ('audit_logs', 10),
    ('batch_supply_links', 5),
    ('districts', 5),
    ('provinces', 4),
    ('publication_settings', 6),
    ('qr_codes', 6),
    ('raw_material_batches', 9),
    ('suppliers', 10),
    ('supply_records', 7),
    ('system_settings', 5),
    ('test_results', 9),
    ('users', 10)
  ) as e(table_name, expected_count)
  join (
    select table_name, count(*)::int as column_count
    from information_schema.columns
    where table_schema = 'public'
    group by table_name
  ) a on a.table_name = e.table_name
  where a.column_count <> e.expected_count;

  if v_bad is not null then
    raise exception 'Refusing cleanup: unexpected column counts: %', v_bad;
  end if;

  -- Key legacy columns must be present. This also proves that public.suppliers
  -- is the legacy supplier table, not the approved suppliers table.
  select string_agg(e.table_name, ', ' order by e.table_name)
    into v_bad
  from (values
    ('audit_logs', 'audit_id'),
    ('batch_supply_links', 'link_id'),
    ('districts', 'district_id'),
    ('provinces', 'province_id'),
    ('publication_settings', 'publication_id'),
    ('qr_codes', 'qr_id'),
    ('raw_material_batches', 'batch_id'),
    ('suppliers', 'supplier_id'),
    ('supply_records', 'supply_id'),
    ('system_settings', 'setting_id'),
    ('test_results', 'test_id'),
    ('users', 'user_id')
  ) as e(table_name, marker_column)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = e.table_name
      and c.column_name = e.marker_column
  );

  if v_bad is not null then
    raise exception
      'Refusing cleanup: legacy marker columns are missing from: %',
      v_bad;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'password_hash'
  ) then
    raise exception 'Refusing cleanup: public.users is not the legacy password_hash table';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception 'Refusing cleanup: public.users already has an auth-style uuid id column';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'suppliers'
      and column_name in ('id', 'sum_id', 'approved_by_id', 'rejection_reason')
  ) then
    raise exception 'Refusing cleanup: public.suppliers already has the approved schema signature';
  end if;
end
$preflight_objects$;

-- ---------------------------------------------------------------------------
-- 2. Lock the legacy tables so the final data/dependency checks and drops see
--    a stable schema. This lock is released automatically when the migration
--    transaction ends.
-- ---------------------------------------------------------------------------

lock table
  public.audit_logs,
  public.batch_supply_links,
  public.districts,
  public.provinces,
  public.publication_settings,
  public.qr_codes,
  public.raw_material_batches,
  public.suppliers,
  public.supply_records,
  public.system_settings,
  public.test_results,
  public.users
in access exclusive mode;

-- ---------------------------------------------------------------------------
-- 3. Post-lock preflight: no data, exact foreign-key set, and no unexpected
--    dependants outside the legacy table set.
-- ---------------------------------------------------------------------------

do $preflight_data$
declare
  v_legacy_oids oid[];
  v_expected_fks text[] := array[
    'fk_audit_user',
    'fk_batch_origin_district',
    'fk_batch_registered_by',
    'fk_batch_supplier',
    'fk_batch_supply_batch',
    'fk_batch_supply_supply',
    'fk_districts_province',
    'fk_publication_batch',
    'fk_publication_updater',
    'fk_qr_batch',
    'fk_setting_updater',
    'fk_suppliers_approved_by',
    'fk_suppliers_district',
    'fk_supply_district',
    'fk_supply_supplier',
    'fk_test_batch',
    'fk_test_recorder',
    'fk_users_supplier'
  ];
  v_actual_fks text[];
  v_bad text;
begin
  -- Every legacy table must be empty.
  if exists (select 1 from public.audit_logs) then
    raise exception 'Refusing cleanup: public.audit_logs contains data';
  end if;
  if exists (select 1 from public.batch_supply_links) then
    raise exception 'Refusing cleanup: public.batch_supply_links contains data';
  end if;
  if exists (select 1 from public.districts) then
    raise exception 'Refusing cleanup: public.districts contains data';
  end if;
  if exists (select 1 from public.provinces) then
    raise exception 'Refusing cleanup: public.provinces contains data';
  end if;
  if exists (select 1 from public.publication_settings) then
    raise exception 'Refusing cleanup: public.publication_settings contains data';
  end if;
  if exists (select 1 from public.qr_codes) then
    raise exception 'Refusing cleanup: public.qr_codes contains data';
  end if;
  if exists (select 1 from public.raw_material_batches) then
    raise exception 'Refusing cleanup: public.raw_material_batches contains data';
  end if;
  if exists (select 1 from public.suppliers) then
    raise exception 'Refusing cleanup: public.suppliers contains data';
  end if;
  if exists (select 1 from public.supply_records) then
    raise exception 'Refusing cleanup: public.supply_records contains data';
  end if;
  if exists (select 1 from public.system_settings) then
    raise exception 'Refusing cleanup: public.system_settings contains data';
  end if;
  if exists (select 1 from public.test_results) then
    raise exception 'Refusing cleanup: public.test_results contains data';
  end if;
  if exists (select 1 from public.users) then
    raise exception 'Refusing cleanup: public.users contains data';
  end if;

  select array_agg(c.oid)
    into v_legacy_oids
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  -- The exact inspected 18 foreign keys, no more and no fewer.
  select array_agg(con.conname::text order by con.conname collate "C")
    into v_actual_fks
  from pg_constraint con
  where con.contype = 'f'
    and con.conrelid = any(v_legacy_oids);

  if v_actual_fks is distinct from v_expected_fks then
    raise exception
      'Refusing cleanup: legacy foreign keys are %, expected exactly %',
      v_actual_fks, v_expected_fks;
  end if;

  -- No foreign key from another schema/table points into the legacy tables.
  select string_agg(con.conrelid::regclass::text || '.' || con.conname, ', ' order by con.conrelid::regclass::text, con.conname)
    into v_bad
  from pg_constraint con
  where con.contype = 'f'
    and con.confrelid = any(v_legacy_oids)
    and con.conrelid <> all(v_legacy_oids);

  if v_bad is not null then
    raise exception
      'Refusing cleanup: external foreign keys reference legacy tables: %',
      v_bad;
  end if;

  -- No view or materialized view anywhere depends on a legacy table.
  select string_agg(distinct n.nspname || '.' || c.relname, ', ')
    into v_bad
  from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class c on c.oid = r.ev_class
  join pg_namespace n on n.oid = c.relnamespace
  where d.classid = 'pg_rewrite'::regclass
    and d.refclassid = 'pg_class'::regclass
    and d.refobjid = any(v_legacy_oids)
    and c.relkind in ('v', 'm');

  if v_bad is not null then
    raise exception
      'Refusing cleanup: views/materialized views depend on legacy tables: %',
      v_bad;
  end if;

  -- No catalog-tracked function anywhere depends on a legacy table.
  select string_agg(distinct n.nspname || '.' || p.proname, ', ')
    into v_bad
  from pg_depend d
  join pg_proc p on p.oid = d.objid
  join pg_namespace n on n.oid = p.pronamespace
  where d.classid = 'pg_proc'::regclass
    and d.refclassid = 'pg_class'::regclass
    and d.refobjid = any(v_legacy_oids);

  if v_bad is not null then
    raise exception
      'Refusing cleanup: functions depend on legacy tables: %',
      v_bad;
  end if;

  -- No trigger on another table depends on a legacy table.
  select string_agg(distinct t.tgname, ', ')
    into v_bad
  from pg_depend d
  join pg_trigger t on t.oid = d.objid
  where d.classid = 'pg_trigger'::regclass
    and d.refclassid = 'pg_class'::regclass
    and d.refobjid = any(v_legacy_oids)
    and t.tgrelid <> all(v_legacy_oids);

  if v_bad is not null then
    raise exception
      'Refusing cleanup: triggers outside the legacy tables depend on them: %',
      v_bad;
  end if;

  -- No legacy table is part of a publication. Supabase Realtime itself is
  -- preserved; only an unexpected table membership would stop this migration.
  select string_agg(p.pubname || ':' || pt.schemaname || '.' || pt.tablename, ', ')
    into v_bad
  from pg_publication_tables pt
  join pg_publication p on p.pubname = pt.pubname
  where pt.schemaname = 'public'
    and pt.tablename = any(array[
      'audit_logs',
      'batch_supply_links',
      'districts',
      'provinces',
      'publication_settings',
      'qr_codes',
      'raw_material_batches',
      'suppliers',
      'supply_records',
      'system_settings',
      'test_results',
      'users'
    ]);

  if v_bad is not null then
    raise exception
      'Refusing cleanup: legacy tables are in publications: %',
      v_bad;
  end if;

  -- The only dependencies on public.set_updated_at() must be the two known
  -- triggers. Nothing else may depend on the function.
  select string_agg(distinct c.relname || '.' || t.tgname, ', ')
    into v_bad
  from pg_depend d
  join pg_trigger t on t.oid = d.objid
  join pg_class c on c.oid = t.tgrelid
  where d.classid = 'pg_trigger'::regclass
    and d.refclassid = 'pg_proc'::regclass
    and d.refobjid = 'public.set_updated_at()'::regprocedure
    and not (
      (c.relname = 'publication_settings' and t.tgname = 'trg_publication_settings_updated_at')
      or (c.relname = 'system_settings' and t.tgname = 'trg_system_settings_updated_at')
    );

  if v_bad is not null then
    raise exception
      'Refusing cleanup: unexpected triggers depend on public.set_updated_at(): %',
      v_bad;
  end if;

  select string_agg(distinct d.classid::regclass::text || ':' || d.objid::text, ', ')
    into v_bad
  from pg_depend d
  where d.refclassid = 'pg_proc'::regclass
    and d.refobjid = 'public.set_updated_at()'::regprocedure
    and d.classid <> 'pg_trigger'::regclass;

  if v_bad is not null then
    raise exception
      'Refusing cleanup: non-trigger objects depend on public.set_updated_at(): %',
      v_bad;
  end if;

  -- Re-check policies and the exact trigger set after acquiring the locks.
  if exists (select 1 from pg_policies where schemaname = 'public') then
    raise exception 'Refusing cleanup: RLS policies appeared after the initial check';
  end if;

  if (
    select count(*)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
  ) <> 2 then
    raise exception 'Refusing cleanup: trigger count changed after the initial check';
  end if;
end
$preflight_data$;

-- ---------------------------------------------------------------------------
-- 4. Drop the 18 legacy foreign keys explicitly, before any table.
--    This breaks both directions of the users <-> suppliers cycle and the
--    child -> parent chains without relying on CASCADE.
-- ---------------------------------------------------------------------------

alter table public.audit_logs
  drop constraint fk_audit_user;

alter table public.batch_supply_links
  drop constraint fk_batch_supply_batch;

alter table public.batch_supply_links
  drop constraint fk_batch_supply_supply;

alter table public.districts
  drop constraint fk_districts_province;

alter table public.publication_settings
  drop constraint fk_publication_batch;

alter table public.publication_settings
  drop constraint fk_publication_updater;

alter table public.qr_codes
  drop constraint fk_qr_batch;

alter table public.raw_material_batches
  drop constraint fk_batch_origin_district;

alter table public.raw_material_batches
  drop constraint fk_batch_registered_by;

alter table public.raw_material_batches
  drop constraint fk_batch_supplier;

alter table public.suppliers
  drop constraint fk_suppliers_approved_by;

alter table public.suppliers
  drop constraint fk_suppliers_district;

alter table public.supply_records
  drop constraint fk_supply_district;

alter table public.supply_records
  drop constraint fk_supply_supplier;

alter table public.system_settings
  drop constraint fk_setting_updater;

alter table public.test_results
  drop constraint fk_test_batch;

alter table public.test_results
  drop constraint fk_test_recorder;

alter table public.users
  drop constraint fk_users_supplier;

-- ---------------------------------------------------------------------------
-- 5. Drop the 12 legacy tables explicitly, without CASCADE.
--
--    PostgreSQL removes the following objects automatically because they are
--    owned by the tables, not because of CASCADE:
--      * each table's identity sequence,
--      * each table's primary key, unique, check, and index objects,
--      * the two updated_at triggers on publication_settings/system_settings.
-- ---------------------------------------------------------------------------

drop table public.batch_supply_links;
drop table public.test_results;
drop table public.qr_codes;
drop table public.publication_settings;
drop table public.system_settings;
drop table public.audit_logs;
drop table public.raw_material_batches;
drop table public.supply_records;
drop table public.districts;
drop table public.provinces;
drop table public.users;
drop table public.suppliers;

-- ---------------------------------------------------------------------------
-- 6. Drop the standalone legacy trigger function. The two dependent triggers
--    were removed with their tables in the previous step. No CASCADE.
-- ---------------------------------------------------------------------------

drop function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Postflight: prove the legacy objects are gone and the preserved Supabase
--    schemas/tables still exist. This block performs no changes.
-- ---------------------------------------------------------------------------

do $postflight$
declare
  v_bad text;
begin
  select string_agg(v.name, ', ' order by v.name)
    into v_bad
  from (values
    ('public.audit_logs'),
    ('public.batch_supply_links'),
    ('public.districts'),
    ('public.provinces'),
    ('public.publication_settings'),
    ('public.qr_codes'),
    ('public.raw_material_batches'),
    ('public.suppliers'),
    ('public.supply_records'),
    ('public.system_settings'),
    ('public.test_results'),
    ('public.users')
  ) as v(name)
  where to_regclass(v.name) is not null;

  if v_bad is not null then
    raise exception 'Postflight failed: legacy tables still exist: %', v_bad;
  end if;

  if to_regprocedure('public.set_updated_at()') is not null then
    raise exception 'Postflight failed: public.set_updated_at() still exists';
  end if;

  -- No base tables, views, materialized views, foreign tables, sequences, or
  -- standalone composite types should remain in public before the approved
  -- migrations run.
  select string_agg(c.relname || ' (' || c.relkind::text || ')', ', ' order by c.relname)
    into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S', 'c');

  if v_bad is not null then
    raise exception 'Postflight failed: unexpected public objects remain: %', v_bad;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) then
    raise exception 'Postflight failed: public functions/procedures still exist';
  end if;

  if to_regnamespace('public') is null then
    raise exception 'Postflight failed: schema public is missing';
  end if;

  if to_regnamespace('auth') is null or to_regclass('auth.users') is null then
    raise exception 'Postflight failed: Supabase Auth schema/table is missing';
  end if;

  if to_regnamespace('storage') is null or to_regclass('storage.objects') is null then
    raise exception 'Postflight failed: Supabase Storage schema/table is missing';
  end if;

  if to_regnamespace('vault') is null then
    raise exception 'Postflight failed: Supabase Vault schema is missing';
  end if;

  if to_regnamespace('realtime') is null
     or to_regnamespace('graphql') is null
     or to_regnamespace('graphql_public') is null
     or to_regnamespace('extensions') is null then
    raise exception 'Postflight failed: a Supabase-managed schema is missing';
  end if;
end
$postflight$;
