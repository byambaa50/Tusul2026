# CashmereTrace MN - Phase 1.2 Remote Supabase Cleanup Report

**Status:** Inspection/planning complete. Cleanup **not applied**.
**Project:** `tusul2026` (`cgzilsadexddvsiugbkx`), production, region `ap-southeast-2`
**Prepared:** 2026-11-10
**Scope:** Read-only inspection, local logical backup, and a proposed cleanup migration. No remote DDL/DML was authorized or performed.

> **Local security-correction addendum (2026-11-11):** after this report was
> written, the four approved local migrations were corrected without any remote
> access. Audit/profile foreign keys now use `RESTRICT` with profile deletion
> blocked, batch sequences are bounded to `1..999999`, batches require an
> `APPROVED` supplier, direct QR writes were replaced by controlled RPCs,
> `animalCount` was removed from the public catalog, and audit/RLS/privilege
> gaps were closed. The local PGlite harness (`backend/tests/phase1-security.test.ts`)
> applies all five migrations in order and passes 47 security tests; the full
> backend suite passes 66 tests. Those checks include the later batch-year
> guard, clerk-created `PENDING` suppliers, admin-only approval, authenticated
> actor binding on `create_batch()`, `PUBLIC`/`anon`/`authenticated` privilege
> revokes, and rejection of service-role QR calls without a user context. The
> cleanup migration and the five-file order below are unchanged. No remote
> connection, push, reset, repair, or deployment was performed. Details:
> `docs/PHASE1_SECURITY_CORRECTIONS.md`.

---

## 1. Executive summary

The live remote database still contains the incorrect 12-table legacy public schema. Every legacy table is empty, every legacy sequence is unused, and there are no remote migration-history records. The four approved CashmereTrace MN migrations are present only locally and have never been applied.

A cleanup migration has been prepared at:

```text
supabase/migrations/20261108000000_phase1_2_cleanup_legacy_schema.sql
```

It is timestamped before the first approved migration (`20261109000000`) and is designed to:

- Refuse to run unless the live schema still matches the inspected legacy shape.
- Refuse to run if any legacy table contains data.
- Refuse to run if there are unexpected public tables, sequences, functions, types, views, policies, foreign keys, triggers, or external dependencies.
- Drop the 18 legacy foreign keys explicitly.
- Drop the 12 legacy tables explicitly with **no CASCADE**.
- Drop the standalone `public.set_updated_at()` function with **no CASCADE**.
- Prove in a postflight block that the legacy objects are gone and that Supabase Auth, Storage, Vault, Realtime, GraphQL, and extensions schemas still exist.

The migration has **not** been executed. `supabase db push --remote` was **not** run.

---

## 2. Current remote database inventory

### 2.1 Schemas

Present:

```text
auth
extensions
graphql
graphql_public
public
realtime
storage
vault
```

There is **no** `supabase_migrations` schema and no `supabase_migrations.schema_migrations` table remotely.

### 2.2 Legacy public tables

All 12 tables are owned by `postgres`. RLS is enabled and not forced on every table. There are **0 RLS policies**.

| Table | Columns | Rows | Primary key | FKs out | Indexes | RLS | Policies |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: |
| `audit_logs` | 10 | 0 | `audit_id` | 1 | 4 | enabled, not forced | 0 |
| `batch_supply_links` | 5 | 0 | `link_id` | 2 | 3 | enabled, not forced | 0 |
| `districts` | 5 | 0 | `district_id` | 1 | 4 | enabled, not forced | 0 |
| `provinces` | 4 | 0 | `province_id` | 0 | 3 | enabled, not forced | 0 |
| `publication_settings` | 6 | 0 | `publication_id` | 2 | 2 | enabled, not forced | 0 |
| `qr_codes` | 6 | 0 | `qr_id` | 1 | 3 | enabled, not forced | 0 |
| `raw_material_batches` | 9 | 0 | `batch_id` | 3 | 5 | enabled, not forced | 0 |
| `suppliers` | 10 | 0 | `supplier_id` | 2 | 4 | enabled, not forced | 0 |
| `supply_records` | 7 | 0 | `supply_id` | 2 | 3 | enabled, not forced | 0 |
| `system_settings` | 5 | 0 | `setting_id` | 1 | 2 | enabled, not forced | 0 |
| `test_results` | 9 | 0 | `test_id` | 2 | 2 | enabled, not forced | 0 |
| `users` | 10 | 0 | `user_id` | 1 | 4 | enabled, not forced | 0 |

