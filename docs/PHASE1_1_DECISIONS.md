# Phase 1.1 decisions and verification record

**Date:** 2026-11-09; security/integrity corrections completed 2026-11-11
**Scope:** Phase 1 database/architecture finalization only. No Phase 2 auth UI,
middleware, API, or frontend work is included.
**Implementation:** the local five-migration chain in `supabase/migrations/`
(cleanup, schema, functions, RLS, finalization). The 2026-11-11 review corrected
the schema, functions, RLS, and finalization migrations before any remote
application. The same review added the batch date/year guard, changed
clerk-created suppliers to `PENDING`, closed table/sequence privileges for
`PUBLIC`, and documented the service-role and QR authentication boundaries.
Nothing in this record was deployed or applied remotely.

## 1. The nine decisions

| # | Area | Decision | Implementation evidence |
| --- | --- | --- | --- |
| 1 | Supplier model | `suppliers` remains a separate table. A supplier login links through nullable, unique `profiles.supplier_id`. Supplier records can exist without an auth login. | `20261109000000_schema.sql`; `20261109000100_functions.sql` helper `auth_supplier_id()` |
| 2 | Roles | Canonical authorization values are lowercase: `supplier`, `registration_clerk`, `quality_staff`, `management`, `admin`. | Database check plus `backend/src/types/roles.ts`; RLS policies |
| 3 | Quality columns | Canonical columns are `fineness_micron`, `clean_yield_pct`, `admixture_pct`, and `tested_at`. `tested_at` is the laboratory/report date. History ordering stays `created_at DESC, id DESC`. | `20261109000300_phase1_1_finalization.sql` renames `test_date` to `tested_at` |
| 4 | Origin | Keep `batch.origin_sum_id` with its FK to `sums`. `batch_supply_link` and batch-level animal count are excluded from V1, and `animalCount` was removed from the public catalog. | Schema catalog check; no link table in the applied schema |
| 5 | Supplier approval | Registration clerks register suppliers as `PENDING` with no approver and no rejection reason. Only an active administrator may move a supplier `PENDING -> APPROVED` or `PENDING -> REJECTED`. Admin has no direct supplier creation and no batch/quality/QR/publication read or write. Supplier self-registration remains a server-side, service-role flow that creates a `PENDING` supplier/profile; it is never a browser insert. | `suppliers_insert_clerk`, `suppliers_update_admin`, and `guard_supplier_update()`; matrix in section 3 |
| 6 | Batch numbering | Format is `MN-YYYY-NNNNNN` (for example `MN-2026-000001`). `YYYY` is derived from `received_date`, not the database clock. The supplier must be `APPROVED`. The per-year counter is locked with `FOR UPDATE` in the insert transaction and is bounded to `1..999999` before `lpad()` formatting. `batch_code` is immutable, so `received_date` corrections are allowed only within the code's year; a cross-year correction is rejected. | `create_batch()` in the finalization migration; `guard_batch_update()` in the functions migration |
| 7 | Audit coverage | Every listed business mutation is audited by a central `SECURITY DEFINER` row trigger. Audit detail is sanitized and contains no secrets or unnecessary personal data. Audit rows are append-only; update, delete, and truncate are rejected. | `audit_row_change()` and ten audit triggers; append-only guard triggers |
| 8 | Reference data | No aimag/sum rows are seeded. Import template, validation/merge SQL, and a mandatory provenance record are provided. | `supabase/seed/` |
| 9 | Public status | `public_verify()` returns `verificationStatus: "verified"`, matching the existing frontend display. | `public_verify()` body; frontend `verify-page.tsx` |

## 2. Conflicts and resolutions

