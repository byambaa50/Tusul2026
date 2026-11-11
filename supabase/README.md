# CashmereTrace MN - Phase 1 database

This directory contains the Phase 1 PostgreSQL/Supabase cleanup, schema,
functions, Row Level Security policies, and finalization migration. It does not
contain auth flows, Express APIs, or frontend changes. It contains import
tooling and provenance records for aimag/sum reference data, but no reference
rows are seeded.

No migration in this directory has been applied to the hosted Supabase project.
All validation described below is local (PGlite); no remote connection, push,
reset, or migration repair was performed.

## Files and order

The migrations must run in this order:

1. `migrations/20261108000000_phase1_2_cleanup_legacy_schema.sql` - guarded
   cleanup of the inspected legacy public schema. It refuses to run unless the
   legacy shape and empty-table state still match the local backup.
2. `migrations/20261109000000_schema.sql` - tables, checks, keys, indexes, the
   closed publish-field catalog, and RLS enablement.
3. `migrations/20261109000100_functions.sql` - trusted identity helpers,
   integrity guards, `create_batch`, the controlled QR RPCs, `public_verify`,
   audit append-only guards, and function privileges.
4. `migrations/20261109000200_rls.sql` - policies, table/sequence grants, and
   schema privilege hardening.
5. `migrations/20261109000300_phase1_1_finalization.sql` - Phase 1.1
   finalization: safe `test_date` -> `tested_at` rename, `animalCount` catalog
   preflight, final `create_batch` body, central audit triggers, and the final
   `public_verify` body.

The filenames use Supabase's standard 14-digit timestamp prefix. Do not rename
or rewrite an already-applied migration. In this repository the five files are
still local and unapplied, so the 2026-11-11 security/integrity corrections were
made in place before any deployment.

## Apply to a Supabase project

Docker and `psql` are not available in this environment, so the local Supabase
stack and hosted `db push` have not been executed. Supabase CLI 3.0.0 is
available through `npx`. These commands are the intended path after separate
approval:

```powershell
# Local stack
npx supabase init        # only when supabase/config.toml does not exist
npx supabase start
npx supabase db reset    # applies the five migrations in timestamp order

# Linked hosted project (not run for this work)
npx supabase link --project-ref <project-ref>
npx supabase db push
```

There is no `supabase/config.toml` yet. The `supabase/seed/` directory contains
the aimag/sum import template, validation/merge SQL, and provenance rules. It
does not contain verified reference rows. The official administrative dataset
must be approved, recorded, and imported before batches can be created. See
`seed/README.md` and `seed/aimag_sum_source.md`.

## Tables

| Table | Purpose |
| --- | --- |
| `aimags` | Aimag lookup. No seed rows in Phase 1. |
| `sums` | Sum lookup, child of `aimags`. No seed rows in Phase 1. |
| `suppliers` | Supplier master data; may exist without an auth login (BR-12). |
| `profiles` | Login identity and role, one row per `auth.users.id`; links a supplier login to `suppliers`. |
| `supply_info` | Supplier-declared supply/origin rows. |
| `batch_counter` | Per-year sequence used by `create_batch`; bounded to `0..999999`. |
| `batch` | Raw-cashmere batch with immutable `batch_code`. |
| `quality_test` | Insert-only laboratory result history: `fineness_micron`, `clean_yield_pct`, `admixture_pct`, `tested_at`. |
| `qr_code` | One QR per batch; `CREATED` then `READY`, written only through the controlled RPCs. |
| `publish_config` | Quality staff's closed-catalog public-field selection. |
| `audit_log` | Append-only audit rows with sanitized detail. |
| `system_config` | Empty admin setting store; no unapproved keys seeded. |

Key relationships:

- `profiles.id -> auth.users.id` (RESTRICT).
- `profiles.supplier_id -> suppliers.id` (RESTRICT, unique when not null).
- `suppliers.approved_by_id -> profiles.id` (RESTRICT).
- `supply_info.supplier_id -> suppliers.id` and `supply_info.sum_id -> sums.id`
  (RESTRICT).
