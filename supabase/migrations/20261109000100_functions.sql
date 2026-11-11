-- CashmereTrace MN - Phase 1 functions and integrity triggers

-- Trusted identity helpers. These are SECURITY DEFINER so RLS policies can
-- read the caller's profile without recursive policy evaluation.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.app_role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.app_status()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.status from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.auth_supplier_id()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.supplier_id from public.profiles p where p.id = auth.uid()
$$;

-- Update the audit/display timestamp and keep immutable batch identity.
create or replace function public.guard_batch_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'batch id cannot be changed' using errcode = '42501';
  end if;

  if new.batch_code is distinct from old.batch_code then
    raise exception 'batch_code is immutable' using errcode = '42501';
  end if;

  -- MN-YYYY was allocated from received_date when the batch was created and
  -- batch_code can never change. A clerk may therefore correct the receipt date
  -- within the same year, but a cross-year correction would leave the immutable
  -- code claiming the wrong year. Check every update so pre-existing
  -- inconsistencies cannot persist silently.
  if extract(year from new.received_date)::integer
    <> substring(old.batch_code from 4 for 4)::integer then
    raise exception 'batch received_date year must match the year in batch_code'
      using errcode = '42501';
  end if;

  if new.registered_by_id is distinct from old.registered_by_id then
    raise exception 'registered_by_id cannot be changed' using errcode = '42501';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be changed' using errcode = '42501';
  end if;

  -- A clerk may correct the supplier on a batch, but the replacement must also
  -- satisfy the approved-supplier rule enforced by create_batch().
  if new.supplier_id is distinct from old.supplier_id
    and not exists (
      select 1
        from public.suppliers s
       where s.id = new.supplier_id
         and s.approval_status = 'APPROVED'
    ) then
    raise exception 'batch supplier must be APPROVED'
      using errcode = '42501';
  end if;

  -- Status is derived from quality history, not editable batch master data.
  -- The quality trigger updates it as SECURITY DEFINER, so app_role() there is
  -- quality_staff and this guard does not block the legitimate transition.
  if new.status is distinct from old.status
    and public.app_role() = 'registration_clerk' then
    raise exception 'registration clerks cannot change batch status'
      using errcode = '42501';
  end if;

  if old.status = 'TESTED' and new.status = 'REGISTERED' then
    raise exception 'batch status cannot return to REGISTERED' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Clerks may correct supplier master data but not approval fields.
-- Administrators may change approval fields only.
create or replace function public.guard_supplier_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  v_role := public.app_role();

  if new.id is distinct from old.id then
    raise exception 'supplier id cannot be changed' using errcode = '42501';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'supplier created_at cannot be changed' using errcode = '42501';
  end if;

  if v_role = 'registration_clerk' then
    if new.approval_status is distinct from old.approval_status
      or new.approved_by_id is distinct from old.approved_by_id
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'registration clerks cannot change supplier approval fields'
        using errcode = '42501';
    end if;
  elsif v_role = 'admin' then
    if new.approval_status is distinct from old.approval_status then
      if old.approval_status <> 'PENDING' then
        raise exception 'supplier approval status can only change from PENDING'
          using errcode = '42501';
      end if;

      if auth.uid() is not null
        and new.approved_by_id is distinct from auth.uid() then
        raise exception 'approved_by_id must be the acting administrator'
          using errcode = '42501';
      end if;
    elsif new.approved_by_id is distinct from old.approved_by_id
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'approval fields can only change with approval status'
        using errcode = '42501';
    end if;

    if new.name is distinct from old.name
      or new.supplier_type is distinct from old.supplier_type
      or new.phone is distinct from old.phone
      or new.sum_id is distinct from old.sum_id
      or new.identity_type is distinct from old.identity_type
      or new.identity_code is distinct from old.identity_code then
      raise exception 'administrators may only change supplier approval fields'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Supply records are mutable by their supplier, but their identity and
