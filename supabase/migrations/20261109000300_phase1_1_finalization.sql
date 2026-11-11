-- CashmereTrace MN - Phase 1.1 finalization
--
-- This migration records the nine Phase 1.1 decisions without rewriting the
-- already-reviewed Phase 1 files:
--   1. suppliers stays a separate table (no schema change needed);
--   2. canonical roles are the lowercase values already enforced by
--      profiles.app_role_check;
--   3. quality column names are finished as fineness_micron,
--      clean_yield_pct, admixture_pct, tested_at;
--   4. batch.origin_sum_id stays and is protected by its existing FK;
--   5. batch_supply_link and batch-level animal counts stay out of V1;
--   6. the admin matrix keeps admin approval/settings/audit access and does
--      not grant batch, quality, QR, publication, or supplier-create writes;
--   7. MN-YYYY now comes from received_date, not current_date;
--   8. every relevant mutation is audited by row triggers;
--   9. no aimag/sum rows are seeded without a verified official source.
--
-- The file is written so the safe parts can be re-run: column/constraint
-- checks use catalog guards, functions use CREATE OR REPLACE, and triggers are
-- dropped before creation.

-- ---------------------------------------------------------------------------
-- 3. Quality column naming
-- ---------------------------------------------------------------------------
-- The approved data dictionary and final plan call this date test_date; the
-- backend architecture calls the canonical API/display field tested_at. The
-- meaning is unchanged: it is the laboratory/report date, not the history
-- ordering key. Existing history ordering remains created_at DESC, id DESC.
do $$
declare
  v_has_test_date boolean;
  v_has_tested_at boolean;
begin
  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'quality_test'
       and column_name = 'test_date'
  ) into v_has_test_date;

  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'quality_test'
       and column_name = 'tested_at'
  ) into v_has_tested_at;

  if v_has_test_date and v_has_tested_at then
    raise exception
      'Refusing quality_test rename: both test_date and tested_at exist; the correct column is ambiguous';
  elsif not v_has_test_date and not v_has_tested_at then
    raise exception
      'Refusing quality_test rename: neither test_date nor tested_at exists';
  elsif v_has_test_date then
    alter table public.quality_test rename column test_date to tested_at;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'quality_test'
       and column_name = 'tested_at'
       and data_type = 'date'
       and is_nullable = 'NO'
  ) then
    raise exception
      'Refusing quality_test finalization: tested_at must exist as a non-null date';
  end if;
end $$;

comment on column public.quality_test.tested_at is
  'Laboratory/report date. Not the latest-result ordering key; that is created_at DESC, id DESC.';

-- animalCount was removed from the V1 public catalog because no approved
-- batch-to-supply allocation relationship exists. Refuse to continue if an
-- earlier configuration still selects it, so the operator can review the row
-- instead of silently publishing nothing.
do $$
begin
  if exists (
    select 1
      from public.publish_config pc
     where pc.published_fields ? 'animalCount'
  ) then
    raise exception
      'Refusing finalization: publish_config still selects animalCount, which is not a valid V1 public field';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Aimag/sum reference-data integrity