- `batch.supplier_id -> suppliers.id`, `batch.origin_sum_id -> sums.id`, and
  `batch.registered_by_id -> profiles.id` (RESTRICT).
- `quality_test.batch_id -> batch.id` and `quality_test.created_by_id ->
  profiles.id` (RESTRICT).
- `qr_code.batch_id -> batch.id` (RESTRICT, unique).
- `publish_config.batch_id -> batch.id` (RESTRICT, primary key) and
  `publish_config.updated_by_id -> profiles.id` (RESTRICT).
- `audit_log.actor_id -> profiles.id` (RESTRICT).
- `system_config.updated_by_id -> profiles.id` (RESTRICT).

No foreign key uses `ON DELETE CASCADE` or `ON DELETE SET NULL`. Every reference
to `profiles` is `RESTRICT`, so deleting a profile cannot erase audit
attribution. `profiles_reject_delete()` blocks hard deletion; profiles are
deactivated through `status` instead.

## Important constraints and indexes

- `batch.batch_code` is unique and matches `^MN-[0-9]{4}-[0-9]{6}$`.
- `batch_counter(year, sequence)` is locked with `FOR UPDATE` by
  `create_batch`; `batch_code` uniqueness is the final guard.
- The `MN-YYYY` year is derived from `batch.received_date`, not from the
  database clock. The per-year counter is independent, so 2024, 2025, and 2026
  batches each start at `000001`.
- `batch_code` is immutable. A receipt-date correction is allowed only when the
  new year still matches the code; a cross-year correction is rejected by
  `guard_batch_update()`.
- The counter is bounded to `1..999999`. `create_batch()` raises before
  formatting an out-of-range value, so `lpad()` can never truncate `1000000`
  into `100000`. The whole batch/counter/audit transaction rolls back on error.
- `create_batch()` accepts only an active `registration_clerk` and an
  `APPROVED` supplier. Pending and rejected self-registrations cannot receive a
  batch.
- `batch.weight_kg`, `supply_info.weight_kg`, and quality percentages reject
  invalid values; numeric `NaN`/`Infinity` inputs are rejected.
- `quality_test` has a latest-result index on
  `(batch_id, created_at DESC, id DESC)`. `tested_at` is the laboratory/report
  date; it is not the history-ordering key.
- `quality_test` and `audit_log` reject update, delete, and truncate through
  triggers, including for the table owner/service role.
- `qr_code.status` is `CREATED` or `READY`; `ready_at` must match the status and
  is assigned by the database.
- `publish_config.published_fields` must be a JSON array from the closed
  catalog. Personal data, `lab_result`, and `animalCount` are not in the V1
  catalog. The finalization migration refuses to run if existing configuration
  still selects `animalCount`.
- `aimags` and `sums` reject blank codes/names. The import merge rejects
  conflicting names, conflicting codes, blanks, and exact duplicate rows.
- Central audit triggers cover `aimags`, `sums`, `suppliers`, `profiles`,
  `supply_info`, `batch`, `quality_test` (insert), `qr_code`,
  `publish_config`, and `system_config`. `audit_log` has no insert trigger, so
  an audit write cannot recurse into another audit write.
- Lookup indexes exist on supplier sum/status, batch supplier/origin/date,
  supply supplier/sum/date, and audit actor/entity/action/time.

## RPCs

### `public.create_batch(p_supplier_id, p_weight_kg, p_received_date, p_origin_sum_id, p_registered_by)`

`SECURITY DEFINER`, fixed `search_path`. It:

1. validates a positive finite weight and required values;
2. requires the actor profile to be an active `registration_clerk`;
3. requires `registered_by` to match `auth.uid()` when a user claim is present.
   `p_registered_by` must be derived by the server from the verified session,
   never from a client-supplied body field. A service-role call is a trusted
   server boundary and still requires an active-clerk profile;
4. verifies the supplier exists and is `APPROVED`;
5. verifies the origin sum exists;
6. derives the year from `p_received_date`, locks/creates that year's
   `batch_counter` row, increments it, rejects values outside `1..999999`, and
   builds `MN-YYYY-NNNNNN`;