Totals: **12 tables, 86 columns, 0 rows, 18 foreign keys, 39 indexes, 0 RLS policies**.

### 2.3 Sequences

All 12 are identity-owned, `bigint`, start 1, increment 1, cache 1, no cycle, and `last_value = null`:

```text
audit_logs_audit_id_seq
batch_supply_links_link_id_seq
districts_district_id_seq
provinces_province_id_seq
publication_settings_publication_id_seq
qr_codes_qr_id_seq
raw_material_batches_batch_id_seq
suppliers_supplier_id_seq
supply_records_supply_id_seq
system_settings_setting_id_seq
test_results_test_id_seq
users_user_id_seq
```

### 2.4 Functions and triggers

- One public function: `public.set_updated_at()`
  - Returns `trigger`
  - Zero arguments
  - `SECURITY INVOKER`
  - No fixed `search_path`
  - Owner `postgres`
  - `EXECUTE` granted to `PUBLIC`, `anon`, `authenticated`, `service_role`
- Two triggers:
  - `publication_settings.trg_publication_settings_updated_at` (`BEFORE UPDATE`)
  - `system_settings.trg_system_settings_updated_at` (`BEFORE UPDATE`)

Both triggers use `public.set_updated_at()`.

### 2.5 Views, materialized views, and custom types

- Views: **0**
- Materialized views: **0**
- Custom enum/domain/composite types in `public`: **0**
- Foreign tables in `public`: **0**
- Partitioned tables in `public`: **0**

### 2.6 Extensions and Supabase-managed objects

Installed extensions:

```text
pg_stat_statements   (extensions)
pgcrypto             (extensions)
plpgsql              (pg_catalog)
supabase_vault       (vault)
uuid-ossp            (extensions)
```

No extension is installed in `public`.

Six Supabase-managed event triggers exist (`issue_graphql_placeholder`,
`issue_pg_cron_access`, `issue_pg_graphql_access`, `issue_pg_net_access`,
`pgrst_ddl_watch`, `pgrst_drop_watch`). They are not dependencies on the legacy
tables and must not be dropped.

Publication `supabase_realtime` exists with **no tables** in it.

### 2.7 Grants and default privileges

Legacy table ACL, on every table:

```text
postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm
```

Legacy sequence ACL, on every sequence:

```text
postgres=rwU, anon=rwU, authenticated=rwU, service_role=rwU
```

Legacy function ACL:

```text
PUBLIC=X, postgres=X, anon=X, authenticated=X, service_role=X
```

Schema `public` ACL includes `USAGE` for `PUBLIC`, `anon`, `authenticated`, and
`service_role`.

**Residual security item:** `pg_default_acl` in `public` is permissive for both
`postgres` and `supabase_admin` owners: tables default to `arwdDxtm` for
`anon`/`authenticated`/`service_role`, sequences to `rwU`, functions to `X`.
The approved RLS migration revokes grants on the approved tables it creates, but
future tables created in `public` could inherit permissive defaults. This is not
part of the table-drop cleanup and should be handled by a separate reviewed
hardening migration.

---

## 3. Current data row counts

| Object | Rows |
| --- | ---: |
| `public.audit_logs` | 0 |
| `public.batch_supply_links` | 0 |
| `public.districts` | 0 |
| `public.provinces` | 0 |
| `public.publication_settings` | 0 |
| `public.qr_codes` | 0 |
| `public.raw_material_batches` | 0 |
| `public.suppliers` | 0 |
| `public.supply_records` | 0 |
| `public.system_settings` | 0 |
| `public.test_results` | 0 |
| `public.users` | 0 |
| `auth.users` | 0 |
| `auth.identities` | 0 |
| `storage.objects` | 0 |

