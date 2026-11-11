-- CashmereTrace MN - Phase 1 Row Level Security policies and table privileges
--
-- Roles stored in profiles.app_role:
--   supplier, registration_clerk, quality_staff, management, admin
-- The public user has no profile and no table policy. Public access is only
-- through public.public_verify(text).

grant usage on schema public to anon, authenticated, service_role;
-- PUBLIC is the PostgreSQL pseudo-role inherited by every login. Revoking
-- CREATE only from anon/authenticated is insufficient because a PUBLIC grant
-- would still let either role shadow objects used by SECURITY DEFINER
-- functions. public must remain a data-only schema.
revoke create on schema public from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

-- No insert/update/delete policy. Profile creation and lockout are performed by
-- controlled functions in a later phase, not by browser-issued JWTs.

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create policy suppliers_select_own
  on public.suppliers
  for select
  to authenticated
  using (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and id = public.auth_supplier_id()
  );

create policy suppliers_select_clerk
  on public.suppliers
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy suppliers_select_management
  on public.suppliers
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

create policy suppliers_select_admin
  on public.suppliers
  for select
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

-- Clerks register suppliers; administrators approve or reject them. A
-- clerk-created supplier must therefore enter the approval queue as PENDING
-- with no approver and no rejection reason. A clerk cannot pre-approve a
-- supplier by inserting APPROVED directly. The only PENDING -> APPROVED and
-- PENDING -> REJECTED transitions are performed by an active administrator
-- through suppliers_update_admin and guard_supplier_update().
create policy suppliers_insert_clerk
  on public.suppliers
  for insert
  to authenticated
  with check (
    public.app_role() = 'registration_clerk'
    and public.app_status() = 'ACTIVE'
    and approval_status = 'PENDING'
    and approved_by_id is null
    and rejection_reason is null
  );