7. inserts the batch; the `batch_audit_change` trigger writes exactly one
   `CREATE batch` audit row in the same transaction (the RPC does not insert a
   second audit row);
8. returns `{ batch_id, batch_code }`.

Only `authenticated` and `service_role` may execute it. Anonymous callers may
not.

### `public.create_qr(p_batch_id)`

`SECURITY DEFINER`, fixed `search_path`. It requires `auth.uid()` plus an active
`registration_clerk`, verifies the batch exists, generates the token with
`gen_random_uuid()`, derives the relative URL as `/verify/<token>`, and inserts
`CREATED` with `ready_at = NULL`. A client cannot choose the token, URL, status,
or timestamp. A second QR for the batch raises a uniqueness error. It returns
`{ qr_id, token, url, status }`.

Call it with the clerk's user-scoped Supabase client, not a service-role client.
A service-role call has `auth.uid() = NULL` and is rejected before the clerk-role
check; do not weaken or bypass that check.

Direct `qr_code` `INSERT`/`UPDATE` is not granted to `authenticated` and has no
policy; `authenticated` has `SELECT` only.

### `public.mark_qr_ready(p_batch_id)`

`SECURITY DEFINER`, fixed `search_path`. It requires `auth.uid()` plus an active
`registration_clerk`, locks the QR row, permits only `CREATED -> READY`, and
sets `ready_at = now()` inside the guard trigger. A caller-supplied timestamp is
never trusted, and a ready QR cannot return to `CREATED`. It returns
`{ qr_id, status, ready_at }`. Like `create_qr()`, it must be called with the
clerk's user JWT; a service-role client has no verified user context and is
rejected.

### `public.public_verify(token text)`

`SECURITY DEFINER`, fixed `search_path = public, pg_temp`. It returns one JSON
object only when the QR is `READY`, the publication is `PUBLISHED`, the field
array is non-empty, and at least one emitted value is non-null. Otherwise it
returns `NULL` for unknown, hidden, private, empty, or no-card tokens.

Returned keys are limited to the closed catalog:

`batchNo`, `aimagName`, `sumName`, `quantityKg`, `finenessMicron`,
`cleanYieldPct`, `impurityPct`, `testedAt`, `verificationStatus`.

`verificationStatus` is the literal `verified`. `impurityPct` maps to
`quality_test.admixture_pct`, and `testedAt` maps to
`quality_test.tested_at`. `animalCount` is not part of the V1 catalog because
`batch_supply_link` and batch-level animal counts are excluded from V1.
Supplier identity, phone, email, address, identity code, internal IDs, audit
data, lab text, storage paths, and earlier quality history are never returned.
Only the latest quality result is used.

Only `anon`, `authenticated`, and `service_role` may execute it. No table has a
public `SELECT` policy.

## RLS summary

The policies below cover the six actors used in Phase 1 testing: `supplier`,
`registration_clerk`, `quality_staff`, `management`, `admin`, and anonymous
`anon`. Role values are lowercase in the database.

| Role | Read | Write |
| --- | --- | --- |
| `supplier` (ACTIVE) | Own profile, supplier, supply, batch, and quality history | Own supply rows only |
| `registration_clerk` (ACTIVE) | All suppliers, supply, batch, quality, QR, publication config; own profile | Creates `PENDING` suppliers and edits supplier master data but not approval fields; corrects batch master data within the batch-code year; creates QR and marks it ready through the controlled user-JWT RPCs; no direct QR, batch, quality, or publication write |
| `quality_staff` (ACTIVE) | All batches, quality, QR, publication config; own profile | Quality inserts; publication config inserts/updates |
| `management` (ACTIVE) | All suppliers, supply, batch, quality, QR, publication config; own profile | None |
| `admin` (ACTIVE) | Own profile, all suppliers, all audit rows, system config | Supplier approval fields and existing system config; no supplier insert, batch/quality/QR/publication write |
| `anon` | No table access | Only `public_verify(token)` |

