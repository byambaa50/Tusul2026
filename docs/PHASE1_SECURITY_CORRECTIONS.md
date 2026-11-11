# Phase 1 security and integrity corrections

**Date:** 2026-11-11 (review started 2026-11-10)
**Scope:** Local-only correction and verification of the CashmereTrace MN Phase 1
migrations and documentation. No hosted Supabase connection, deployment,
migration repair, reset, or remote SQL was performed.
**Status:** Corrections complete locally. The five migrations remain
**unapplied** to the remote project.

## 1. Modified files

| File | Change |
| --- | --- |
| `supabase/migrations/20261109000000_schema.sql` | Profile-referencing foreign keys changed to `ON DELETE RESTRICT`; batch-counter upper bound added; `animalCount` removed from the closed publish catalog; comments updated. |
| `supabase/migrations/20261109000100_functions.sql` | `create_batch()` requires an `APPROVED` supplier and rejects sequence overflow before `lpad()`; batch supplier-update guard; batch `received_date` must stay within the immutable `batch_code` year; actor-trust and QR auth-context comments; controlled `create_qr()` and `mark_qr_ready()` RPCs; QR identity/lifecycle guard; profile delete guard; narrower grants; supplier approval guard tightened. |
| `supabase/migrations/20261109000200_rls.sql` | Direct QR `INSERT`/`UPDATE` policies removed; clerk supplier inserts constrained to `PENDING` with null approval fields; table grants narrowed; table and sequence privileges revoked from `PUBLIC`, `anon`, and `authenticated`; sequence grants limited to the three identity-backed tables; `CREATE` on schema `public` revoked from `PUBLIC`, `anon`, and `authenticated`. |
| `supabase/migrations/20261109000300_phase1_1_finalization.sql` | Safe `test_date` -> `tested_at` rename guards; `animalCount` preflight; audit foreign key/counter hardening; final `create_batch()` with actor binding and no duplicate audit insert; assertion that no public function grants `EXECUTE` to `PUBLIC`; audit sanitization/actor corrections; `verificationStatus` comment. |
| `supabase/migrations/20261108000000_phase1_2_cleanup_legacy_schema.sql` | Unchanged; remains the first, guarded cleanup step. |
| `backend/tests/phase1-security.test.ts` | New PGlite harness that applies all five migrations against the local legacy backup and tests the corrected behavior. |
| `backend/package.json`, `backend/package-lock.json` | Added `@electric-sql/pglite@0.5.16` as a dev dependency. |
| `docs/PHASE1_1_DECISIONS.md` | Reconciled audit, RLS, QR, registration, numbering, FK, and verification records. |
| `docs/BACKEND_ARCHITECTURE_PLAN.md` | Reconciled QR RPCs, audit retention/sanitization, supplier registration, sequence privileges, catalog, and API notes. |
| `supabase/README.md` | Rewritten to describe the five-file order, corrected RPCs, grants, constraints, tests, and local-only status. |
| `docs/PHASE1_2_FINAL_REPORT.md` | Added a local-correction addendum; its remote inspection and “not applied” status remain unchanged. |
| `docs/PHASE1_SECURITY_CORRECTIONS.md` | This report. |

## 2. SQL corrections and reasons

### 2.1 Audit and profile deletion

**Problem:** actor references originally used `ON DELETE SET NULL`. Deleting a
profile would silently erase the actor from audit and business rows, defeating
the audit trail.

**Correction:** every foreign key that references `profiles` now uses
`ON DELETE RESTRICT`, including `suppliers.approved_by_id`,
`batch.registered_by_id`, `quality_test.created_by_id`,
`publish_config.updated_by_id`, `system_config.updated_by_id`, and
`audit_log.actor_id`. `profiles_reject_delete()` blocks hard deletion and
raises an error that directs operators to deactivate the profile through
`status`.

**Result:** a profile with any retained reference cannot be deleted; audit
attribution survives. Soft deactivation remains available.

### 2.2 Batch numbering and approval

**Problem:** `lpad()` truncates strings longer than six characters, so a
sequence of `1000000` could produce the same six-digit code as an earlier
batch. The original number range was also not explicitly bounded in the schema,
and batch creation did not check supplier approval.

**Correction:**

- The `batch_counter.sequence` check is bounded to `0..999999`.
- `create_batch()` rejects the next value when it is outside `1..999999`
  **before** calling `lpad()`.