-- ownership are fixed after insert.
create or replace function public.guard_supply_info_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'supply_info id cannot be changed' using errcode = '42501';
  end if;

  if new.supplier_id is distinct from old.supplier_id then
    raise exception 'supply_info supplier_id cannot be changed' using errcode = '42501';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'supply_info created_at cannot be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Quality history is append-only even for privileged roles.
create or replace function public.reject_quality_test_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'quality_test is insert-only; add a new result instead'
    using errcode = '42501';
end;
$$;

-- The recording user comes from the JWT for ordinary requests. Service-role
-- callers may pass the user explicitly, but that user must be active quality staff.
create or replace function public.quality_test_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_status text;
begin
  if auth.uid() is not null and new.created_by_id is distinct from auth.uid() then
    raise exception 'created_by_id must match the authenticated user'
      using errcode = '42501';
  end if;

  select p.app_role, p.status
    into v_role, v_status
    from public.profiles p
   where p.id = new.created_by_id;

  if v_role is null
    or v_role <> 'quality_staff'
    or v_status <> 'ACTIVE' then
    raise exception 'only an active quality staff profile may record a result'
      using errcode = '42501';
  end if;

  -- created_at is the history-ordering key. Do not let a caller backdate or
  -- postdate a result; test_date remains the laboratory/display date.
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.quality_test_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.batch
     set status = 'TESTED'
   where id = new.batch_id
     and status = 'REGISTERED';

  return new;
end;
$$;

create or replace function public.publish_config_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.batch_id is distinct from old.batch_id then
      raise exception 'publish_config batch_id cannot be changed' using errcode = '42501';
    end if;
  end if;

  if auth.uid() is not null then
    new.updated_by_id := auth.uid();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.system_config_before_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.key is distinct from old.key then
    raise exception 'system_config key cannot be changed' using errcode = '42501';
  end if;

  if auth.uid() is not null then
    new.updated_by_id := auth.uid();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_qr_identity_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'qr id cannot be changed' using errcode = '42501';
  end if;

  if new.batch_id is distinct from old.batch_id then
    raise exception 'qr batch_id cannot be changed' using errcode = '42501';
  end if;

  if new.token is distinct from old.token then
    raise exception 'qr token cannot be changed' using errcode = '42501';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'qr created_at cannot be changed' using errcode = '42501';
  end if;

  -- The approved clerk update is limited to status and ready_at. A trusted
  -- service call may still attach a generated storage path.
  if auth.uid() is not null
    and (
      new.url is distinct from old.url
      or new.storage_path is distinct from old.storage_path
    ) then
    raise exception 'qr url and storage_path are immutable'
      using errcode = '42501';
  end if;

  if old.status = 'READY' and new.status = 'CREATED' then
    raise exception 'qr status cannot return to CREATED' using errcode = '42501';
  end if;

  -- ready_at is server-assigned evidence of the human scan test. A caller may
  -- request the CREATED -> READY transition, but it cannot supply or backdate
  -- the timestamp, and a later storage-path update cannot rewrite it.
  if old.status = 'CREATED' and new.status = 'READY' then
    new.ready_at := now();
  elsif old.status = 'READY' and new.status = 'READY' then
    new.ready_at := old.ready_at;
  else
    new.ready_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;

-- TRUNCATE bypasses row-level triggers, so append-only tables block it
-- explicitly. This applies even to a table owner or service role.
create or replace function public.reject_quality_test_truncate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'quality_test is insert-only; truncate is not allowed'
    using errcode = '42501';
end;
$$;

create or replace function public.reject_audit_log_truncate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'audit_log is append-only; truncate is not allowed'
    using errcode = '42501';
end;
$$;

-- Profiles are deactivated through status, never hard-deleted. This protects
-- both the auth link and every historical actor reference, including audit_log.
create or replace function public.reject_profile_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'profiles are deactivated with status, not deleted'
    using errcode = '42501';
end;
$$;