Additional points:

- Pending/rejected/locked profiles do not pass the business-table policies.
  They can select their own profile row and the non-sensitive `aimags`/`sums`
  lookups if they somehow hold a JWT; they cannot read suppliers, supply,
  batches, quality, QR, publication, audit, or configuration rows.
- Supplier self-registration is a server-side `service_role` flow that creates
  `PENDING` supplier/profile rows. Browser JWTs have no supplier or profile
  `INSERT` policy, so a supplier cannot self-register an approved supplier, a
  profile, or an active login directly. An administrator cannot insert a
  supplier either.
- An active clerk's direct supplier insertion is constrained to `PENDING`, with
  `approved_by_id IS NULL` and `rejection_reason IS NULL`. A clerk cannot insert
  an already-approved supplier.
- Only an active administrator can move a `PENDING` supplier to `APPROVED` or
  `REJECTED`. The guard trigger blocks clerks from approval fields and requires
  the acting administrator as `approved_by_id`.
- Clerks cannot change supplier approval fields, batch status, `batch_code`,
  QR identity/token/destination, or quality history.
- Administrators cannot edit supplier master data, batch data, quality, QR, or
  publication configuration. They cannot read batch, quality, QR, or
  publication rows, and they cannot create suppliers directly. They can only
  move a supplier from `PENDING` to `APPROVED`/`REJECTED`, update existing
  `system_config` rows, and read audit rows.
- All listed business-table mutations are written by central
  `SECURITY DEFINER` audit triggers. Supplier name/phone/identity fields and
  free-text `rejection_reason`, profile lock counters, `lab_result`, QR
  token/URL/storage path, and `system_config.value` are omitted from audit
  detail.
- `batch_counter` has no authenticated policy. Only the numbering function and
  `service_role` reach it.
- `anon` and `authenticated` have no `CREATE` privilege on schema `public`.
  Existing table and sequence privileges are explicitly revoked from `PUBLIC`,
  `anon`, and `authenticated` before the intended grants. Function execute
  privileges are reviewed separately: no public function is executable by
  `PUBLIC`, and `anon` can execute only `public_verify(text)`.
- `ALTER DEFAULT PRIVILEGES` affects only future objects created by the named
  role and never rewrites existing ACLs. `pg_default_acl` may still be permissive
  for hosted owner roles, so future migrations must repeat the explicit
  revoke/grant pattern; see `docs/PHASE1_1_DECISIONS.md` section 3.1.
- Authenticated sequence `USAGE` is limited to `suppliers_id_seq`,
  `supply_info_id_seq`, and `quality_test_id_seq`, the three tables with direct
  identity-backed inserts. No business sequence has an authenticated `SELECT`
  grant.

## Validation status

Static checks:

- `pglast` 8.7 parsed the three original DDL files before the finalization
  migration: 48 statements in the schema file, 65 in the functions file, 84 in
  the RLS file.
- All PL/pgSQL/SQL function bodies in the original files parsed.
- No `ON DELETE CASCADE`, no `password_hash`, no MySQL syntax, no aimag/sum
  seed inserts.
- Every public function pins `search_path`; the reviewed `SECURITY DEFINER`
  set includes `app_role`, `app_status`, `auth_supplier_id`, `audit_row_change`,
  `create_batch`, `create_qr`, `mark_qr_ready`, `public_verify`,
  `quality_test_before_insert`, and `quality_test_after_insert`.

Behavioral checks (local only):

- All five migrations were applied in order to PGlite 0.5.16 (PostgreSQL WASM)
  using the local legacy backup, with mocked `auth.users`, `auth.uid()`, and
  `anon`/`authenticated`/`service_role` roles.