- The supplier must exist and be `APPROVED`; `PENDING` and `REJECTED` suppliers
  cannot receive a batch.
- `guard_batch_update()` rejects changing a batch supplier to a non-approved
  supplier.
- The year is still derived from `p_received_date`; the counter remains locked
  with `FOR UPDATE` in the insert transaction.
- `batch_code` is immutable. `guard_batch_update()` requires
  `extract(year from NEW.received_date)` to equal the `YYYY` component of
  `OLD.batch_code` on every update. Same-year receipt-date corrections are
  allowed; cross-year corrections are rejected.
- `create_batch()` keeps `p_registered_by` tied to the verified session: with a
  user JWT, `auth.uid()` must equal it. A service-role call has
  `auth.uid() = NULL`, so Express must derive `p_registered_by` from the
  verified session and never from client input; the actor must still be an
  active `registration_clerk`.
- A failed batch insert rolls back the counter and the audit row.

### 2.3 One audit row per batch

**Problem:** the initial `create_batch()` body inserted a manual audit row while
the central audit trigger also wrote one, producing duplicate `CREATE batch`
rows.

**Correction:** the finalization migration replaces `create_batch()` without
the manual insert. The central `batch_audit_change` trigger is the only writer.
The final state has exactly one `CREATE batch` audit row per successful batch.

### 2.4 Controlled supplier self-registration

**Problem:** administrator supplier creation was broader than the approved
permission matrix, and a supplier must not be able to self-register an approved
record or an active profile from a browser JWT.

**Correction:**

- No authenticated role, including `admin`, has a supplier `INSERT` policy
  except an active `registration_clerk`.
- A clerk insert is constrained to `PENDING` with `approved_by_id IS NULL` and
  `rejection_reason IS NULL`. A clerk cannot insert an already-approved supplier.
- Only an active administrator may perform `PENDING -> APPROVED` or
  `PENDING -> REJECTED`; `guard_supplier_update()` blocks clerks from changing
  approval fields and requires an approval's `approved_by_id` to be the acting
  administrator.
- `profiles` has no authenticated `INSERT`/`UPDATE`/`DELETE` policy.
- Self-registration remains a Phase 2, server-side `service_role` flow that
  creates `PENDING` supplier/profile rows. It is not a browser table write.
- Tests prove that supplier and admin JWTs cannot insert suppliers or profiles,
  that clerk-created suppliers stay `PENDING`, and that only an admin can
  approve or reject.

### 2.5 RLS and privileges

**Problems:** direct QR `INSERT`/`UPDATE` policies allowed clients to choose
tokens and lifecycle fields; table grants were broader than the policies; and
`PUBLIC`/`anon`/`authenticated` could create objects in `public` on a project
with permissive defaults.

**Correction:**

- Removed direct `qr_code` `INSERT` and `UPDATE` policies and grants.
- Closed table privileges to only the verbs used by policies.
- Explicitly revoked all table and sequence privileges from `PUBLIC`, `anon`,
  and `authenticated` before granting the approved verbs. `PUBLIC` is included
  because every login inherits it.
- Authenticated sequence `USAGE` is granted only on `suppliers_id_seq`,
  `supply_info_id_seq`, and `quality_test_id_seq`; no business sequence has an
  authenticated `SELECT` grant.
- `CREATE` on schema `public` is revoked from `PUBLIC`, `anon`, and
  `authenticated`.
- Function `EXECUTE` is reviewed separately: no public function is executable by
  `PUBLIC`, and `anon` can execute only `public_verify(text)`. The finalization
  migration asserts the `PUBLIC` function ACL and documents that
  `ALTER DEFAULT PRIVILEGES` and `pg_default_acl` do not retroactively fix
  existing objects or defaults owned by another role.
- `audit_log` and `quality_test` remain append-only through triggers that also
  block `TRUNCATE`.

### 2.6 QR lifecycle and token security

**Problem:** the QR table previously accepted direct writes, including a
client-chosen token, URL, status, and `ready_at`.

**Correction:**

- `create_qr(p_batch_id)` is `SECURITY DEFINER`, requires an active
  `registration_clerk`, generates the token with `gen_random_uuid()`, derives
  the URL as `/verify/<token>`, and always inserts `CREATED` with
  `ready_at = NULL`.