create policy suppliers_update_clerk
  on public.suppliers
  for update
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE')
  with check (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy suppliers_update_admin
  on public.suppliers
  for update
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE')
  with check (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

-- Admin supplier creation is not granted directly. The approved admin flow is
-- approval/rejection; FR-5.6 names the administrator, not a supplier-create
-- endpoint. A later service can use a controlled function if the supervisor
-- confirms the broader permission-matrix wording.

-- ---------------------------------------------------------------------------
-- supply_info
-- ---------------------------------------------------------------------------
create policy supply_info_select_own
  on public.supply_info
  for select
  to authenticated
  using (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and supplier_id = public.auth_supplier_id()
  );

create policy supply_info_insert_own
  on public.supply_info
  for insert
  to authenticated
  with check (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and supplier_id = public.auth_supplier_id()
  );

create policy supply_info_update_own
  on public.supply_info
  for update
  to authenticated
  using (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and supplier_id = public.auth_supplier_id()
  )
  with check (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and supplier_id = public.auth_supplier_id()
  );

create policy supply_info_select_clerk
  on public.supply_info
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy supply_info_select_management
  on public.supply_info
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

-- ---------------------------------------------------------------------------
-- batch
-- ---------------------------------------------------------------------------
create policy batch_select_own
  on public.batch
  for select
  to authenticated
  using (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and supplier_id = public.auth_supplier_id()
  );

create policy batch_select_clerk
  on public.batch
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy batch_select_quality
  on public.batch
  for select
  to authenticated
  using (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

create policy batch_select_management
  on public.batch
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

create policy batch_update_clerk
  on public.batch
  for update
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE')
  with check (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

-- No insert policy: batches are created only by public.create_batch(), which
-- checks caller role/status and allocates the unique code atomically.

-- ---------------------------------------------------------------------------
-- quality_test (insert-only history)
-- ---------------------------------------------------------------------------
create policy quality_test_select_supplier
  on public.quality_test
  for select
  to authenticated
  using (
    public.app_role() = 'supplier'
    and public.app_status() = 'ACTIVE'
    and exists (
      select 1
        from public.batch b
       where b.id = quality_test.batch_id
         and b.supplier_id = public.auth_supplier_id()
    )
  );

create policy quality_test_select_clerk
  on public.quality_test
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy quality_test_select_quality
  on public.quality_test
  for select
  to authenticated
  using (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

create policy quality_test_select_management
  on public.quality_test
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

create policy quality_test_insert_quality
  on public.quality_test
  for insert
  to authenticated
  with check (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

-- Deliberately no UPDATE or DELETE policy.

-- ---------------------------------------------------------------------------
-- qr_code
-- ---------------------------------------------------------------------------
create policy qr_code_select_clerk
  on public.qr_code
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy qr_code_select_quality
  on public.qr_code
  for select
  to authenticated
  using (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

create policy qr_code_select_management
  on public.qr_code
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

-- No INSERT or UPDATE policy. QR rows are created only by public.create_qr()
-- and moved to READY only by public.mark_qr_ready(). Both are SECURITY DEFINER
-- functions that require an active clerk, generate the token in the database,
-- and refuse a client-supplied status, ready_at, URL, or storage path.
--
-- No supplier policy and no anonymous policy. The identity columns remain
-- guarded by qr_code_guard_identity_update for trusted service-side updates
-- such as attaching the generated PNG storage path.

-- ---------------------------------------------------------------------------
-- publish_config
-- ---------------------------------------------------------------------------
create policy publish_config_select_clerk
  on public.publish_config
  for select
  to authenticated
  using (public.app_role() = 'registration_clerk' and public.app_status() = 'ACTIVE');

create policy publish_config_select_management
  on public.publish_config
  for select
  to authenticated
  using (public.app_role() = 'management' and public.app_status() = 'ACTIVE');

create policy publish_config_select_quality
  on public.publish_config
  for select
  to authenticated
  using (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

create policy publish_config_insert_quality
  on public.publish_config
  for insert
  to authenticated
  with check (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

create policy publish_config_update_quality
  on public.publish_config
  for update
  to authenticated
  using (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE')
  with check (public.app_role() = 'quality_staff' and public.app_status() = 'ACTIVE');

-- No supplier or anonymous policy. Published data is read only through
-- public.public_verify().

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

-- No insert/update/delete policy. Controlled SECURITY DEFINER functions write
-- audit rows; audit_log_reject_update_delete blocks later changes.

-- ---------------------------------------------------------------------------
-- system_config
-- ---------------------------------------------------------------------------
create policy system_config_select_admin
  on public.system_config
  for select
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

create policy system_config_update_admin
  on public.system_config
  for update
  to authenticated
  using (public.app_role() = 'admin' and public.app_status() = 'ACTIVE')
  with check (public.app_role() = 'admin' and public.app_status() = 'ACTIVE');

-- No insert policy until a setting key is approved and seeded. Version 1 has no
-- approved system-setting keys.

-- ---------------------------------------------------------------------------
-- aimags / sums (authenticated reference reads only)
-- ---------------------------------------------------------------------------
create policy aimags_select_authenticated
  on public.aimags
  for select
  to authenticated
  using (true);

create policy sums_select_authenticated
  on public.sums
  for select
  to authenticated
  using (true);

-- batch_counter has RLS enabled and no policy. Only the SECURITY DEFINER
-- create_batch() function reads or writes it.

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
-- Start from a closed state even when the hosting project carries permissive
-- default privileges, then grant only the verbs the policies can use. Revoke
-- PUBLIC explicitly: every login inherits PUBLIC, so revoking only anon and
-- authenticated would leave a PUBLIC grant effective. These statements revoke
-- only grants made to those three grantees; they do not remove the migration
-- owner's ownership rights or privileges held by Supabase-managed roles such as
-- authenticator, supabase_admin, or postgres. DELETE is not granted on any
-- business table. TRUNCATE is not granted either; the append-only tables
-- additionally guard it with triggers.
revoke all on all tables in schema public from public, anon, authenticated;

grant select on table public.aimags to authenticated;
grant select on table public.sums to authenticated;
grant select, insert, update on table public.suppliers to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update on table public.supply_info to authenticated;
grant select, update on table public.batch to authenticated;
grant select, insert on table public.quality_test to authenticated;
grant select on table public.qr_code to authenticated;
grant select, insert, update on table public.publish_config to authenticated;
grant select on table public.audit_log to authenticated;
grant select, update on table public.system_config to authenticated;

-- Sequence values are internal. Authenticated users need USAGE (not SELECT)
-- only for identity columns on tables where a row-level INSERT policy exists:
-- suppliers, supply_info, and quality_test. Batches, QR rows, profiles, audit
-- rows, and counters are inserted by SECURITY DEFINER functions whose owner
-- already has the required sequence privilege. PUBLIC and anonymous callers get
-- none. As with tables, revoke PUBLIC explicitly because every role inherits it.
revoke all on all sequences in schema public from public, anon, authenticated;
grant usage on sequence public.suppliers_id_seq to authenticated;
grant usage on sequence public.supply_info_id_seq to authenticated;
grant usage on sequence public.quality_test_id_seq to authenticated;

-- service_role is the trusted server boundary and retains the explicit broad
-- grants it needs. It bypasses RLS but remains subject to table constraints,
-- guard triggers, and the server-only rules documented in the architecture plan.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Function EXECUTE is handled separately in 20261109000100_functions.sql and
-- 20261109000300_phase1_1_finalization.sql: every public function is revoked
-- from PUBLIC, anon, and authenticated there and only the reviewed entry points
-- are granted back. PostgreSQL grants EXECUTE to PUBLIC by default when a
-- function is created, so table/sequence revokes must not be assumed to cover
-- functions.
--
-- Limits of defaults: ALTER DEFAULT PRIVILEGES affects only future objects
-- created by the role and target role named in that statement; it never changes
-- existing objects' ACLs. pg_default_acl stores those defaults, but an explicit
-- object ACL (pg_class.relacl or pg_proc.proacl) takes precedence for that
-- object. This migration therefore revokes current table/sequence grants
-- explicitly and the function migrations revoke EXECUTE explicitly. It does not
-- rewrite hosted default ACLs, because doing so for the wrong owner role could
-- alter Supabase-managed objects; future migrations must repeat the explicit
-- revoke/grant pattern for every new table, sequence, and function, and a
-- deployment check should inspect pg_default_acl for the role that runs
-- migrations.