No legacy table contains data. There is no user, supplier, batch, quality,
QR, audit, or configuration data to migrate.

---

## 4. Full dependency graph

### 4.1 Foreign-key edges

| Constraint | Child | Parent | On update | On delete |
| --- | --- | --- | --- | --- |
| `fk_districts_province` | `districts.province_id` | `provinces.province_id` | CASCADE | RESTRICT |
| `fk_suppliers_district` | `suppliers.district_id` | `districts.district_id` | CASCADE | RESTRICT |
| `fk_suppliers_approved_by` | `suppliers.approved_by` | `users.user_id` | CASCADE | SET NULL |
| `fk_users_supplier` | `users.supplier_id` | `suppliers.supplier_id` | CASCADE | RESTRICT |
| `fk_supply_supplier` | `supply_records.supplier_id` | `suppliers.supplier_id` | CASCADE | RESTRICT |
| `fk_supply_district` | `supply_records.district_id` | `districts.district_id` | CASCADE | RESTRICT |
| `fk_batch_supplier` | `raw_material_batches.supplier_id` | `suppliers.supplier_id` | CASCADE | RESTRICT |
| `fk_batch_origin_district` | `raw_material_batches.origin_district_id` | `districts.district_id` | CASCADE | RESTRICT |
| `fk_batch_registered_by` | `raw_material_batches.registered_by` | `users.user_id` | CASCADE | RESTRICT |
| `fk_test_batch` | `test_results.batch_id` | `raw_material_batches.batch_id` | CASCADE | RESTRICT |
| `fk_test_recorder` | `test_results.recorded_by` | `users.user_id` | CASCADE | RESTRICT |
| `fk_qr_batch` | `qr_codes.batch_id` | `raw_material_batches.batch_id` | CASCADE | RESTRICT |
| `fk_publication_batch` | `publication_settings.batch_id` | `raw_material_batches.batch_id` | CASCADE | RESTRICT |
| `fk_publication_updater` | `publication_settings.updated_by` | `users.user_id` | CASCADE | SET NULL |
| `fk_setting_updater` | `system_settings.updated_by` | `users.user_id` | CASCADE | SET NULL |
| `fk_audit_user` | `audit_logs.user_id` | `users.user_id` | CASCADE | SET NULL |
| `fk_batch_supply_batch` | `batch_supply_links.batch_id` | `raw_material_batches.batch_id` | CASCADE | RESTRICT |
| `fk_batch_supply_supply` | `batch_supply_links.supply_id` | `supply_records.supply_id` | CASCADE | RESTRICT |

### 4.2 Circular dependency

```text
public.users.supplier_id  -> public.suppliers.supplier_id  (fk_users_supplier)
public.suppliers.approved_by -> public.users.user_id        (fk_suppliers_approved_by)
```

Both constraints must be dropped before either table can be dropped. The
cleanup drops all 18 FKs first, then drops the tables.

### 4.3 Other dependencies

- Triggers: automatically removed with `publication_settings` and
  `system_settings`; no explicit trigger drop is needed.
- `public.set_updated_at()`: after the two tables are gone, its only dependencies
  are gone; it is dropped explicitly.
- Identity sequences: automatically removed with their owning tables; no
  explicit sequence drop is needed.
- External FKs into legacy tables: **none**.
- Views/materialized views depending on legacy tables: **none**.
- Catalog-tracked functions depending on legacy tables: **none**.
- Function body text referencing legacy tables outside Supabase-managed schemas:
  **none**.
- Triggers outside the legacy tables referencing them: **none**.
- Legacy tables in publications: **none**.

---

## 5. Backup files and verification

Directory:

```text
backups/phase1_2_20261110/
```

Files:

| File | Purpose |
| --- | --- |
| `README.md` | Backup method, limitations, restore notes |
| `public_schema.sql` | Complete legacy public DDL (12 tables, 18 FKs, 39 indexes, RLS enablement, function, 2 triggers) |
| `legacy_grants.sql` | Exact legacy ACLs, separated because they are unsafe |
| `public_data.json` | Empty data export for all 12 legacy tables plus preserved Supabase counts |
| `inventory.json` | Machine-readable inventory and dependency findings |
| `checksums.sha256` | SHA-256 checksums for all backup files |

### 5.1 SHA-256 verification

```text
2796723ec8e7405a146367893f1a04798d166333ce70f2099cead51127a2f67b  README.md
ee0f5879ab810bd0f0bd362f87ea7997742a3ada30a104fe604a39c1ebeaa726  public_schema.sql
e52d5d6520b78040033afced53ff5c5c9ee4e5aa4f5ea3d9c4ccc1dba8dcb830  legacy_grants.sql
db9643f626c1d2cf91412b034b6442c5705467bc9fdbea2b059a6ac99675a9fc  public_data.json
27962176e5e08b5ebf0d10399b916bbcb191273075b2f85441937caedc982fa5  inventory.json
```

Verification result: **ALL_CHECKSUMS_OK**. Both JSON files parse as valid JSON.
The schema backup contains 12 `create table` statements, 18 FK additions, and
14 non-constraint index creations (25 further indexes are constraint-backed,
for 39 total).

### 5.2 Backup method and limitations

- `supabase db dump --remote --schema public` was attempted and failed because
  Docker/Podman is not installed.
- `pg_dump` and `psql` are not installed.
- The Supabase project has WAL-G enabled but **no physical backups available**
  and **PITR disabled**.
- The backup is a logical catalog/data export produced with read-only SQL
  queries. It is not a physical backup and cannot restore Auth/Storage data or
  point-in-time state.

### 5.3 Restore notes

- `public_schema.sql` recreates only the empty legacy public schema. All tables
  were empty, so no table data is missing.
- `legacy_grants.sql` must not be applied to the approved schema without a
  security review; it grants `ALL` privileges to `anon`, `authenticated`, and
  `service_role`.
- Auth users, identities, Storage objects, Vault secrets, Realtime
  configuration, extensions, and migration history are not included.

---

## 6. Proposed cleanup migration

**Filename:**

```text
supabase/migrations/20261108000000_phase1_2_cleanup_legacy_schema.sql
```

**Timestamp:** `20261108000000` (sorts before `20261109000000`)
**Lines:** 777
**SHA-256:**

```text
84ccbd5f1d9075cd70cd92e56b8a87c475edc2eb127edcb800a244cff988728d
```

### 6.1 Safety design

The migration contains two preflight blocks and one postflight block:

1. **Preflight before locking**
   - `public` exists.
   - Exactly the 12 expected base tables exist.
   - Exactly the 12 expected identity sequences exist and are identity-owned by
     those tables.
   - Exactly one public function, `set_updated_at()`, with the correct signature.
   - No views, materialized views, partitioned tables, foreign tables, or custom
     types in `public`.
   - Exactly the 2 expected triggers.
   - No RLS policies.
   - Tables are owned by `postgres`, RLS enabled and not forced.
   - Exact column counts and legacy marker columns.
   - `public.users` has `password_hash` and no auth-style uuid `id`.
   - `public.suppliers` has `supplier_id`, `district_id`, `approved_by` and does
     **not** have `id`, `sum_id`, `approved_by_id`, or `rejection_reason`
     (so the approved `suppliers` table can never be mistaken for the legacy one).

2. **Access-exclusive locks**
   - Locks all 12 legacy tables before the data/dependency checks and drops.

3. **Preflight after locking**
   - All 12 tables have 0 rows.
   - Exactly the inspected 18 foreign keys, no more and no fewer.
   - No external FK points into a legacy table.
   - No view/materialized view/function/external trigger depends on a legacy table.
   - No legacy table is in a publication.
   - Only the two known triggers depend on `set_updated_at()`.
   - No non-trigger object depends on `set_updated_at()`.
   - RLS policies and trigger count have not changed.