- `mark_qr_ready(p_batch_id)` requires an active `registration_clerk`, locks the
  row, permits only `CREATED -> READY`, and lets the guard trigger assign
  `ready_at = now()`.
- The guard rejects token/batch/URL changes by authenticated callers, rejects
  `READY -> CREATED`, and ignores client timestamps.
- Both RPCs require `auth.uid()` and are called with the clerk's user-scoped
  JWT, not a service-role client. Service-role calls have no user context and are
  rejected by design; the auth and active-clerk checks must not be weakened.
- Audit detail omits token, URL, and storage path.

### 2.7 Audit coverage and sanitization

**Problems:** audit details could copy supplier reject reasons and other free
text; actor attribution could be lost or taken from an untrusted row; a deleted
row’s actor could be used for a `DELETE`; and the coverage was not centralized.

**Correction:**

- Ten central `SECURITY DEFINER` row triggers cover `aimags`, `sums`,
  `suppliers`, `profiles`, `supply_info`, `batch`, `quality_test` (insert),
  `qr_code`, `publish_config`, and `system_config`.
- Supplier `name`, `phone`, `identity_type`, `identity_code`, and
  `rejection_reason`; profile lock counters; `lab_result`; QR token/URL/storage
  path; and `system_config.value` are removed from snapshots.
- Actor fallback is limited to reviewed columns: profile id, supplier approval
  actor, batch registrar, quality recorder, and config updater. An approval
  update may use the new `approved_by_id`; a `DELETE` never uses the deleted
  row’s actor. Unresolved actors remain `NULL`.
- `audit_log` has no insert trigger; update/delete/truncate are rejected.
- Authentication event logging remains Phase 2 work.

### 2.8 `tested_at` rename safety

**Problem:** a blind rename would fail or corrupt data if the column was
already renamed, both names existed, or neither existed.

**Correction:** the finalization migration:

- does nothing when only `tested_at` exists;
- renames `test_date` when only that column exists;
- refuses to proceed when both columns exist;
- refuses to proceed when neither column exists;
- verifies the expected type before/after the rename.

### 2.9 `verificationStatus` consistency

**Problem:** the architecture prose used `published`, while the approved verify
UI and Phase 1.1 decision use `verified`; `published` is also a
`publish_config.status` value, so reusing it for the public response is
ambiguous.

**Correction:** the SQL function and documentation consistently return the
literal `verified`. `published` remains a publication status only.

### 2.10 Public catalog and privacy

**Problem:** `animalCount` remained in the catalog even though V1 has no
`batch_supply_link` or batch-level animal count, so it could be selected but
never emitted. The public whitelist also needs to reject unknown keys.

**Correction:** `animalCount` was removed from the closed catalog. The
finalization migration refuses to run if an existing `publish_config` row still
selects it. The public function returns only the remaining whitelist keys and
only when QR, publication, non-empty selection, and at least one non-null value
all hold. Tests verify no PII, internal ids, token, lab text, or storage path is
returned.

### 2.11 Migration safety

The cleanup migration retains its guarded approach: exact legacy shape
preflight, empty-table check, explicit foreign-key drops, explicit table drops,
no `DROP SCHEMA`, no `CASCADE`, no `TRUNCATE`, and a postflight check that
Supabase-managed schemas remain. The new static test rejects broad destructive
statements and verifies the five-file timestamp order. The test permits the
legitimate trigger clause `BEFORE TRUNCATE ON ...` and the identifier
`reject_*_truncate`, which are not `TRUNCATE` statements.

## 3. Test results

All tests are local. No remote database or Supabase API was contacted.

| Check | Result |
| --- | --- |
| `npm test` in `backend` | 66 passed, 0 failed, 5 files |
| `backend/tests/phase1-security.test.ts` | 47 passed, 0 failed |
| `npm run typecheck` in `backend` | Pass |
| Five migrations applied in order to PGlite 0.5.16 | Pass |
| Earlier external Phase 1.1 harness (2026-11-09) | 386 passed, 0 failed; not committed |

The committed security harness covers, among other checks:

- cleanup removes only the inventoried legacy objects;
- `received_date` drives the year and each year starts at `000001`;
- same-year batch date corrections are accepted and cross-year corrections are
  rejected;
