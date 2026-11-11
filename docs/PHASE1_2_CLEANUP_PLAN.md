# Phase 1.2 - Remote legacy schema cleanup plan

Status: **PROPOSED - NOT EXECUTED**
Project: `tusul2026` (`cgzilsadexddvsiugbkx`), production
Prepared: 2026-11-10

## 1. Purpose

The live remote database still has the incorrect 12-table legacy schema. The
four approved CashmereTrace MN migrations are local-only and have never been
applied. This plan removes only the legacy objects and then lets the approved
migrations create the target schema in a controlled order.

No remote object was changed while preparing this plan.

## 2. Remote legacy inventory

| Legacy table | Rows | Identity sequence | RLS |
| --- | ---: | --- | --- |
| `audit_logs` | 0 | `audit_logs_audit_id_seq` | enabled, not forced |
| `batch_supply_links` | 0 | `batch_supply_links_link_id_seq` | enabled, not forced |
| `districts` | 0 | `districts_district_id_seq` | enabled, not forced |
| `provinces` | 0 | `provinces_province_id_seq` | enabled, not forced |
| `publication_settings` | 0 | `publication_settings_publication_id_seq` | enabled, not forced |
| `qr_codes` | 0 | `qr_codes_qr_id_seq` | enabled, not forced |
| `raw_material_batches` | 0 | `raw_material_batches_batch_id_seq` | enabled, not forced |
| `suppliers` | 0 | `suppliers_supplier_id_seq` | enabled, not forced |
| `supply_records` | 0 | `supply_records_supply_id_seq` | enabled, not forced |
| `system_settings` | 0 | `system_settings_setting_id_seq` | enabled, not forced |
| `test_results` | 0 | `test_results_test_id_seq` | enabled, not forced |
| `users` | 0 | `users_user_id_seq` | enabled, not forced |

Other verified counts: `auth.users = 0`, `auth.identities = 0`,
`storage.objects = 0`. There are no RLS policies, views, materialized views,
custom enum/domain/composite types, external foreign keys into the legacy
tables, or catalog-tracked dependent functions/views.

Legacy ACLs were unsafe: `ALL` table privileges (`arwdDxtm`) were granted to
`anon`, `authenticated`, and `service_role`; sequences had `rwU` to the same
roles; `public.set_updated_at()` had `EXECUTE` to `PUBLIC` and those roles.
Those ACLs are recorded in `backups/phase1_2_20261110/legacy_grants.sql` but
must not be restored into the approved schema.

## 3. Dependency graph

```text
provinces
  ^
  | fk_districts_province
districts
  ^          ^                    ^
  |          |                    |
  | fk_suppliers_district        | fk_batch_origin_district
  |          |                    |
suppliers ---+-------------- raw_material_batches
  ^          |                    ^   ^   ^
  |          |                    |   |   |
  | fk_supply_supplier           |   |   +-- fk_qr_batch ----------- qr_codes
  |          |                    |   +------ fk_publication_batch -- publication_settings
  |          |                    +---------- fk_test_batch --------- test_results
  |          |                    |
  |          +-- fk_batch_supplier
  |
supply_records
  ^
  | fk_batch_supply_supply
batch_supply_links
  |
  +-- fk_batch_supply_batch --> raw_material_batches

users
  ^  ^  ^  ^  ^
  |  |  |  |  +-- fk_audit_user ----------- audit_logs
  |  |  |  +----- fk_setting_updater ------ system_settings
  |  |  +-------- fk_publication_updater -- publication_settings
  |  +----------- fk_test_recorder -------- test_results
  +-------------- fk_batch_registered_by -- raw_material_batches

Circular pair:
  users.supplier_id -> suppliers.supplier_id   (fk_users_supplier)
  suppliers.approved_by -> users.user_id       (fk_suppliers_approved_by)
```

All 18 foreign keys must be dropped before any table. The circular
`users <-> suppliers` pair is the reason a naive table-drop order cannot work.

Triggers are attached to `publication_settings` and `system_settings` and use
`public.set_updated_at()`. They are removed automatically when their tables are
dropped. The function is then standalone and can be dropped explicitly.

## 4. Proposed migration

File:

```text
supabase/migrations/20261108000000_phase1_2_cleanup_legacy_schema.sql
```

It is timestamped before the first approved migration (`20261109000000`) and
performs, in order:

1. Preflight checks: exact legacy table/sequence/function/trigger set, legacy
   column signatures, `public.suppliers` is the legacy table (not the approved
   one), exact column counts, ownership, RLS state, no RLS policies, no custom
   types, no views/materialized views, no extra public tables.