4. **Drops**
   - 18 explicit `ALTER TABLE ... DROP CONSTRAINT` statements.
   - 12 explicit `DROP TABLE` statements, no `CASCADE`.
   - `DROP FUNCTION public.set_updated_at()`, no `CASCADE`.
   - No `DROP SCHEMA`, no `DROP ... CASCADE`, no `TRUNCATE`, no `DELETE`.

5. **Postflight**
   - All 12 legacy tables are gone.
   - `public.set_updated_at()` is gone.
   - `public` contains no base tables, views, materialized views, foreign tables,
     sequences, composite types, or functions before the approved migrations run.
   - `public`, `auth.users`, `storage.objects`, `vault`, `realtime`, `graphql`,
     `graphql_public`, and `extensions` still exist.

The two preflight blocks were executed against the live catalog as read-only
checks (no DDL/DML) and passed. The DDL itself was **not** executed.

### 6.2 Complete SQL content

The complete, authoritative SQL is the migration file above. It is reproduced
in Appendix A.

---

## 7. Migration execution order

Local migration list:

```text
20261108000000  (cleanup, local only)
20261109000000  (approved schema)
20261109000100  (approved functions/triggers)
20261109000200  (approved RLS/grants)
20261109000300  (approved Phase 1.1 finalization)
```

Remote migration versions: **empty**. Remote migration-history table: **absent**.

`supabase migration list --remote` shows all five as local with empty remote
versions. `supabase db push --dry-run --remote` reports:

```text
Would push these migrations:
 â€¢ 20261108000000_phase1_2_cleanup_legacy_schema.sql
 â€¢ 20261109000000_schema.sql
 â€¢ 20261109000100_functions.sql
 â€¢ 20261109000200_rls.sql
 â€¢ 20261109000300_phase1_1_finalization.sql
```

The intended order after separate approval is exactly that list: cleanup first,
then the four approved migrations, in one controlled push.

### 7.1 Dry-run limitation

`supabase db push --dry-run --remote` only lists pending migration files. It does
not parse or execute the SQL, and it does not prove that every statement will
succeed against the real remote schema. The preflight blocks were separately
validated against the live catalog, but the actual DDL must still be applied in
a controlled maintenance window with the verified backup available.

No `supabase db push --remote` was executed. No `migration repair`, reset, or
remote history change was performed.

---

## 8. Risks and rollback

| Risk | Mitigation |
| --- | --- |
| New data appears after inspection | Preflight aborts if any legacy table has a row. |
| Approved `suppliers` table already exists and is mistaken for legacy | Signature check requires legacy columns and rejects approved-schema columns. |
| Unexpected dependency blocks a drop | Exact FK, external FK, view, function, trigger, and publication checks abort before any drop. |
| Partial cleanup | All preflight checks run before the first drop; apply through the migration runner in one transaction. |
| Dropping unrelated Supabase objects | No `DROP SCHEMA`, no `CASCADE`, only explicit `public` legacy names; postflight verifies managed schemas remain. |
| No physical backup/PITR | All legacy tables are empty and a logical DDL/data backup exists; approval must still weigh the lack of PITR. |
| Lock contention | Empty tables and a 10-second lock timeout; abort rather than wait indefinitely. |
| Migration history absent | First push bootstraps history and applies all five in order; do not manually repair or mark versions. |
| Permissive default ACLs remain | Separate hardening migration recommended; see section 10. |

### 8.1 Rollback before the approved migrations run

1. Recreate the empty legacy schema from
   `backups/phase1_2_20261110/public_schema.sql`.
2. If a forensic restoration explicitly requires the old ACLs, review and apply
   `legacy_grants.sql` temporarily. Never leave those grants in place.
3. Recheck row counts and object inventory.