-- Atomic batch creation. The caller must be an active registration clerk.
-- The supplier must already be APPROVED: pending and rejected suppliers are not
-- eligible for a batch. The counter row is locked, the batch and its audit row
-- are written in the same transaction, and the unique batch_code constraint is
-- the final guard. The MN-YYYY year follows received_date.
--
-- Actor trust: p_registered_by is the verified session actor supplied by the
-- Express layer. It must never come from a request body or another
-- client-controlled value. When called with a user JWT, auth.uid() must equal
-- p_registered_by. A service_role call has auth.uid() = NULL and is accepted
-- only across the server-only service-role boundary; the backend must still
-- derive the UUID from the authenticated session and the function still
-- requires that profile to be an ACTIVE registration_clerk.
create or replace function public.create_batch(
  p_supplier_id bigint,
  p_weight_kg numeric,
  p_received_date date,
  p_origin_sum_id bigint,
  p_registered_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_year integer;
  v_sequence integer;
  v_batch_id bigint;
  v_batch_code varchar(50);
  v_actor_role text;
  v_actor_status text;
  v_supplier_status text;
begin
  if p_supplier_id is null or p_origin_sum_id is null or p_registered_by is null then
    raise exception 'supplier, origin sum, and registered_by are required'
      using errcode = '22004';
  end if;

  if p_received_date is null then
    raise exception 'received_date is required' using errcode = '22004';
  end if;

  if p_weight_kg is null
    or p_weight_kg <= 0
    or p_weight_kg = 'NaN'::numeric
    or p_weight_kg = 'Infinity'::numeric then
    raise exception 'weight_kg must be a finite value greater than zero'
      using errcode = '23514';
  end if;

  select p.app_role, p.status
    into v_actor_role, v_actor_status
    from public.profiles p
   where p.id = p_registered_by;

  if v_actor_role is null then
    raise exception 'actor profile not found' using errcode = '42501';
  end if;

  if auth.uid() is not null and auth.uid() <> p_registered_by then
    raise exception 'registered_by must match the authenticated user'
      using errcode = '42501';
  end if;

  if v_actor_role <> 'registration_clerk' or v_actor_status <> 'ACTIVE' then
    raise exception 'only an active registration clerk may create batches'
      using errcode = '42501';
  end if;

  select s.approval_status
    into v_supplier_status
    from public.suppliers s
   where s.id = p_supplier_id;

  if v_supplier_status is null then
    raise exception 'supplier not found' using errcode = '23503';
  end if;

  if v_supplier_status <> 'APPROVED' then
    raise exception 'supplier must be APPROVED before a batch can be created'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.sums s where s.id = p_origin_sum_id) then
    raise exception 'origin sum not found' using errcode = '23503';
  end if;

  v_year := extract(year from p_received_date)::integer;

  if v_year < 1 or v_year > 9999 then
    raise exception 'received_date year must fit MN-YYYY'
      using errcode = '22007';
  end if;

  insert into public.batch_counter (year, sequence)
  values (v_year, 0)
  on conflict (year) do nothing;

  select bc.sequence
    into v_sequence
    from public.batch_counter bc
   where bc.year = v_year
   for update;

  v_sequence := coalesce(v_sequence, 0) + 1;

  -- lpad() truncates strings longer than six characters. Reject exhaustion
  -- before formatting so MN-YYYY-1000000 can never become MN-YYYY-100000.
  if v_sequence < 1 or v_sequence > 999999 then
    raise exception 'batch sequence for year % is exhausted (maximum 999999)', v_year
      using errcode = '22003';
  end if;

  update public.batch_counter
     set sequence = v_sequence
   where year = v_year;

  v_batch_code := 'MN-' || v_year::text || '-' || lpad(v_sequence::text, 6, '0');

  insert into public.batch (
    batch_code,
    supplier_id,
    weight_kg,
    received_date,
    origin_sum_id,
    status,
    registered_by_id
  ) values (
    v_batch_code,
    p_supplier_id,
    p_weight_kg,
    p_received_date,
    p_origin_sum_id,
    'REGISTERED',
    p_registered_by
  )
  returning id into v_batch_id;

  insert into public.audit_log (
    action,
    entity,
    entity_id,
    actor_id,
    actor_role,
    detail
  ) values (
    'CREATE',
    'batch',
    v_batch_id::text,
    p_registered_by,
    v_actor_role,
    jsonb_build_object(
      'batchCode', v_batch_code,
      'supplierId', p_supplier_id
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code
  );
end;
$$;

comment on function public.create_batch(bigint, numeric, date, bigint, uuid) is
  'Trusted batch RPC. p_registered_by must be derived from a verified user session, never from client input; active-clerk validation is always enforced.';

-- Controlled QR creation. A clerk cannot insert qr_code directly: the token is
-- generated by the database, the URL is derived from that token, and the row is
-- always created in CREATED state with ready_at NULL. This prevents a client
-- from choosing a predictable token or skipping the readiness lifecycle.
--
-- Auth context: call this RPC with the clerk's user-scoped Supabase client so
-- auth.uid() is the verified JWT subject. A service_role client has
-- auth.uid() = NULL and is rejected by design. Do not relax the auth.uid() or
-- active-clerk checks and do not impersonate a user by setting JWT claims.
create or replace function public.create_qr(p_batch_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_status text;
  v_qr_id bigint;
  v_token text;
  v_url text;
begin
  if v_actor_id is null then
    raise exception 'authentication required to create a QR'
      using errcode = '42501';
  end if;

  if p_batch_id is null then
    raise exception 'batch is required' using errcode = '22004';
  end if;

  select p.app_role, p.status
    into v_actor_role, v_actor_status
    from public.profiles p
   where p.id = v_actor_id;

  if v_actor_role is null
    or v_actor_role <> 'registration_clerk'
    or v_actor_status <> 'ACTIVE' then
    raise exception 'only an active registration clerk may create a QR'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.batch b where b.id = p_batch_id) then
    raise exception 'batch not found' using errcode = '23503';
  end if;

  v_token := gen_random_uuid()::text;
  v_url := '/verify/' || v_token;

  begin
    insert into public.qr_code (batch_id, token, url, status, ready_at)
    values (p_batch_id, v_token, v_url, 'CREATED', null)
    returning id into v_qr_id;
  exception
    when unique_violation then
      raise exception 'a QR already exists for this batch'
        using errcode = '23505';
  end;

  return jsonb_build_object(
    'qr_id', v_qr_id,
    'token', v_token,
    'url', v_url,
    'status', 'CREATED'
  );
end;
$$;

-- Controlled CREATED -> READY transition. ready_at is assigned by the trigger
-- from the database clock; the caller cannot supply it.
--
-- Auth context: like create_qr(), this RPC must run with the clerk's
-- user-scoped Supabase client so auth.uid() is the verified JWT subject. A
-- service_role client has auth.uid() = NULL and is rejected by design.
create or replace function public.mark_qr_ready(p_batch_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_status text;
  v_qr_id bigint;
  v_qr_status text;
  v_ready_at timestamptz;
begin
  if v_actor_id is null then
    raise exception 'authentication required to mark a QR ready'
      using errcode = '42501';
  end if;

  if p_batch_id is null then
    raise exception 'batch is required' using errcode = '22004';
  end if;

  select p.app_role, p.status
    into v_actor_role, v_actor_status
    from public.profiles p
   where p.id = v_actor_id;

  if v_actor_role is null
    or v_actor_role <> 'registration_clerk'
    or v_actor_status <> 'ACTIVE' then
    raise exception 'only an active registration clerk may mark a QR ready'
      using errcode = '42501';
  end if;

  select qr.id, qr.status
    into v_qr_id, v_qr_status
    from public.qr_code qr
   where qr.batch_id = p_batch_id
   for update;

  if v_qr_id is null then
    raise exception 'QR not found for this batch' using errcode = 'P0002';
  end if;

  if v_qr_status <> 'CREATED' then
    raise exception 'QR is already READY' using errcode = '23514';
  end if;

  update public.qr_code
     set status = 'READY',
         ready_at = now()
   where id = v_qr_id
   returning ready_at into v_ready_at;

  return jsonb_build_object(
    'qr_id', v_qr_id,
    'status', 'READY',
    'ready_at', v_ready_at
  );
end;
$$;

-- Public QR verification. Returns only the closed whitelist catalog and only
-- when the QR is READY and the publication is PUBLISHED. Hidden, private, and
-- unknown tokens all return NULL. It never reads supplier identity, contact
-- details, audit rows, lab_result, storage paths, or internal ids.
--
-- animalCount is not in the V1 catalog because Phase 1 has no approved
-- batch_supply_link allocation table and therefore no valid source value.
create or replace function public.public_verify(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fields jsonb;
begin
  if p_token is null or length(p_token) = 0 or length(p_token) > 128 then
    return null;
  end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'batchNo', case when pc.published_fields ? 'batchNo' then b.batch_code end,
    'aimagName', case when pc.published_fields ? 'aimagName' then a.name end,
    'sumName', case when pc.published_fields ? 'sumName' then s.name end,
    'quantityKg', case when pc.published_fields ? 'quantityKg' then b.weight_kg end,
    'finenessMicron', case when pc.published_fields ? 'finenessMicron' then q.fineness_micron end,
    'cleanYieldPct', case when pc.published_fields ? 'cleanYieldPct' then q.clean_yield_pct end,
    'impurityPct', case when pc.published_fields ? 'impurityPct' then q.admixture_pct end,
    'testedAt', case when pc.published_fields ? 'testedAt' then q.test_date end,
    'verificationStatus', case when pc.published_fields ? 'verificationStatus' then 'verified' end
  ))
    into v_fields
    from public.qr_code qr
    join public.batch b on b.id = qr.batch_id
    join public.sums s on s.id = b.origin_sum_id
    join public.aimags a on a.id = s.aimag_id
    join public.publish_config pc on pc.batch_id = b.id
    left join lateral (
      select qt.fineness_micron, qt.clean_yield_pct, qt.admixture_pct, qt.test_date
        from public.quality_test qt
       where qt.batch_id = b.id
       order by qt.created_at desc, qt.id desc
       limit 1
    ) q on true
   where qr.token = p_token
     and qr.status = 'READY'
     and pc.status = 'PUBLISHED'
     and jsonb_typeof(pc.published_fields) = 'array'
     and jsonb_array_length(pc.published_fields) > 0;

  -- A selection whose values are all absent (for example testedAt selected for
  -- a batch with no quality row) returns no card rather than an empty object.
  if v_fields is null or v_fields = '{}'::jsonb then
    return null;
  end if;

  return v_fields;
end;
$$;

create trigger suppliers_guard_update
  before update on public.suppliers
  for each row execute function public.guard_supplier_update();

create trigger batch_guard_update
  before update on public.batch
  for each row execute function public.guard_batch_update();

create trigger supply_info_guard_update
  before update on public.supply_info
  for each row execute function public.guard_supply_info_update();

create trigger quality_test_guard_insert
  before insert on public.quality_test
  for each row execute function public.quality_test_before_insert();

create trigger quality_test_reject_update_delete
  before update or delete on public.quality_test
  for each row execute function public.reject_quality_test_mutation();

create trigger quality_test_reject_truncate
  before truncate on public.quality_test
  for each statement execute function public.reject_quality_test_truncate();

create trigger quality_test_mark_batch_tested
  after insert on public.quality_test
  for each row execute function public.quality_test_after_insert();

create trigger qr_code_guard_identity_update
  before update on public.qr_code
  for each row execute function public.guard_qr_identity_update();

create trigger publish_config_before_write
  before insert or update on public.publish_config
  for each row execute function public.publish_config_before_write();

create trigger system_config_before_update
  before update on public.system_config
  for each row execute function public.system_config_before_update();

create trigger audit_log_reject_update_delete
  before update or delete on public.audit_log
  for each row execute function public.reject_audit_log_mutation();

create trigger audit_log_reject_truncate
  before truncate on public.audit_log
  for each statement execute function public.reject_audit_log_truncate();

create trigger profiles_reject_delete
  before delete on public.profiles
  for each row execute function public.reject_profile_delete();

-- Function permissions. The public QR verifier is the only anonymous function.
-- Revoke from anon/authenticated explicitly as well as PUBLIC: a hosted
-- Supabase project may carry default privileges that grant function execute
-- to those roles at creation time.
revoke all on function public.is_valid_publish_fields(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_valid_publish_fields(jsonb)
  to authenticated, service_role;

revoke all on function public.app_role() from public, anon, authenticated;
revoke all on function public.app_status() from public, anon, authenticated;
revoke all on function public.auth_supplier_id() from public, anon, authenticated;
grant execute on function public.app_role() to authenticated, service_role;
grant execute on function public.app_status() to authenticated, service_role;
grant execute on function public.auth_supplier_id() to authenticated, service_role;

revoke all on function public.create_batch(bigint, numeric, date, bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.create_batch(bigint, numeric, date, bigint, uuid)
  to authenticated, service_role;

revoke all on function public.create_qr(bigint) from public, anon, authenticated;
revoke all on function public.mark_qr_ready(bigint) from public, anon, authenticated;
grant execute on function public.create_qr(bigint)
  to authenticated, service_role;
grant execute on function public.mark_qr_ready(bigint)
  to authenticated, service_role;

revoke all on function public.public_verify(text) from public, anon, authenticated;
grant execute on function public.public_verify(text) to anon, authenticated, service_role;

-- Trigger and guard functions are internal. They are not directly callable by
-- anonymous users; trigger execution still works for signed-in roles and the
-- trusted service role. SECURITY DEFINER trigger functions keep their own
-- search_path pin.
revoke all on function public.guard_batch_update() from public, anon, authenticated;
revoke all on function public.guard_supplier_update() from public, anon, authenticated;
revoke all on function public.guard_supply_info_update() from public, anon, authenticated;
revoke all on function public.reject_quality_test_mutation() from public, anon, authenticated;
revoke all on function public.quality_test_before_insert() from public, anon, authenticated;
revoke all on function public.quality_test_after_insert() from public, anon, authenticated;
revoke all on function public.publish_config_before_write() from public, anon, authenticated;
revoke all on function public.system_config_before_update() from public, anon, authenticated;
revoke all on function public.guard_qr_identity_update() from public, anon, authenticated;
revoke all on function public.reject_audit_log_mutation() from public, anon, authenticated;
revoke all on function public.reject_quality_test_truncate() from public, anon, authenticated;
revoke all on function public.reject_audit_log_truncate() from public, anon, authenticated;
revoke all on function public.reject_profile_delete() from public, anon, authenticated;

grant execute on function public.guard_batch_update() to authenticated, service_role;
grant execute on function public.guard_supplier_update() to authenticated, service_role;
grant execute on function public.guard_supply_info_update() to authenticated, service_role;
grant execute on function public.reject_quality_test_mutation() to authenticated, service_role;
grant execute on function public.quality_test_before_insert() to authenticated, service_role;
grant execute on function public.quality_test_after_insert() to authenticated, service_role;
grant execute on function public.publish_config_before_write() to authenticated, service_role;
grant execute on function public.system_config_before_update() to authenticated, service_role;
grant execute on function public.guard_qr_identity_update() to authenticated, service_role;
grant execute on function public.reject_audit_log_mutation() to authenticated, service_role;
grant execute on function public.reject_quality_test_truncate() to authenticated, service_role;
grant execute on function public.reject_audit_log_truncate() to authenticated, service_role;
grant execute on function public.reject_profile_delete() to authenticated, service_role;