-- ---------------------------------------------------------------------------
-- No rows are inserted. These checks make blank or malformed reference rows
-- impossible when the verified official import is eventually run.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.aimags'::regclass
       and conname = 'aimags_code_not_blank'
  ) then
    alter table public.aimags
      add constraint aimags_code_not_blank check (length(btrim(code)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.aimags'::regclass
       and conname = 'aimags_name_not_blank'
  ) then
    alter table public.aimags
      add constraint aimags_name_not_blank check (length(btrim(name)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.sums'::regclass
       and conname = 'sums_code_not_blank'
  ) then
    alter table public.sums
      add constraint sums_code_not_blank check (length(btrim(code)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.sums'::regclass
       and conname = 'sums_name_not_blank'
  ) then
    alter table public.sums
      add constraint sums_name_not_blank check (length(btrim(name)) > 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Audit coverage
-- ---------------------------------------------------------------------------
-- System-config keys are up to 100 characters. The original audit entity id
-- was 64, which could make a legitimate settings update fail. Keep the column
-- bounded but large enough for every audited key.
alter table public.audit_log
  alter column entity_id type varchar(128);

-- Reassert the append-only actor contract even when this migration is applied
-- over an earlier copy of the schema. SET NULL would require an UPDATE of
-- audit_log, which the append-only trigger always rejects.
alter table public.audit_log
  drop constraint if exists audit_log_actor_fkey;
alter table public.audit_log
  add constraint audit_log_actor_fkey foreign key (actor_id)
  references public.profiles (id) on update restrict on delete restrict;

-- Six-digit sequence ceiling. If an existing counter is already above the
-- limit this fails the migration for manual review instead of truncating a
-- batch code later.
alter table public.batch_counter
  drop constraint if exists batch_counter_sequence_check;
alter table public.batch_counter
  add constraint batch_counter_sequence_check
  check (sequence between 0 and 999999);

-- One central row-audit function. It derives the actor from the verified JWT
-- profile, never from a value supplied by the caller. Trusted inserts or
-- approval/update operations that cannot carry a JWT fall back to their own
-- reviewed actor column (registered_by_id, created_by_id, approved_by_id,
-- updated_by_id, or the profile id itself). A DELETE is never attributed to a
-- column on the row being deleted. If no actor is available the row is still
-- written with actor_id = NULL.
--
-- The detail is deliberately sanitized:
--   suppliers      -> no name, phone, identity_type, identity_code, or
--                     free-text rejection_reason (it can contain PII)
--   profiles       -> no lock counters/timestamps
--   quality_test   -> no free-text lab_result
--   qr_code        -> no token, url, storage_path
--   system_config  -> no value (settings may contain secrets)
-- This keeps the audit trail useful without copying personal data or secrets.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_action text;
  v_entity text;
  v_entity_id text;
  v_old jsonb;
  v_new jsonb;
  v_detail jsonb;
begin
  v_entity := tg_table_name;
  v_actor_id := auth.uid();

  if v_actor_id is not null then
    select p.app_role
      into v_actor_role
      from public.profiles p
     where p.id = v_actor_id;
  end if;

  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
  else
    v_new := to_jsonb(new);
    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
    end if;
  end if;

  -- Trusted inserts or approval updates may not have a JWT (for example a
  -- service-role setup or the atomic batch RPC). Use the row's reviewed actor
  -- column only where that column actually identifies the actor.
  if v_actor_id is null then
    if tg_op = 'INSERT' then
      case tg_table_name
        when 'profiles' then
          v_actor_id := new.id;
        when 'suppliers' then
          v_actor_id := new.approved_by_id;
        when 'batch' then
          v_actor_id := new.registered_by_id;
        when 'quality_test' then
          v_actor_id := new.created_by_id;
        when 'publish_config', 'system_config' then
          v_actor_id := new.updated_by_id;
        else
          v_actor_id := null;
      end case;
    elsif tg_op = 'UPDATE' then
      if tg_table_name = 'suppliers'
        and new.approval_status is distinct from old.approval_status then
        v_actor_id := new.approved_by_id;
      elsif tg_table_name in ('publish_config', 'system_config') then
        v_actor_id := new.updated_by_id;
      end if;
    end if;

    if v_actor_id is not null then
      select p.app_role
        into v_actor_role
        from public.profiles p
       where p.id = v_actor_id;
    end if;
  end if;

  -- PostgREST carries the role claim for service-role calls where auth.uid()
  -- is intentionally NULL. Accept only known claims; it is never taken from an
  -- ordinary table row.
  if v_actor_role is null then
    v_actor_role := case
      when current_setting('request.jwt.claim.role', true)
        in ('service_role', 'anon', 'authenticated')
      then current_setting('request.jwt.claim.role', true)
      else null
    end;
  end if;

  -- Sanitize the before/after snapshots before they reach audit_log.
  if tg_table_name = 'suppliers' then
    v_old := v_old - 'name' - 'phone' - 'identity_type' - 'identity_code'
      - 'rejection_reason';
    v_new := v_new - 'name' - 'phone' - 'identity_type' - 'identity_code'
      - 'rejection_reason';
  elsif tg_table_name = 'profiles' then
    v_old := v_old - 'failed_login_attempts' - 'locked_at' - 'locked_until';
    v_new := v_new - 'failed_login_attempts' - 'locked_at' - 'locked_until';
  elsif tg_table_name = 'quality_test' then
    v_old := v_old - 'lab_result';
    v_new := v_new - 'lab_result';
  elsif tg_table_name = 'qr_code' then
    v_old := v_old - 'token' - 'url' - 'storage_path';
    v_new := v_new - 'token' - 'url' - 'storage_path';
  elsif tg_table_name = 'system_config' then
    v_old := v_old - 'value';
    v_new := v_new - 'value';
  end if;

  -- Identify the affected row without exposing it in any public response.
  if tg_op = 'DELETE' then
    if tg_table_name = 'publish_config' then
      v_entity_id := old.batch_id::text;
    elsif tg_table_name = 'system_config' then
      v_entity_id := old.key;
    else
      v_entity_id := old.id::text;
    end if;
  else
    if tg_table_name = 'publish_config' then
      v_entity_id := new.batch_id::text;
    elsif tg_table_name = 'system_config' then
      v_entity_id := new.key;
    else
      v_entity_id := new.id::text;
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'CREATE';
  elsif tg_op = 'DELETE' then
    v_action := 'DELETE';
  else
    v_action := 'UPDATE';

    if tg_table_name = 'suppliers' then
      if old.approval_status = 'PENDING'
        and new.approval_status = 'APPROVED' then
        v_action := 'APPROVE';
      elsif old.approval_status = 'PENDING'
        and new.approval_status = 'REJECTED' then
        v_action := 'REJECT';
      end if;
    elsif tg_table_name = 'qr_code' then
      if old.status = 'CREATED' and new.status = 'READY' then
        v_action := 'READY';
      end if;
    elsif tg_table_name = 'publish_config' then
      if old.status = 'PRIVATE' and new.status = 'PUBLISHED' then
        v_action := 'PUBLISH';
      elsif old.status = 'PUBLISHED' and new.status = 'PRIVATE' then
        v_action := 'UNPUBLISH';
      end if;
    end if;
  end if;

  v_detail := jsonb_strip_nulls(
    jsonb_build_object(
      'old', v_old,
      'new', v_new
    )
  );

  insert into public.audit_log (
    action,
    entity,
    entity_id,
    actor_id,
    actor_role,
    detail
  ) values (
    v_action,
    v_entity,
    v_entity_id,
    v_actor_id,
    v_actor_role,
    v_detail
  );

  -- AFTER triggers ignore the return value. Returning NULL makes that clear.
  return null;
end;
$$;

comment on function public.audit_row_change() is
  'Central append-only audit writer for all Phase 1.1 business mutations.';

-- Drop/create makes the trigger set repeatable. The audit function itself does
-- not write to any audited table, so there is no recursive trigger path.
drop trigger if exists aimags_audit_change on public.aimags;
create trigger aimags_audit_change
  after insert or update or delete on public.aimags
  for each row execute function public.audit_row_change();

drop trigger if exists sums_audit_change on public.sums;
create trigger sums_audit_change
  after insert or update or delete on public.sums
  for each row execute function public.audit_row_change();

drop trigger if exists suppliers_audit_change on public.suppliers;
create trigger suppliers_audit_change
  after insert or update or delete on public.suppliers
  for each row execute function public.audit_row_change();

drop trigger if exists profiles_audit_change on public.profiles;
create trigger profiles_audit_change
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();

drop trigger if exists supply_info_audit_change on public.supply_info;
create trigger supply_info_audit_change
  after insert or update or delete on public.supply_info
  for each row execute function public.audit_row_change();

drop trigger if exists batch_audit_change on public.batch;
create trigger batch_audit_change
  after insert or update or delete on public.batch
  for each row execute function public.audit_row_change();

-- quality_test is insert-only. Its update/delete/truncate guards already raise
-- before an audit row could be written.
drop trigger if exists quality_test_audit_insert on public.quality_test;
create trigger quality_test_audit_insert
  after insert on public.quality_test
  for each row execute function public.audit_row_change();

drop trigger if exists qr_code_audit_change on public.qr_code;
create trigger qr_code_audit_change
  after insert or update or delete on public.qr_code
  for each row execute function public.audit_row_change();

drop trigger if exists publish_config_audit_change on public.publish_config;
create trigger publish_config_audit_change
  after insert or update or delete on public.publish_config
  for each row execute function public.audit_row_change();

drop trigger if exists system_config_audit_change on public.system_config;
create trigger system_config_audit_change
  after insert or update or delete on public.system_config
  for each row execute function public.audit_row_change();

-- Trigger functions are internal. Keep them callable by signed-in roles and
-- the trusted service role, and not by anonymous callers.
revoke all on function public.audit_row_change()
  from public, anon, authenticated;
grant execute on function public.audit_row_change()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Batch-number year basis
-- ---------------------------------------------------------------------------
-- The final plan fixes the MN-YYYY-000001 format but does not define which
-- date supplies YYYY. Phase 1.1 uses received_date because it is the business
-- receipt date and a DATE is timezone-independent. The per-year counter row is
-- still locked FOR UPDATE inside the same transaction as the batch insert.
-- Only APPROVED suppliers are eligible. The sequence must fit six digits before
-- lpad() runs, because lpad() truncates an oversized string. The audit row is
-- written by batch_audit_change, not by this function, so a create cannot
-- produce two audit rows.
--
-- Actor trust: p_registered_by must be derived by the Express layer from the
-- verified user session, never from a client-supplied body field. With a user
-- JWT, auth.uid() must match it. With a service_role call, auth.uid() is NULL
-- and the server-only service-role boundary is responsible for supplying the
-- verified UUID; the profile must still be an ACTIVE registration_clerk.
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

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code
  );
end;
$$;

comment on function public.create_batch(bigint, numeric, date, bigint, uuid) is
  'Trusted batch RPC. p_registered_by must be derived from a verified user session, never from client input; active-clerk validation is always enforced.';

revoke all on function public.create_batch(bigint, numeric, date, bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.create_batch(bigint, numeric, date, bigint, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3 (continued). Public QR function must use the renamed quality column
-- ---------------------------------------------------------------------------
-- The whitelist and privacy rules are unchanged. verificationStatus is the
-- literal 'verified'. That is the approved UI/API contract: the verify screen
-- renders the verified state, while 'published' remains the publish_config
-- status value and is not a verificationStatus value.
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
    'testedAt', case when pc.published_fields ? 'testedAt' then q.tested_at end,
    'verificationStatus', case when pc.published_fields ? 'verificationStatus' then 'verified' end
  ))
    into v_fields
    from public.qr_code qr
    join public.batch b on b.id = qr.batch_id
    join public.sums s on s.id = b.origin_sum_id
    join public.aimags a on a.id = s.aimag_id
    join public.publish_config pc on pc.batch_id = b.id
    left join lateral (
      select qt.fineness_micron, qt.clean_yield_pct, qt.admixture_pct, qt.tested_at
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

  if v_fields is null or v_fields = '{}'::jsonb then
    return null;
  end if;

  return v_fields;
end;
$$;

revoke all on function public.public_verify(text)
  from public, anon, authenticated;
grant execute on function public.public_verify(text)
  to anon, authenticated, service_role;

-- Function EXECUTE is a separate privilege surface from table/sequence
-- privileges and PostgreSQL grants it to PUBLIC by default at creation time.
-- Verify the explicit revokes above left no public function executable by
-- PUBLIC. anon and authenticated grants are intentionally narrower and are
-- asserted by the security tests; trigger functions remain non-entry points.
--
-- ALTER DEFAULT PRIVILEGES cannot repair this retroactively: it applies only to
-- future objects created by the role named in the statement, while pg_default_acl
-- stores defaults that an explicit ACL on an object overrides. Hosted Supabase
-- default ACLs are owner-role specific, so this migration checks the resulting
-- ACLs instead of rewriting defaults that may belong to Supabase-managed roles.
do $$
begin
  if exists (
    select 1
      from pg_proc p
      cross join lateral aclexplode(
        coalesce(p.proacl, acldefault('f', p.proowner))
      ) as acl
     where p.pronamespace = 'public'::regnamespace
       and p.prokind = 'f'
       and acl.grantee = 0
       and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception
      'Refusing finalization: a public function still grants EXECUTE to PUBLIC';
  end if;
end $$;