### 8.2 Rollback after the approved migrations run

- Do not restore the legacy schema on top of the approved schema.
- Write and review a reverse migration for the approved objects instead.
- There is no PITR and no physical backup available.

---

## 9. Objects that must never be dropped

- Schema `public` itself.
- Schemas `auth`, `storage`, `vault`, `realtime`, `graphql`, `graphql_public`,
  `extensions`, `supabase_migrations`.
- `auth.users`, `auth.identities`, and all other Auth objects.
- `storage.objects`, `storage.buckets`, and all other Storage objects.
- Vault tables/functions, Realtime publications, GraphQL objects.
- Extensions `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`,
  `uuid-ossp`.
- Supabase roles (`anon`, `authenticated`, `service_role`, `postgres`,
  `supabase_admin`, and related roles).
- The six Supabase-managed event triggers.
- The four approved migration files and the objects they create.
- Any object not explicitly named in the cleanup migration.

---

## 10. Unresolved dependencies and open items

1. **Permissive default privileges in `public`**
   - `pg_default_acl` for `postgres` and `supabase_admin` grants broad table,
     sequence, and function privileges to `anon`, `authenticated`, and
     `service_role` by default.
   - The approved RLS migration revokes grants on the tables it creates, but a
     future table created in `public` could inherit the permissive defaults.
   - Recommend a separate reviewed hardening migration, for example revoking
     default privileges for both owner roles in `public`. Do not fold this into
     the drop migration without approval.

2. **No physical backup or PITR**
   - WAL-G is enabled but no physical backups are available and PITR is
     disabled. The logical backup is the only local rollback artifact.

3. **No remote migration history**
   - `supabase_migrations.schema_migrations` does not exist. The first push will
     bootstrap it and apply all five pending migrations. Do not use
     `migration repair` or manually mark versions.

4. **Docker/pg_dump unavailable**
   - `supabase db dump` cannot run without Docker/Podman, and `pg_dump`/`psql`
     are not installed. The logical backup was assembled from read-only SQL.

5. **Final pre-window check**
   - Re-run row counts and object inventory immediately before the maintenance
     window. If anything changed, stop and re-review.

6. **Approval gate**
   - Explicit approval of the cleanup scope and timestamp is still required
     before any push.

---

## 11. Confirmation: no remote database changes

No remote database object was deleted, altered, dropped, truncated, reset,
repaired, or migrated.

Specifically:

- No `supabase db push --remote` was run.
- No `supabase migration repair` was run.
- No migration was marked as applied.
- No database reset was run.
- No `DROP`, `ALTER`, `TRUNCATE`, `DELETE`, `INSERT`, or `UPDATE` was executed
  against the remote database.
- The two preflight `DO` blocks were catalog-read-only checks; they contained no
  DDL or DML and did not change data or schema.
- `supabase db push --dry-run --remote` only listed pending migrations.
- The remote inventory after all checks is unchanged: 12 legacy tables, 12
  sequences, 18 FKs, 2 triggers, 1 function, 0 RLS policies, and 0 total legacy
  rows; Auth/Storage counts remain 0.

The cleanup migration is prepared but **not applied**. Stop here pending
explicit approval.

---

## Appendix A - Complete cleanup SQL

```sql
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
```

---

## Appendix B - Backup checksum manifest

```text
2796723ec8e7405a146367893f1a04798d166333ce70f2099cead51127a2f67b  README.md
ee0f5879ab810bd0f0bd362f87ea7997742a3ada30a104fe604a39c1ebeaa726  public_schema.sql
e52d5d6520b78040033afced53ff5c5c9ee4e5aa4f5ea3d9c4ccc1dba8dcb830  legacy_grants.sql
db9643f626c1d2cf91412b034b6442c5705467bc9fdbea2b059a6ac99675a9fc  public_data.json
27962176e5e08b5ebf0d10399b916bbcb191273075b2f85441937caedc982fa5  inventory.json
```

Verification: `ALL_CHECKSUMS_OK`.