- `backend/tests/phase1-security.test.ts`: 47 passed, 0 failed.
- Backend Vitest suite on 2026-11-11: 66 passed, 0 failed across 5 files.
- Backend TypeScript typecheck: pass.
- Covered: cleanup of the legacy schema, batch numbering and rollback, year
  selection from `received_date`, same-year date correction and cross-year
  rejection, sequence overflow rejection before `lpad`, approved-supplier
  gating, clerk-only batch creation, authenticated actor binding and
  service-role active-clerk validation, clerk-created suppliers staying
  `PENDING`, admin-only approval/rejection, blocked direct supplier and profile
  self-registration, profile deletion and audit retention, RESTRICT foreign
  keys, quality insert-only history, controlled QR creation/readiness with no
  client token or timestamp, rejection of service-role QR calls without a user
  context, public QR whitelist and token privacy, function ACL/search_path,
  `PUBLIC`/`anon`/`authenticated` table and sequence privileges, RLS by all six
  actors, admin restrictions, supplier isolation, constraints, unique keys,
  schema privileges, audit coverage and sanitization, audit atomicity/recursion,
  and safe `tested_at` rename guards.

PGlite is **not** a Supabase local stack. The migrations have not been applied
to a live Supabase project. True concurrent batch-number allocation, PostgREST
JWT propagation, Supabase Storage, auth registration, supplier
self-registration, QR PNG upload, and API behavior remain untested until Docker
(the local stack) and a hosted database password are available.
Single-connection PGlite can prove rollback, sequence bounds, and numbering
logic, but not two-session lock contention.

## Phase 1.1 decisions

The full decision record is `docs/PHASE1_1_DECISIONS.md`. In summary:

- `suppliers` stays separate from `profiles`; `profiles.supplier_id` links a
  supplier login to supplier master data.
- Canonical roles are lowercase: `supplier`, `registration_clerk`,
  `quality_staff`, `management`, `admin`.
- Quality columns are `fineness_micron`, `clean_yield_pct`, `admixture_pct`,
  and `tested_at`. The public `impurityPct` key maps to `admixture_pct`.
- `batch.origin_sum_id` stays. `batch_supply_link` and batch-level animal
  counts are excluded from V1, so `animalCount` is not in the public catalog.
- Admin permissions are controlled: approval/rejection, profile/role
  management through Phase 2 functions, audit read, and existing system
  config. No direct supplier creation and no batch/quality/QR/publication
  read or write.
- Clerks register suppliers as `PENDING`; only an administrator approves or
  rejects them. Supplier self-registration remains a server-side `service_role`
  flow that inserts `PENDING` rows; it is never a browser table write.
- `MN-YYYY` comes from `received_date`, the sequence is bounded to `1..999999`,
  and only approved suppliers can receive batches. The code is immutable, so
  receipt-date corrections must stay within the same year.
- `PUBLIC`, `anon`, and `authenticated` are explicitly revoked from existing
  table and sequence privileges before the approved grants; function ACLs are
  handled separately.
- All relevant mutations are audited by central triggers, with sanitized
  detail and 100% coverage of the listed tables. Audit rows are append-only.
- Profiles cannot be hard-deleted; all profile references are `RESTRICT`.
- QR tokens and readiness are controlled by database RPCs; direct QR writes are
  removed.
- No aimag/sum rows are seeded without a verified official source. Import
  tooling and a mandatory provenance record are provided.
- `verificationStatus` remains `verified` to match the existing frontend mock.
  Architecture prose that says `published` is a documented conflict.

## Known limits

- Batch numbering concurrency is not proven under two real connections.
- Supplier self-registration and QR PNG upload are Phase 2 server work; only
  their database access boundaries are tested here.
- Authentication event auditing (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOCK`)
  belongs to the Phase 2 auth flow and is not covered by the table triggers.
- Hosted `pg_default_acl` contents are not inspected by the local tests. The
  explicit ACLs of the created objects are tested; a permissive default for a
  future object remains a deployment-time risk.
- The aimag/sum `\copy` loader was not executed because `psql` is absent. The
  validation/merge SQL was executed in PGlite.
- The public JSON keys follow the backend architecture catalog; the frontend
  mock uses different names, so Phase 2 needs an API mapping layer.
- Phase 2 auth UI, middleware, and APIs are intentionally not started.
- No remote Supabase operation was performed. Nothing was deployed.