| Source | Conflict or ambiguity | Resolution |
| --- | --- | --- |
| Final plan/PDF data dictionary vs architecture plan | `test_date` vs `tested_at` | New migration renames the column to `tested_at`; the value is still the laboratory/report date. |
| Architecture plan section 3.10 | `impurity_pct`; public key is `impurityPct` | Applied database column is `admixture_pct`; `public_verify()` maps `impurityPct` from it. |
| Architecture plan naming | `quality_result`, `recorded_by` | Applied names are `quality_test`, `created_by_id`. This is a naming reconciliation, not a semantic change. |
| Architecture plan line 1102 | Says `verificationStatus` is `published` | Implementation and existing frontend expect `verified`. Documented conflict; no frontend change. |
| Architecture plan section 3.7 | Batch prefix/pad marked **UNCERTAIN**, example `B-...` | Phase 1.1 fixes the approved plan format `MN-YYYY-NNNNNN`. |
| Approved format | Which date supplies `YYYY` was undefined | Phase 1.1 uses `received_date`, a timezone-independent business date. Because `batch_code` is immutable, a later receipt-date correction must stay in the same year. |
| Architecture permission matrix | Administrator can create supplier records | Phase 1.1 keeps admin approval/rejection only; direct supplier creation by an admin is not granted. Registration clerks insert `PENDING` suppliers with `approved_by_id IS NULL` and `rejection_reason IS NULL`; only an active administrator may approve or reject a pending supplier. Supplier self-registration remains a service-role server flow that inserts `PENDING` rows and is not a browser insert. |
| BR-12 wording | BR-12 says a clerk- or administrator-created supplier is active immediately | The approved implementation requirement is clerk registration followed by administrator approval. A clerk-created supplier stays `PENDING` until an administrator approves it; the earlier “active immediately” reading is superseded. |
| Architecture plan section 3.9 | `batch_supply_link` included | Excluded from V1. Consequently `animalCount` is not emitted and was removed from the closed public catalog. |
| Architecture plan audit design | Only `create_batch` wrote audit rows in Phase 1 | Expanded to all listed mutations through central triggers. Supplier `rejection_reason` is treated as free text and omitted from audit detail. |
| QR API design | Clerk inserts/updates `qr_code` directly | Direct QR writes are not granted. `create_qr()` generates the token and relative URL server-side and always creates `CREATED`; `mark_qr_ready()` performs the audited `CREATED -> READY` transition with database-assigned `ready_at`. Both RPCs must be called with the clerk's user JWT, not a service-role client. |
| Service-role actor trust | A service-role RPC could carry an arbitrary actor id | `create_batch()` still requires the referenced profile to be an `ACTIVE registration_clerk`. When a user JWT is present, `auth.uid()` must equal `p_registered_by`. The service-role path is a server-only trust boundary: Express must derive `p_registered_by` from the verified session and never from client input. |
| Profile deletion | Foreign keys originally allowed `SET NULL` on actor references, which would erase audit attribution | All profile-referencing FKs use `ON DELETE RESTRICT`, and a trigger blocks hard profile deletion. Profiles are deactivated with `status`, preserving audit history. |
| Reference data | No authoritative dataset verified | Seed/import only; no fabricated rows. |

## 3. Administrator table permissions

`Limited` means the RLS policy alone permits the verb, but a guard trigger
restricts which columns may actually change.

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `aimags` | Yes | No | No | No |
| `sums` | Yes | No | No | No |
| `suppliers` | Yes, all | No; admin supplier creation is not granted | Limited: approval fields only, and status only from `PENDING` | No |
| `profiles` | Yes, all | No; Phase 2 controlled function required | No; Phase 2 controlled function required | No |
| `supply_info` | No | No | No | No |
| `batch` | No | No | No | No |
| `batch_counter` | No | No | No | No |
| `quality_test` | No | No | No | No |
| `qr_code` | No | No | No | No |
| `publish_config` | No | No | No | No |
| `audit_log` | Yes | No; triggers write rows | No | No |
| `system_config` | Yes | No; approved keys are seeded by migration/service role | Limited: existing keys only | No |

`create_batch()` additionally requires an active `registration_clerk` and an
`APPROVED` supplier, so an admin cannot create a batch through the RPC. Admin can
execute the public `public_verify()` function like any authenticated caller, but
that only returns fields already published for a QR token.

Supplier self-registration has no authenticated `INSERT` policy. The Phase 2
registration service uses `service_role` on the server to create the supplier
and profile as `PENDING`; a browser-issued JWT cannot create either row. An
active clerk's direct supplier insert must be `PENDING` with
`approved_by_id IS NULL` and `rejection_reason IS NULL`; a clerk cannot insert
an already-approved supplier. Only an active administrator may move a pending
supplier to `APPROVED` or `REJECTED`, and the guard trigger requires
`approved_by_id = auth.uid()` for an approval transition.

Authenticated table privileges are exactly the approved verbs listed above.
`PUBLIC` and `anon` have no table or sequence privilege at all. These are
explicit revokes, not inherited assumptions: every login inherits `PUBLIC`, so a
grant left on `PUBLIC` would defeat a revoke aimed only at `anon` and
`authenticated`.