2. `LOCK TABLE ... ACCESS EXCLUSIVE` on all 12 legacy tables.
3. Post-lock checks: all 12 tables have 0 rows, exact 18-FK set, no external
   FKs into legacy tables, no dependent views/materialized views/functions/
   external triggers, no publication membership, only the 2 known triggers
   depend on `public.set_updated_at()`.
4. 18 explicit `ALTER TABLE ... DROP CONSTRAINT` statements.
5. 12 explicit `DROP TABLE` statements with **no CASCADE**.
6. `DROP FUNCTION public.set_updated_at()` with **no CASCADE**.
7. Postflight: all 12 legacy tables, all 12 sequences, and the function are
   gone; `public` is empty of base tables/views/sequences/functions; `public`,
   `auth.users`, `storage.objects`, `vault`, `realtime`, `graphql`,
   `graphql_public`, and `extensions` still exist.

Identity sequences, indexes, constraints, and the two triggers are removed by
PostgreSQL as table-owned objects; this is not CASCADE.

## 5. Execution order

After separate written approval:

```text
1. 20261108000000_phase1_2_cleanup_legacy_schema.sql   (drops legacy objects)
2. 20261109000000_schema.sql                            (creates approved tables)
3. 20261109000100_functions.sql                         (functions/triggers)
4. 20261109000200_rls.sql                               (RLS/grants)
5. 20261109000300_phase1_1_finalization.sql             (final adjustments)
```

All five are currently pending because
`supabase_migrations.schema_migrations` does not exist remotely. The first
approved push would create that history table and apply all five in timestamp
order. Do not apply only the cleanup migration in a way that leaves the project
without the approved schema.

## 6. Dry-run limitations

`supabase db push --dry-run --remote` only prints the pending migration list.
It does **not** parse or execute the SQL and does not prove that the cleanup
preflight checks will pass against the real remote schema. The preflight blocks
were separately validated against the live catalog, but the actual DDL must
still be applied in a controlled window with a reviewed backup.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Unexpected data appears after inspection | Preflight aborts if any legacy table has a row. |
| Approved `suppliers` table already exists and is mistaken for legacy | Signature check requires `supplier_id`, `district_id`, `approved_by`, and rejects `id`, `sum_id`, `approved_by_id`, `rejection_reason`. |
| External dependency prevents a drop | Exact FK set, external FK, view/matview, function, trigger, and publication checks abort before any drop. |
| Partial cleanup | Apply through the migration runner in one transaction; all preflight checks run before the first drop. |
| Dropping unrelated Supabase objects | No `DROP SCHEMA`, no `CASCADE`, only explicit `public` legacy names; postflight verifies Auth/Storage/Vault/Realtime/GraphQL/extensions schemas remain. |
| No physical backup/PITR | All legacy tables are empty; logical DDL/data backup exists. Approval should still weigh the lack of PITR. |
| Lock contention | Empty tables and a 10-second lock timeout; the migration aborts rather than waiting indefinitely. |
| Migration history absent | First push bootstraps history and applies all five in order; do not manually repair or mark versions. |

## 8. Rollback

Before the four approved migrations:

- Recreate the empty legacy schema from
  `backups/phase1_2_20261110/public_schema.sql`.
- Only if a forensic restoration explicitly requires the old ACLs, review and
  apply `legacy_grants.sql` temporarily. Never leave those grants in place.

After the four approved migrations:

- Do not restore the legacy schema on top of the approved schema.
- Write and review a reverse migration for the approved objects instead.
- There is no PITR; a physical restore is not available.

## 9. Never-drop list

Do not drop or alter:

- Schema `public` itself.
- Schemas `auth`, `storage`, `vault`, `realtime`, `graphql`, `graphql_public`,
  `extensions`, `supabase_migrations`.
- `auth.users`, `auth.identities`, and other Auth objects.
- `storage.objects`, `storage.buckets`, and other Storage objects.
- Vault tables/functions, Realtime publications, GraphQL objects.
- Extensions `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`,
  `uuid-ossp`.
- Supabase roles (`anon`, `authenticated`, `service_role`, `postgres`,
  `supabase_admin`, etc.).
- The four approved migration files and their objects.
- Any object not explicitly named in the cleanup migration.

## 10. Approval gate

The cleanup migration remains unapplied. Before execution, require:

1. Explicit approval of the cleanup scope and timestamp.
2. Confirmation that the logical backup checksums match.
3. A final read-only row-count check immediately before the maintenance window.
4. A decision on the lack of physical backup/PITR.
5. A single controlled push that applies cleanup plus all four approved
   migrations in order.