- `999999` is the maximum and `1000000` is rejected before `lpad()`;
- a failed batch rolls back both the counter and the batch;
- `PENDING` and `REJECTED` suppliers cannot receive batches;
- only an active clerk can call `create_batch()`;
- a user JWT must match `p_registered_by`, while the service-role path still
  requires an active clerk;
- admin and supplier JWTs cannot insert suppliers; suppliers cannot insert
  profiles;
- clerk-created suppliers stay `PENDING` with null approval fields, and only an
  admin can approve or reject a pending supplier;
- profile hard deletion is blocked and audit rows cannot be updated;
- batch supplier changes to a `PENDING` supplier are rejected;
- supplier rejection reasons are sanitized and the acting admin is recorded;
- QR creation is RPC-only with a database token;
- service-role QR calls without a verified user context are rejected;
- client-supplied `READY`/`ready_at` is rejected;
- readiness is audited and `CREATED -> READY` is enforced;
- `animalCount` and unknown catalog keys are rejected;
- the public response contains only selected whitelist fields and no PII,
  internal ids, token, lab text, or storage path;
- quality inserts and the derived `TESTED` update are audited exactly once;
- quality history is append-only;
- one `CREATE batch` audit row is written, attributed to the clerk;
- sequence `USAGE` is limited to the three identity-backed tables;
- `PUBLIC`, `anon`, and `authenticated` have no direct table or sequence
  privileges beyond the explicit role grants, and no public function grants
  `EXECUTE` to `PUBLIC`;
- anonymous users have no table access and only `public_verify()`;
- `tested_at` rename is idempotent and fails safely when both or neither
  column exists.

## 4. Remaining risks

1. **No hosted application.** The five migrations have not been run against a
   real Supabase/PostgreSQL project. PGlite is a strong local harness but not a
   substitute for PostgREST, Auth, Storage, or the hosted extension/role setup.
2. **Concurrency is unproven.** PGlite is single-connection. The `FOR UPDATE`
   lock and unique `batch_code` guard are present, but true two-session lock
   contention was not tested. Docker and `psql` are unavailable here.
3. **Self-registration is not implemented.** The database denies browser
   supplier/profile writes and supports a service-role `PENDING` flow, but the
   Phase 2 registration service and its compensating Auth cleanup do not exist
   yet.
4. **Service-role trust boundary.** `service_role` bypasses RLS by design. The
   registration, approval-activation, and QR-storage services must remain
   server-only and must not accept client-chosen approval status or actor ids.
5. **QR PNG storage is not implemented.** `create_qr()` creates metadata and a
   relative URL. The Phase 2 service must generate and upload the private PNG,
   attach `storage_path`, and avoid exposing the token in logs.
6. **Default privileges may remain permissive.** The RLS migration revokes
   `CREATE` on `public` and narrows grants on the created objects, but the
   project-level `pg_default_acl` noted in the Phase 1.2 report can still affect
   future objects. A separate reviewed default-privilege hardening migration is
   advisable.
7. **Audit `actor_role` can be null.** A service-role call without a JWT may
   have an actor id from a reviewed row column but no resolvable role. The row
   is still written; role-level completeness is a Phase 2 concern.
8. **The cleanup migration is shape-specific.** It intentionally aborts if the
   remote catalog differs from the inspected legacy schema. Re-inventory before
   any approved deployment.
9. **The public JSON contract differs from the frontend mock.** Phase 2 needs an
   API mapping layer, and the public URL currently needs an origin prefix at the
   API layer.
10. **No physical backup/PITR.** The only rollback artifact is the local logical
    legacy backup. Hosted deployment approval must weigh that separately.

## 5. Final migration order

```text
20261108000000_phase1_2_cleanup_legacy_schema.sql
20261109000000_schema.sql
20261109000100_functions.sql
20261109000200_rls.sql
20261109000300_phase1_1_finalization.sql
```

The cleanup migration must run first. The four approved migrations follow in
timestamp order. No file was renamed or reordered.

## 6. Local-only confirmation

No remote Supabase operation was performed in this work:

- no `supabase link`, `db push`, `db reset`, `migration repair`, or remote SQL;
- no remote DDL or DML;
- no remote migration-history change;
- no secret value was read, printed, or written;
- no deployment was attempted.

This work did not verify or modify the remote state. The last documented remote
state is in `docs/PHASE1_2_FINAL_REPORT.md`: the legacy schema was present and
none of the five local migrations had been applied. Deployment requires separate
explicit approval.