Authenticated sequence privileges are deliberately narrow: `USAGE` is granted
only on `suppliers_id_seq`, `supply_info_id_seq`, and `quality_test_id_seq`,
because those tables have direct identity-backed inserts. `SELECT` is not
granted on any business sequence, and `batch_counter` remains reachable only
through `create_batch()` and `service_role`. `service_role` keeps its explicit
broad table and sequence grants for the trusted server boundary.

### 3.1 Privilege defaults and their limits

`ALTER DEFAULT PRIVILEGES` applies only to objects created later by the role and
target role named in the statement. It never rewrites the ACL of an existing
table, sequence, or function. `pg_default_acl` stores those defaults, but an
explicit object ACL in `pg_class.relacl` or `pg_proc.proacl` overrides the
default for that object. This migration chain therefore revokes current
privileges explicitly and does not try to rewrite hosted defaults, because the
default ACL may belong to `postgres`, `supabase_admin`, or another
Supabase-managed role. Every future migration that creates a table, sequence,
or function must repeat the explicit revoke/grant pattern. A deployment review
should inspect `pg_default_acl` for the actual migration-owner role rather than
assuming that revoking `PUBLIC` once is permanent protection.

## 4. Audit coverage

Every mutation below writes an append-only `audit_log` row. The row trigger is
`SECURITY DEFINER`, has a fixed `search_path`, and does not write to
`audit_log`, so there is no recursive trigger path. The write is in the same
transaction as the mutation, so a rollback removes both.

| Table | Audited operations | Action mapping | Detail treatment |
| --- | --- | --- | --- |
| `aimags` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Codes/names only |
| `sums` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Codes/names only |
| `suppliers` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `DELETE` | Omits `name`, `phone`, `identity_type`, `identity_code`, and free-text `rejection_reason`; keeps approval state only |
| `profiles` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Omits `failed_login_attempts`, `locked_at`, `locked_until` |
| `supply_info` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Business quantities/links only |
| `batch` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Keeps batch code, status, weight, supplier/origin; includes the derived `REGISTERED` → `TESTED` update |
| `quality_test` | INSERT only | `CREATE` | Omits free-text `lab_result`; keeps indicators and `tested_at` |
| `qr_code` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `READY`, `DELETE` | Omits token, URL, and storage path; creation and the `CREATED` → `READY` transition go through controlled RPCs |
| `publish_config` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `PUBLISH`, `UNPUBLISH`, `DELETE` | Published-field catalog and status only |
| `system_config` | INSERT, UPDATE, DELETE | `CREATE`, `UPDATE`, `DELETE` | Omits `value` |
| `audit_log` | None | — | Append-only; update/delete/truncate are rejected by triggers. It has no insert trigger, so no audit write can recurse |
| `batch_counter` | None directly | — | Counter changes are covered by the `CREATE batch` audit row in the same transaction |

Authentication outcomes (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOCK`) are not
table mutations and are not covered by these triggers. They belong to the
Phase 2 auth flow, which is not implemented in Phase 1.1.

Actor resolution:

1. A user request uses `auth.uid()` and reads `profiles.app_role`.
2. A trusted insert without a JWT falls back to the row's reviewed actor
   column: `profiles.id`, `suppliers.approved_by_id`, `batch.registered_by_id`,
   `quality_test.created_by_id`, or `publish_config.updated_by_id` /
   `system_config.updated_by_id`.
3. A supplier approval update without a JWT may use
   `suppliers.approved_by_id`; other updates do not inherit an actor from the
   changed row.
4. A `DELETE` is never attributed to the deleted row's actor column. If no
   authenticated actor exists, the audit row keeps `actor_id = NULL`.
5. A service-role call with no `auth.uid()` may use the known PostgREST role
   claim. If no actor can be resolved, the audit row is still written with
   `actor_id = NULL`; the actor is never taken from an untrusted payload.

### 4.1 Controlled QR lifecycle

- `create_qr(p_batch_id)` is `SECURITY DEFINER` and requires an active
  `registration_clerk`. It generates the token with `gen_random_uuid()`, derives
  the relative URL as `/verify/<token>`, and always inserts `CREATED` with
  `ready_at = NULL`. A client cannot choose the token, URL, status, or
  timestamp.
- `mark_qr_ready(p_batch_id)` is `SECURITY DEFINER`, requires an active
  `registration_clerk`, locks the QR row, and permits only
  `CREATED -> READY`. The `qr_code` guard assigns `ready_at` from the database
  clock; a client-supplied value is ignored.
- `authenticated` has only `SELECT` on `qr_code`. Direct `INSERT` and `UPDATE`
  are not granted and have no policy. The table owner and `service_role` remain
  bound by the identity/lifecycle guard trigger.
- **Authentication context:** the planned Express flow calls both QR RPCs with
  the clerk's user-scoped Supabase client, so `auth.uid()` is the verified JWT
  subject. They are not called with the service-role client. A service-role call
  has `auth.uid() = NULL` and is rejected before any role check. The backend must
  not set JWT claim variables manually or otherwise impersonate a user; that
  would defeat the database boundary.

### 4.2 Profile retention

- Every foreign key that references `profiles` uses `ON DELETE RESTRICT`.
  `audit_log.actor_id`, supplier approval actors, batch registrars, quality
  recorders, and config updaters therefore cannot be silently nulled by a
  profile deletion.
- `profiles_reject_delete()` blocks hard deletion and directs operators to
  deactivate the profile through `status`. Audit history stays attributable.

### 4.3 Trusted service-role boundary

The service-role key is server-only; a browser never receives it. It bypasses
RLS, so SQL must not rely on RLS as the only control for service-role calls.
`create_batch()` is the one Phase 1 RPC that accepts an explicit actor,
`p_registered_by`:

- The Express service must set `p_registered_by` from the authenticated
  request context after JWT verification (`req.user.userId` or equivalent). It
  must not accept this value from the request body, query string, or any other
  client-controlled input.
- With a user-scoped client, `auth.uid()` is present and the function rejects a
  mismatch, so the database binds the actor to the verified JWT.
- With a service-role client, `auth.uid()` is `NULL`. The database cannot
  distinguish one backend service caller from another, so the server-side
  service-role boundary is the trust anchor. Even on that path the referenced
  profile must exist and be an `ACTIVE registration_clerk`; the active-clerk
  validation is never relaxed.
- `create_batch()` writes the batch and its central audit row in the same
  transaction. The actor and role recorded by the audit trigger therefore come
  from the same validated profile.

The QR RPCs do not have a service-role fallback. If Express needs a service-role
client for an unrelated operation, it must still call `create_qr()` and
`mark_qr_ready()` through the user-scoped client so the clerk JWT remains the
authorization basis.

## 5. RLS coverage by actor

All policies also require `status = 'ACTIVE'` for the acting profile unless
noted. `aimags` and `sums` are readable by every authenticated actor; `anon`
has no table access.

| Actor | Read | Write |
| --- | --- | --- |
| `supplier` | Own profile, own supplier, own supply rows, own batches, quality for own batches | Own supply rows only |
| `registration_clerk` | Own profile; all suppliers, supply, batches, quality, QR, publication config | Insert `PENDING` suppliers; update supplier master data (never approval fields); update batch master data within the same batch year; create QR and mark it ready through the controlled user-JWT RPCs; no direct QR write, direct batch insert, quality write, publication write, or audit read |
| `quality_staff` | Own profile; all batches, quality, QR, publication config | Insert quality; insert/update publication config; no supplier, supply, or audit access |
| `management` | Own profile; all suppliers, supply, batches, quality, QR, publication config | None |
| `admin` | Own profile, all suppliers, all audit rows, system config | Approve or reject `PENDING` suppliers; existing system config keys; no batch/quality/QR/publication/supply access |
| `anon` | No table access | `public_verify(token)` only |

`batch_counter` has no authenticated policy. Only `create_batch()` and
`service_role` reach it. `anon` and `authenticated` also have no `CREATE`
privilege on schema `public`; object creation is a migration/service-role
operation. Sequence `USAGE` is limited to the three identity-backed tables that
have direct inserts, and no business sequence has an authenticated `SELECT`
grant. `PUBLIC` has no table or sequence privilege and no `EXECUTE` on any
public function; `anon` can execute only `public_verify(text)`.

## 6. Aimag/sum reference data

No rows were seeded. Sources checked on 2026-11-09:

- `https://www.nso.mn` was reachable, but no complete downloadable official
  aimag/sum list with a publication date was identified.
- `https://www.1212.mn` returned a transport error.
- `https://data.gov.mn` returned a transport error; `https://opendata.gov.mn`
  returned no usable content.
- `https://legalinfo.mn` was reachable but did not provide a confirmed current
  administrative-unit dataset.

The frontend mock `cashmeretrace/lib/mock/geo.ts` is explicitly not an official
source and must not be imported.

Files:

- `supabase/seed/aimag_sum_import_template.csv` — header-only template.
- `supabase/seed/aimag_sum_source.md` — publisher, URL, dates, checksum, and
  verifier record. Required before import.
- `supabase/seed/aimag_sum_import.sql` — psql wrapper with a temporary staging
  table and `\copy`.
- `supabase/seed/aimag_sum_merge.sql` — pure SQL validation and idempotent
  upsert. Tested in PGlite.

The merge rejects blank values, conflicting aimag names/codes, conflicting sum
names/codes inside one aimag, and exact duplicate rows. Re-running the same
import does not duplicate rows. The `\copy` step itself was not executed because
`psql` is not installed here.

## 7. Verification record

| Check | Result |
| --- | --- |
| All five migrations load in PGlite 0.5.16 | Pass |
| `backend/tests/phase1-security.test.ts` (full five-migration harness) | 47 passed, 0 failed |
| Earlier external Phase 1.1 PGlite harness (2026-11-09) | 386 passed, 0 failed; not committed |
| Backend TypeScript typecheck | Pass |
| Backend Vitest suite | 66 passed, 0 failed (5 files) |
| `backend/.env` ignored by Git | Pass (`backend/.gitignore`) |
| Root `.env` and `supabase/.env` ignored | Pass (root `.gitignore`) |
| `backend/.env.example` not ignored | Pass |
| Env variable names validated by Zod | Pass (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`) |

The committed security harness covers: cleanup of the legacy schema before the
approved migrations; year selection from `received_date`; same-year batch date
corrections and rejection of cross-year corrections; independent per-year
counters; sequence `1..999999` bounds and overflow rejection before `lpad()`;
rollback of a failed batch and its counter; approved-supplier gating; the
clerk-only batch RPC; authenticated actor binding and active-clerk validation on
the service-role boundary; clerk-created suppliers staying `PENDING` with null
approval fields; denial of clerk pre-approval; admin-only approval/rejection and
the `PENDING`-only transition; blocked direct supplier/profile
self-registration; profile delete protection and audit immutability; FK
`RESTRICT` behavior; audit sanitization (including `rejection_reason`),
single-row coverage, and actor attribution; `PUBLIC`, `anon`, and
`authenticated` table/sequence privileges; no `PUBLIC` function `EXECUTE` and
only `public_verify(text)` for `anon`; schema privileges; RLS for all six
actors; controlled QR creation/readiness with no client token or timestamp;
rejection of service-role QR calls without a verified user context; the public
whitelist and privacy; quality append-only history; and safe `tested_at` rename
guards. The earlier external harness additionally covered aimag/sum import
validation/idempotency.

Not tested here:

- Applying the migrations to a real Supabase/PostgreSQL project. No database
  password is configured (`[YOUR-PASSWORD]` remains in `backend/.env`).
- True two-session concurrency for batch numbering. PGlite is
  single-connection and cannot prove lock contention.
- PostgREST JWT propagation, Supabase Auth registration, Supabase Storage, and
  the real Express-to-Supabase client selection. The service-role supplier
  self-registration flow, `create_batch()` caller wiring, and QR PNG upload are
  Phase 2 work; only their database-side access boundaries are tested here.
- Hosted default ACLs. The local tests prove the explicit ACLs of the tested
  objects, not what `pg_default_acl` contains in a Supabase project.
- The psql `\copy` loader.
- Any Phase 2 API or UI behavior.

## 8. Environment configuration

- `backend/.env` is local-only and Git-ignored. It contains `SUPABASE_URL`,
  `SUPABASE_ANON_KEY` (the publishable key), and a `DATABASE_URL` whose password
  is still the literal placeholder `[YOUR-PASSWORD]`. No secret value is
  printed in this record.
- `backend/.env.example` contains safe placeholders only and is not ignored.
- The root `.gitignore` ignores `.env` and `.env.*` in every subdirectory and
  keeps `.env.example`.
- `backend/src/config/env.ts` validates `SUPABASE_URL` as a URL,
  `SUPABASE_ANON_KEY` as a non-empty string, and `DATABASE_URL` as a
  `postgres://` or `postgresql://` URL. All three are optional so the health
  route still boots without credentials.
- The API runtime does not connect with `DATABASE_URL`; it is reserved for
  manual migration tooling.

## 9. Phase 2 boundary

The following are intentionally **not** implemented and must wait for the next
phase: authentication UI, Express auth middleware, profile/role management
APIs, the service-role supplier self-registration/approval APIs, batch, quality,
QR/publication APIs, frontend integration, and any sign-off on the unverified
aimag/sum source. The database constraints and RLS boundaries that those APIs
must honor are in place and tested locally.
