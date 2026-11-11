import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
const legacyBackup = path.join(
  projectRoot,
  'backups',
  'phase1_2_20261110',
  'public_schema.sql',
);

const migrationFiles = [
  '20261108000000_phase1_2_cleanup_legacy_schema.sql',
  '20261109000000_schema.sql',
  '20261109000100_functions.sql',
  '20261109000200_rls.sql',
  '20261109000300_phase1_1_finalization.sql',
] as const;

const CLERK_ID = '11111111-1111-4111-8111-111111111111';
const QUALITY_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';
const MANAGEMENT_ID = '44444444-4444-4444-8444-444444444444';
const SUPPLIER_USER_ID = '55555555-5555-4555-8555-555555555555';
const PENDING_SUPPLIER_USER_ID = '66666666-6666-4666-8666-666666666666';
const CLERK_2_ID = '77777777-7777-4777-8777-777777777777';
const INACTIVE_CLERK_ID = '88888888-8888-4888-8888-888888888888';

let db: PGlite;
let legacyTableCountAfterCleanup = -1;
let approvedSupplierId = 0;
let pendingSupplierId = 0;
let rejectedSupplierId = 0;
let originSumId = 0;
let otherSumId = 0;
let batchId = 0;
let qrToken = '';
let qualityTestId = 0;

function migrationPath(name: string): string {
  return path.join(migrationsDir, name);
}

async function execMigration(name: string): Promise<void> {
  await db.exec(readFileSync(migrationPath(name), 'utf8'));
}

async function asRole<T>(
  role: 'anon' | 'authenticated' | 'service_role',
  userId: string | null,
  run: () => Promise<T>,
): Promise<T> {
  await db.exec('reset role');
  await db.query(
    `select set_config('request.jwt.claim.sub', $1, false),
            set_config('request.jwt.claim.role', $2, false)`,
    [userId ?? '', role],
  );
  await db.exec(`set role ${role}`);
  try {
    return await run();
  } finally {
    await db.exec('reset role');
    await db.query(
      `select set_config('request.jwt.claim.sub', '', false),
              set_config('request.jwt.claim.role', '', false)`,
    );
  }
}

function userIdFor(role: string): string {
  switch (role) {
    case 'registration_clerk':
      return CLERK_ID;
    case 'quality_staff':
      return QUALITY_ID;
    case 'management':
      return MANAGEMENT_ID;
    case 'admin':
      return ADMIN_ID;
    default:
      throw new Error(`No test user for ${role}`);
  }
}

async function asActingRole<T>(role: string, run: () => Promise<T>): Promise<T> {
  return asRole('authenticated', userIdFor(role), run);
}

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<Record<string, unknown>>(sql, params);
  const firstRow = result.rows[0];
  return Object.values(firstRow)[0] as T;
}

async function row<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<T>(sql, params);
  return result.rows[0] as T;
}

type Grantee = 'PUBLIC' | 'anon' | 'authenticated';

async function tablePrivileges(grantee: Grantee): Promise<Record<string, string[]>> {
  const result = await db.query<{ table_name: string; privilege_type: string }>(
    `select c.relname as table_name, acl.privilege_type
       from pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl, acldefault('r', c.relowner))
       ) as acl
      where c.relnamespace = 'public'::regnamespace
        and c.relkind = 'r'
        and acl.grantee = case
          when $1 = 'PUBLIC' then 0::oid
          else (select r.oid from pg_roles r where r.rolname = $1)
        end
      order by c.relname, acl.privilege_type`,
    [grantee],
  );

  const privileges: Record<string, string[]> = {};
  for (const entry of result.rows) {
    (privileges[entry.table_name] ??= []).push(entry.privilege_type);
  }
  return privileges;
}

async function sequencePrivileges(grantee: Grantee): Promise<Record<string, string[]>> {
  const result = await db.query<{ sequence_name: string; privilege_type: string }>(
    `select c.relname as sequence_name, acl.privilege_type
       from pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl, acldefault('S', c.relowner))
       ) as acl
      where c.relnamespace = 'public'::regnamespace
        and c.relkind = 'S'
        and acl.grantee = case
          when $1 = 'PUBLIC' then 0::oid
          else (select r.oid from pg_roles r where r.rolname = $1)
        end
      order by c.relname, acl.privilege_type`,
    [grantee],
  );

  const privileges: Record<string, string[]> = {};
  for (const entry of result.rows) {
    (privileges[entry.sequence_name] ??= []).push(entry.privilege_type);
  }
  return privileges;
}

async function functionsExecutableBy(grantee: Grantee): Promise<string[]> {
  const result = await db.query<{ function_name: string }>(
    `select p.pronamespace::regnamespace::text || '.' || p.oid::regprocedure::text
              as function_name
       from pg_proc p
       cross join lateral aclexplode(
         coalesce(p.proacl, acldefault('f', p.proowner))
       ) as acl
      where p.pronamespace = 'public'::regnamespace
        and p.prokind = 'f'
        and acl.privilege_type = 'EXECUTE'
        and acl.grantee = case
          when $1 = 'PUBLIC' then 0::oid
          else (select r.oid from pg_roles r where r.rolname = $1)
        end
      order by function_name`,
    [grantee],
  );
  return result.rows.map((entry) => entry.function_name);
}

async function bootstrap(): Promise<void> {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email varchar(255) not null unique
    );
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $fn$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    create schema storage;
    create table storage.objects (id text primary key);
    create schema vault;
    create schema realtime;
    create schema graphql;
    create schema graphql_public;
    create schema extensions;
  `);
}

async function seedUsersAndProfiles(): Promise<void> {
  await db.query(
    `insert into auth.users (id, email) values
      ($1, 'clerk@example.test'),
      ($2, 'quality@example.test'),
      ($3, 'admin@example.test'),
      ($4, 'management@example.test'),
      ($5, 'supplier@example.test'),
      ($6, 'pending@example.test'),
      ($7, 'clerk2@example.test'),
      ($8, 'inactive-clerk@example.test')`,
    [
      CLERK_ID,
      QUALITY_ID,
      ADMIN_ID,
      MANAGEMENT_ID,
      SUPPLIER_USER_ID,
      PENDING_SUPPLIER_USER_ID,
      CLERK_2_ID,
      INACTIVE_CLERK_ID,
    ],
  );

  await db.query(
    `insert into public.profiles (id, app_role, status) values
      ($1, 'registration_clerk', 'ACTIVE'),
      ($2, 'quality_staff', 'ACTIVE'),
      ($3, 'admin', 'ACTIVE'),
      ($4, 'management', 'ACTIVE'),
      ($5, 'registration_clerk', 'ACTIVE'),
      ($6, 'registration_clerk', 'PENDING')`,
    [CLERK_ID, QUALITY_ID, ADMIN_ID, MANAGEMENT_ID, CLERK_2_ID, INACTIVE_CLERK_ID],
  );

  await db.exec(`
    insert into public.aimags (code, name) values ('AR', 'Arkhangai');
    insert into public.sums (aimag_id, code, name)
      select id, 'TS', 'Tsenkher' from public.aimags where code = 'AR';
    insert into public.sums (aimag_id, code, name)
      select id, 'IK', 'Ikh-Tamir' from public.aimags where code = 'AR';
  `);

  originSumId = await scalar<number>(
    `select id from public.sums where code = 'TS'`,
  );
  otherSumId = await scalar<number>(
    `select id from public.sums where code = 'IK'`,
  );

  approvedSupplierId = await scalar<number>(
    `insert into public.suppliers
       (name, supplier_type, phone, sum_id, approval_status, approved_by_id)
     values ('Approved Supplier', 'HERDER', '+976-00000001', $1, 'APPROVED', $2)
     returning id`,
    [originSumId, CLERK_ID],
  );
  pendingSupplierId = await scalar<number>(
    `insert into public.suppliers
       (name, supplier_type, sum_id, approval_status)
     values ('Pending Supplier', 'COOPERATIVE', $1, 'PENDING')
     returning id`,
    [originSumId],
  );
  rejectedSupplierId = await scalar<number>(
    `insert into public.suppliers
       (name, supplier_type, sum_id, approval_status, rejection_reason)
     values ('Rejected Supplier', 'BUSINESS', $1, 'REJECTED', 'Rejected in test')
     returning id`,
    [originSumId],
  );

  await db.query(
    `insert into public.profiles (id, app_role, status, supplier_id) values
      ($1, 'supplier', 'ACTIVE', $2),
      ($3, 'supplier', 'PENDING', $4)`,
    [SUPPLIER_USER_ID, approvedSupplierId, PENDING_SUPPLIER_USER_ID, pendingSupplierId],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await bootstrap();

  // Reproduce the exact legacy public schema that the cleanup migration is
  // designed to remove. The backup is a local logical dump, not a remote call.
  await db.exec(readFileSync(legacyBackup, 'utf8'));
  await execMigration(migrationFiles[0]);

  legacyTableCountAfterCleanup = await scalar<number>(
    `select count(*)::int as count
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')`,
  );

  await execMigration(migrationFiles[1]);
  await execMigration(migrationFiles[2]);
  await execMigration(migrationFiles[3]);
  await execMigration(migrationFiles[4]);

  await seedUsersAndProfiles();
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe('migration safety', () => {
  it('keeps the five migrations in timestamp order and avoids broad destructive SQL', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    expect(files).toEqual([...migrationFiles]);

    for (const file of files) {
      const code = readFileSync(migrationPath(file), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.replace(/--.*$/, ''))
        .join('\n');
      expect(code, file).not.toMatch(/\bdrop\s+schema\b/i);
      expect(code, file).not.toMatch(/\bcascade\b/i);
      // Match a TRUNCATE statement, not trigger clauses (`before truncate on`)
      // or identifiers such as `reject_audit_log_truncate`.
      expect(code, file).not.toMatch(/^\s*truncate\s+(table\s+)?(only\s+)?(public\.)?/im);
      expect(code, file).not.toMatch(/^\s*(begin|commit)\s*;/im);
      expect(code, file).not.toMatch(/insert\s+into\s+public\.(aimags|sums)/i);
    }
  });
});

describe('migration cleanup and schema', () => {
  it('removes only the inventoried legacy public objects before the approved schema', () => {
    expect(legacyTableCountAfterCleanup).toBe(0);
  });

  it('keeps the canonical tested_at column and no test_date alias', async () => {
    const columns = await db.query<{ column_name: string }>(
      `select column_name
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'quality_test'
          and column_name in ('test_date', 'tested_at')
        order by column_name`,
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual(['tested_at']);
  });

  it('uses RESTRICT for every profile reference', async () => {
    const constraints = await db.query<{ conname: string; confdeltype: string }>(
      `select conname, confdeltype
         from pg_constraint
        where contype = 'f'
          and confrelid = 'public.profiles'::regclass
        order by conname`,
    );
    expect(constraints.rows.length).toBeGreaterThan(0);
    for (const constraint of constraints.rows) {
      expect(constraint.confdeltype, constraint.conname).toBe('r');
    }
  });
});

describe('batch numbering', () => {
  it('derives the year from received_date and starts each year at 000001', async () => {
    const codes = await asActingRole('registration_clerk', async () => {
      const result: string[] = [];
      for (const date of ['2024-12-31', '2025-01-01', '2026-06-01']) {
        const raw = await scalar<string>(
          `select public.create_batch($1, 10.500, $2::date, $3, $4)::text as body`,
          [approvedSupplierId, date, originSumId, CLERK_ID],
        );
        const body = JSON.parse(raw) as { batch_id: number; batch_code: string };
        if (date === '2026-06-01') {
          batchId = body.batch_id;
        }
        result.push(body.batch_code);
      }
      return result;
    });

    expect(codes).toEqual([
      'MN-2024-000001',
      'MN-2025-000001',
      'MN-2026-000001',
    ]);
  });

  it('allows a clerk to correct received_date within the batch code year', async () => {
    const updated = await asActingRole('registration_clerk', async () =>
      db.query(
        `update public.batch set received_date = '2026-07-15'::date where id = $1`,
        [batchId],
      ),
    );
    expect(updated.affectedRows).toBe(1);

    const stored = await row<{ batch_code: string; received_date: string }>(
      `select batch_code, received_date::text as received_date
         from public.batch
        where id = $1`,
      [batchId],
    );
    expect(stored.batch_code).toMatch(/^MN-2026-/);
    expect(stored.received_date).toBe('2026-07-15');
  });

  it('rejects a cross-year received_date correction on an existing batch', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `update public.batch set received_date = '2027-01-01'::date where id = $1`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/received_date year must match/);

    const stored = await scalar<string>(
      `select received_date::text as received_date from public.batch where id = $1`,
      [batchId],
    );
    expect(stored).toBe('2026-07-15');
  });

  it('rejects sequence 1000000 before lpad can truncate it', async () => {
    await db.query(
      `insert into public.batch_counter (year, sequence) values (2031, 999998)
       on conflict (year) do update set sequence = excluded.sequence`,
    );

    const last = await asActingRole('registration_clerk', async () =>
      scalar<string>(
        `select public.create_batch($1, 1.000, '2031-05-05'::date, $2, $3)::text as body`,
        [approvedSupplierId, originSumId, CLERK_ID],
      ),
    );
    expect((JSON.parse(last) as { batch_code: string }).batch_code).toBe(
      'MN-2031-999999',
    );

    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `select public.create_batch($1, 1.000, '2031-05-06'::date, $2, $3)`,
          [approvedSupplierId, originSumId, CLERK_ID],
        ),
      ),
    ).rejects.toThrow(/exhausted/);

    const count = await scalar<number>(
      `select count(*)::int as count from public.batch where batch_code like 'MN-2031-%'`,
    );
    expect(count).toBe(1);
  });

  it('uses a transaction-locked counter and rolls the counter back with the batch', async () => {
    const functionBody = await scalar<string>(
      `select prosrc from pg_proc where oid = 'public.create_batch(bigint,numeric,date,bigint,uuid)'::regprocedure`,
    );
    expect(functionBody).toMatch(/for update/i);

    await db.exec('begin');
    await db.query(
      `select set_config('request.jwt.claim.sub', $1, false),
              set_config('request.jwt.claim.role', 'authenticated', false)`,
      [CLERK_ID],
    );
    await db.query(
      `select public.create_batch($1, 2.000, '2032-02-02'::date, $2, $3)`,
      [approvedSupplierId, originSumId, CLERK_ID],
    );
    await db.exec('rollback');

    const counter = await scalar<number | null>(
      `select (select sequence from public.batch_counter where year = 2032) as sequence`,
    );
    const batches = await scalar<number>(
      `select count(*)::int as count from public.batch where batch_code like 'MN-2032-%'`,
    );
    expect(counter).toBeNull();
    expect(batches).toBe(0);
  });

  it('rejects batches for PENDING and REJECTED suppliers inside create_batch()', async () => {
    for (const supplierId of [pendingSupplierId, rejectedSupplierId]) {
      await expect(
        asActingRole('registration_clerk', async () =>
          db.query(
            `select public.create_batch($1, 1.000, '2027-01-01'::date, $2, $3)`,
            [supplierId, originSumId, CLERK_ID],
          ),
        ),
      ).rejects.toThrow(/APPROVED/);
    }
  });

  it('allows only an active registration clerk to execute create_batch()', async () => {
    await expect(
      asActingRole('admin', async () =>
        db.query(
          `select public.create_batch($1, 1.000, '2027-01-01'::date, $2, $3)`,
          [approvedSupplierId, originSumId, ADMIN_ID],
        ),
      ),
    ).rejects.toThrow(/registration clerk/);

    await expect(
      asRole('anon', null, async () =>
        db.query(`select public.create_batch($1, 1.000, '2027-01-01'::date, $2, $3)`, [
          approvedSupplierId,
          originSumId,
          CLERK_ID,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('binds an authenticated create_batch() call to auth.uid()', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `select public.create_batch($1, 1.000, '2027-01-01'::date, $2, $3)`,
          [approvedSupplierId, originSumId, CLERK_2_ID],
        ),
      ),
    ).rejects.toThrow(/registered_by must match the authenticated user/);
  });

  it('keeps active-clerk validation on the trusted service-role boundary', async () => {
    for (const actorId of [ADMIN_ID, INACTIVE_CLERK_ID]) {
      await expect(
        asRole('service_role', null, async () =>
          db.query(
            `select public.create_batch($1, 1.000, '2027-01-01'::date, $2, $3)`,
            [approvedSupplierId, originSumId, actorId],
          ),
        ),
      ).rejects.toThrow(/active registration clerk/);
    }
  });
});

describe('supplier and profile integrity', () => {
  it('does not allow a direct supplier insert as admin', async () => {
    await expect(
      asActingRole('admin', async () =>
        db.query(
          `insert into public.suppliers (name, supplier_type, sum_id, approval_status)
           values ('Admin Attempt', 'HERDER', $1, 'APPROVED')`,
          [otherSumId],
        ),
      ),
    ).rejects.toThrow(/row-level security|violates/);
  });

  it('does not let a supplier self-register a supplier or profile directly', async () => {
    for (const approvalStatus of ['PENDING', 'APPROVED']) {
      await expect(
        asRole('authenticated', SUPPLIER_USER_ID, async () =>
          db.query(
            `insert into public.suppliers (name, supplier_type, sum_id, approval_status)
             values ('Self Registered', 'HERDER', $1, $2)`,
            [otherSumId, approvalStatus],
          ),
        ),
      ).rejects.toThrow(/row-level security|permission denied/);
    }

    await expect(
      asRole('authenticated', SUPPLIER_USER_ID, async () =>
        db.query(
          `insert into public.profiles (id, app_role, status, supplier_id)
           values (gen_random_uuid(), 'supplier', 'ACTIVE', $1)`,
          [approvedSupplierId],
        ),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it('lets a clerk register a PENDING supplier with no approval fields', async () => {
    const inserted = await asActingRole('registration_clerk', async () =>
      row<{
        id: number;
        approval_status: string;
        approved_by_id: string | null;
        rejection_reason: string | null;
      }>(
        `insert into public.suppliers (name, supplier_type, sum_id)
         values ('Clerk Created', 'HERDER', $1)
         returning id, approval_status, approved_by_id::text, rejection_reason`,
        [otherSumId],
      ),
    );

    expect(inserted.id).toBeGreaterThan(0);
    expect(inserted.approval_status).toBe('PENDING');
    expect(inserted.approved_by_id).toBeNull();
    expect(inserted.rejection_reason).toBeNull();

    await expect(
      asActingRole('admin', async () =>
        db.query(
          `insert into public.profiles (id, app_role, status)
           values (gen_random_uuid(), 'admin', 'ACTIVE')`,
        ),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it('does not let a clerk create an already APPROVED supplier', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `insert into public.suppliers
             (name, supplier_type, sum_id, approval_status)
           values ('Clerk Preapproved', 'HERDER', $1, 'APPROVED')`,
          [otherSumId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);

    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `insert into public.suppliers
             (name, supplier_type, sum_id, approved_by_id)
           values ('Clerk Self Approved', 'HERDER', $1, $2)`,
          [otherSumId, CLERK_ID],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('allows only an admin to approve a pending supplier', async () => {
    const pendingId = await asActingRole('registration_clerk', async () =>
      scalar<number>(
        `insert into public.suppliers (name, supplier_type, sum_id)
         values ('Approval Queue Supplier', 'COOPERATIVE', $1)
         returning id`,
        [otherSumId],
      ),
    );

    for (const [approvalStatus, rejectionReason] of [
      ['APPROVED', null],
      ['REJECTED', 'Clerk should not reject'],
    ] as const) {
      await expect(
        asActingRole('registration_clerk', async () =>
          db.query(
            `update public.suppliers
                set approval_status = $1,
                    approved_by_id = $2,
                    rejection_reason = $3
              where id = $4`,
            [approvalStatus, CLERK_ID, rejectionReason, pendingId],
          ),
        ),
      ).rejects.toThrow(/cannot change supplier approval fields/);
    }

    const managementUpdate = await asActingRole('management', async () =>
      db.query(
        `update public.suppliers
            set approval_status = 'APPROVED', approved_by_id = $1
          where id = $2`,
        [MANAGEMENT_ID, pendingId],
      ),
    );
    expect(managementUpdate.affectedRows).toBe(0);

    const approved = await asActingRole('admin', async () =>
      db.query(
        `update public.suppliers
            set approval_status = 'APPROVED', approved_by_id = $1
          where id = $2`,
        [ADMIN_ID, pendingId],
      ),
    );
    expect(approved.affectedRows).toBe(1);

    const supplier = await row<{
      approval_status: string;
      approved_by_id: string;
      rejection_reason: string | null;
    }>(
      `select approval_status, approved_by_id::text as approved_by_id, rejection_reason
         from public.suppliers
        where id = $1`,
      [pendingId],
    );
    expect(supplier.approval_status).toBe('APPROVED');
    expect(supplier.approved_by_id).toBe(ADMIN_ID);
    expect(supplier.rejection_reason).toBeNull();

    const audit = await row<{ actor_id: string; action: string }>(
      `select actor_id::text as actor_id, action
         from public.audit_log
        where entity = 'suppliers'
          and entity_id = $1
          and action = 'APPROVE'
        order by id desc
        limit 1`,
      [String(pendingId)],
    );
    expect(audit.actor_id).toBe(ADMIN_ID);
    expect(audit.action).toBe('APPROVE');

    await expect(
      asActingRole('admin', async () =>
        db.query(
          `update public.suppliers
              set approval_status = 'REJECTED',
                  approved_by_id = $1,
                  rejection_reason = 'Cannot reverse an approval'
            where id = $2`,
          [ADMIN_ID, pendingId],
        ),
      ),
    ).rejects.toThrow(/only change from PENDING/);
  });

  it('blocks hard deletion of a profile and keeps its audit history immutable', async () => {
    await expect(
      db.query(`delete from public.profiles where id = $1`, [CLERK_ID]),
    ).rejects.toThrow(/deactivated with status/);

    await expect(
      db.query(`update public.audit_log set action = 'TAMPERED' where actor_id = $1`, [
        CLERK_ID,
      ]),
    ).rejects.toThrow(/append-only/);

    await expect(
      db.query(`delete from public.audit_log where actor_id = $1`, [CLERK_ID]),
    ).rejects.toThrow(/append-only/);

    await expect(db.exec('truncate public.audit_log')).rejects.toThrow(/append-only/);
  });

  it('rejects a batch supplier change to a PENDING supplier', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(`update public.batch set supplier_id = $1 where id = $2`, [
          pendingSupplierId,
          batchId,
        ]),
      ),
    ).rejects.toThrow(/must be APPROVED/);
  });

  it('sanitizes rejection_reason and records the acting admin', async () => {
    const updateResult = await asActingRole('admin', async () =>
      db.query(
        `update public.suppliers
            set approval_status = 'REJECTED',
                approved_by_id = $1,
                rejection_reason = 'Identity 1234567890 belongs to a private person'
          where id = $2`,
        [ADMIN_ID, pendingSupplierId],
      ),
    );
    expect(updateResult.affectedRows).toBe(1);

    const audit = await row<{ actor_id: string; detail: string }>(
      `select actor_id::text as actor_id, detail::text as detail
         from public.audit_log
        where entity = 'suppliers'
          and entity_id = $1
          and action = 'REJECT'
        order by id desc
        limit 1`,
      [String(pendingSupplierId)],
    );
    expect(audit.actor_id).toBe(ADMIN_ID);
    expect(audit.detail).not.toMatch(/rejection_reason/i);
    expect(audit.detail).not.toMatch(/1234567890/);
  });
});

describe('RLS and privileges', () => {
  it('denies anonymous table access and permits only public_verify()', async () => {
    await expect(
      asRole('anon', null, async () => db.query(`select count(*) from public.batch`)),
    ).rejects.toThrow(/permission denied/);

    const execute = await scalar<boolean>(
      `select has_function_privilege('anon', 'public.public_verify(text)', 'execute') as allowed`,
    );
    expect(execute).toBe(true);

    const internalFunction = await scalar<boolean>(
      `select has_function_privilege('anon', 'public.app_role()', 'execute') as allowed`,
    );
    expect(internalFunction).toBe(false);

    const tableAccess = await scalar<boolean>(
      `select has_table_privilege('anon', 'public.batch', 'select') as allowed`,
    );
    expect(tableAccess).toBe(false);

    const schemaCreate = await scalar<boolean>(
      `select has_schema_privilege('authenticated', 'public', 'create') as allowed`,
    );
    expect(schemaCreate).toBe(false);
  });

  it('revokes all PUBLIC and anon table and sequence privileges', async () => {
    expect(await tablePrivileges('PUBLIC')).toEqual({});
    expect(await tablePrivileges('anon')).toEqual({});
    expect(await sequencePrivileges('PUBLIC')).toEqual({});
    expect(await sequencePrivileges('anon')).toEqual({});
  });

  it('grants authenticated only the approved table privileges', async () => {
    expect(await tablePrivileges('authenticated')).toEqual({
      aimags: ['SELECT'],
      sums: ['SELECT'],
      suppliers: ['INSERT', 'SELECT', 'UPDATE'],
      profiles: ['SELECT'],
      supply_info: ['INSERT', 'SELECT', 'UPDATE'],
      batch: ['SELECT', 'UPDATE'],
      quality_test: ['INSERT', 'SELECT'],
      qr_code: ['SELECT'],
      publish_config: ['INSERT', 'SELECT', 'UPDATE'],
      audit_log: ['SELECT'],
      system_config: ['SELECT', 'UPDATE'],
    });
  });

  it('grants sequence USAGE only where a direct identity INSERT policy exists', async () => {
    expect(await sequencePrivileges('authenticated')).toEqual({
      suppliers_id_seq: ['USAGE'],
      supply_info_id_seq: ['USAGE'],
      quality_test_id_seq: ['USAGE'],
    });
  });

  it('keeps the service_role table and sequence grants', async () => {
    for (const table of [
      'aimags',
      'sums',
      'suppliers',
      'profiles',
      'supply_info',
      'batch_counter',
      'batch',
      'quality_test',
      'qr_code',
      'publish_config',
      'audit_log',
      'system_config',
    ]) {
      const allowed = await scalar<boolean>(
        `select has_table_privilege('service_role', $1, 'select,insert,update,delete') as allowed`,
        [`public.${table}`],
      );
      expect(allowed, table).toBe(true);
    }

    const sequenceAccess = await scalar<boolean>(
      `select bool_and(
         has_sequence_privilege('service_role', c.oid, 'usage,select')
       ) as allowed
         from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and c.relkind = 'S'`,
    );
    expect(sequenceAccess).toBe(true);
  });

  it('keeps PUBLIC off every function and gives anon only public_verify()', async () => {
    expect(await functionsExecutableBy('PUBLIC')).toEqual([]);
    expect(await functionsExecutableBy('anon')).toEqual(['public.public_verify(text)']);
  });

  it('keeps management read-only', async () => {
    const readable = await asActingRole('management', async () =>
      scalar<number>(`select count(*)::int as count from public.batch`),
    );
    expect(readable).toBeGreaterThan(0);

    await expect(
      asActingRole('management', async () =>
        db.query(
          `insert into public.supply_info
             (supplier_id, weight_kg, sum_id, livestock_count, declared_date)
           values ($1, 5.000, $2, 1, '2026-01-01')`,
          [approvedSupplierId, originSumId],
        ),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it('keeps admin away from batch, quality, QR, publication, and supplier creation', async () => {
    const batchRows = await asActingRole('admin', async () =>
      scalar<number>(`select count(*)::int as count from public.batch`),
    );
    expect(batchRows).toBe(0);

    const adminUpdate = await asActingRole('admin', async () =>
      db.query(`update public.batch set weight_kg = 99 where id = $1`, [batchId]),
    );
    expect(adminUpdate.affectedRows).toBe(0);

    const qualityRows = await asActingRole('admin', async () =>
      scalar<number>(`select count(*)::int as count from public.quality_test`),
    );
    expect(qualityRows).toBe(0);

    const qrRows = await asActingRole('admin', async () =>
      scalar<number>(`select count(*)::int as count from public.qr_code`),
    );
    expect(qrRows).toBe(0);

    const publicationRows = await asActingRole('admin', async () =>
      scalar<number>(`select count(*)::int as count from public.publish_config`),
    );
    expect(publicationRows).toBe(0);

    await expect(
      asActingRole('admin', async () =>
        db.query(
          `insert into public.publish_config (batch_id, published_fields, status)
           values ($1, '[]'::jsonb, 'PRIVATE')`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);

    await expect(
      asActingRole('admin', async () =>
        db.query(`select public.create_qr($1)`, [batchId]),
      ),
    ).rejects.toThrow(/registration clerk/);
  });

  it('lets an active supplier insert an identity-backed supply row of its own', async () => {
    const supplyId = await asRole('authenticated', SUPPLIER_USER_ID, async () =>
      scalar<number>(
        `insert into public.supply_info
           (supplier_id, weight_kg, sum_id, livestock_count, declared_date)
         values ($1, 12.500, $2, 8, '2026-05-01')
         returning id`,
        [approvedSupplierId, originSumId],
      ),
    );
    expect(supplyId).toBeGreaterThan(0);

    const ownSupply = await asRole('authenticated', SUPPLIER_USER_ID, async () =>
      scalar<number>(`select count(*)::int as count from public.supply_info`),
    );
    expect(ownSupply).toBe(1);
  });

  it('isolates suppliers to their own rows', async () => {
    const own = await asRole('authenticated', SUPPLIER_USER_ID, async () =>
      scalar<number>(`select count(*)::int as count from public.suppliers`),
    );
    expect(own).toBe(1);

    const otherBatch = await asRole('authenticated', PENDING_SUPPLIER_USER_ID, async () =>
      scalar<number>(`select count(*)::int as count from public.batch`),
    );
    expect(otherBatch).toBe(0);

    const pendingSupply = await asRole('authenticated', PENDING_SUPPLIER_USER_ID, async () =>
      scalar<number>(`select count(*)::int as count from public.supply_info`),
    );
    expect(pendingSupply).toBe(0);
  });

  it('denies direct QR and batch inserts, and quality writes outside quality staff', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `insert into public.qr_code (batch_id, token, url, status)
           values ($1, 'predictable-token', '/verify/predictable-token', 'READY')`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);

    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `insert into public.batch
             (batch_code, supplier_id, weight_kg, received_date, origin_sum_id, registered_by_id)
           values ('MN-2026-999999', $1, 1.000, '2026-01-01', $2, $3)`,
          [approvedSupplierId, originSumId, CLERK_ID],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);

    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `insert into public.quality_test
             (batch_id, fineness_micron, tested_at, created_by_id)
           values ($1, 15.5, '2026-01-02', $2)`,
          [batchId, CLERK_ID],
        ),
      ),
    ).rejects.toThrow(/row-level security|only an active quality/);
  });

  it('does not allow an authenticated user to insert audit rows directly', async () => {
    await expect(
      asActingRole('admin', async () =>
        db.query(
          `insert into public.audit_log (action, entity, entity_id, actor_id)
           values ('FORGED', 'batch', '1', $1)`,
          [ADMIN_ID],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });
});

describe('QR lifecycle and public whitelist', () => {
  it('rejects service-role QR calls that carry no verified user context', async () => {
    await expect(
      asRole('service_role', null, async () =>
        db.query(`select public.create_qr($1)`, [batchId]),
      ),
    ).rejects.toThrow(/authentication required/);

    await expect(
      asRole('service_role', null, async () =>
        db.query(`select public.mark_qr_ready($1)`, [batchId]),
      ),
    ).rejects.toThrow(/authentication required/);
  });

  it('creates a QR only through the controlled RPC with a database token', async () => {
    const created = await asActingRole('registration_clerk', async () =>
      scalar<string>(`select public.create_qr($1)::text as body`, [batchId]),
    );
    const body = JSON.parse(created) as { token: string; url: string; status: string };
    qrToken = body.token;
    expect(body.status).toBe('CREATED');
    expect(body.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.url).toBe(`/verify/${body.token}`);

    const qrRow = await row<{ status: string; ready_at: string | null }>(
      `select status, ready_at from public.qr_code where batch_id = $1`,
      [batchId],
    );
    expect(qrRow.status).toBe('CREATED');
    expect(qrRow.ready_at).toBeNull();
  });

  it('refuses a client-supplied READY status or ready_at', async () => {
    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(
          `update public.qr_code
              set status = 'READY', ready_at = '2000-01-01T00:00:00Z'
            where batch_id = $1`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it('requires the server-controlled readiness transition and audits it', async () => {
    await asActingRole('quality_staff', async () =>
      db.query(
        `insert into public.publish_config (batch_id, published_fields, status)
         values ($1, '["batchNo","verificationStatus"]'::jsonb, 'PUBLISHED')`,
        [batchId],
      ),
    );

    const beforeReady = await asRole('anon', null, async () =>
      scalar<string | null>(`select public.public_verify($1)::text as body`, [qrToken]),
    );
    expect(beforeReady).toBeNull();

    await expect(
      asActingRole('quality_staff', async () =>
        db.query(`select public.mark_qr_ready($1)`, [batchId]),
      ),
    ).rejects.toThrow(/registration clerk/);

    const ready = await asActingRole('registration_clerk', async () =>
      scalar<string>(`select public.mark_qr_ready($1)::text as body`, [batchId]),
    );
    const body = JSON.parse(ready) as { status: string; ready_at: string };
    expect(body.status).toBe('READY');
    expect(body.ready_at).not.toBeNull();

    const afterReady = await asRole('anon', null, async () =>
      scalar<string | null>(`select public.public_verify($1)::text as body`, [qrToken]),
    );
    expect(afterReady).not.toBeNull();

    await expect(
      asActingRole('registration_clerk', async () =>
        db.query(`select public.mark_qr_ready($1)`, [batchId]),
      ),
    ).rejects.toThrow(/already READY/);

    const audit = await scalar<number>(
      `select count(*)::int as count
         from public.audit_log
        where entity = 'qr_code'
          and action = 'READY'`,
    );
    expect(audit).toBe(1);
  });

  it('rejects animalCount and unknown keys in the publication whitelist', async () => {
    await expect(
      asActingRole('quality_staff', async () =>
        db.query(
          `insert into public.publish_config (batch_id, published_fields, status)
           values ($1, '["animalCount"]'::jsonb, 'PRIVATE')`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/publish_config_fields_check/);

    await expect(
      asActingRole('quality_staff', async () =>
        db.query(
          `insert into public.publish_config (batch_id, published_fields, status)
           values ($1, '["supplierName"]'::jsonb, 'PRIVATE')`,
          [batchId],
        ),
      ),
    ).rejects.toThrow(/publish_config_fields_check/);
  });
});

describe('quality history and audit coverage', () => {
  it('audits the quality insert and the derived batch status change exactly once', async () => {
    const inserted = await asActingRole('quality_staff', async () =>
      scalar<number>(
        `insert into public.quality_test
           (batch_id, fineness_micron, clean_yield_pct, admixture_pct, lab_result, tested_at, created_by_id)
         values ($1, 15.50, 88.25, 2.10, 'private lab note', '2026-06-02', $2)
         returning id`,
        [batchId, QUALITY_ID],
      ),
    );
    qualityTestId = inserted;

    const status = await scalar<string>(
      `select status from public.batch where id = $1`,
      [batchId],
    );
    expect(status).toBe('TESTED');

    const qualityAudit = await scalar<number>(
      `select count(*)::int as count
         from public.audit_log
        where entity = 'quality_test'
          and entity_id = $1
          and action = 'CREATE'`,
      [String(qualityTestId)],
    );
    expect(qualityAudit).toBe(1);

    const batchAudit = await scalar<number>(
      `select count(*)::int as count
         from public.audit_log
        where entity = 'batch'
          and entity_id = $1
          and action = 'UPDATE'
          and detail -> 'new' ->> 'status' = 'TESTED'`,
      [String(batchId)],
    );
    expect(batchAudit).toBe(1);

    const detail = await scalar<string>(
      `select detail::text from public.audit_log
        where entity = 'quality_test' and entity_id = $1`,
      [String(qualityTestId)],
    );
    expect(detail).not.toMatch(/private lab note/);
    expect(detail).not.toMatch(/lab_result/);
  });

  it('keeps quality_test append-only', async () => {
    await expect(
      db.query(`update public.quality_test set fineness_micron = 99 where id = $1`, [
        qualityTestId,
      ]),
    ).rejects.toThrow(/insert-only/);

    await expect(
      db.query(`delete from public.quality_test where id = $1`, [qualityTestId]),
    ).rejects.toThrow(/insert-only/);

    await expect(db.exec('truncate public.quality_test')).rejects.toThrow(/insert-only/);
  });

  it('writes exactly one batch audit row, attributed to the clerk, for create_batch()', async () => {
    const created = await asActingRole('registration_clerk', async () =>
      scalar<string>(
        `select public.create_batch($1, 3.000, '2028-03-03'::date, $2, $3)::text as body`,
        [approvedSupplierId, originSumId, CLERK_ID],
      ),
    );
    const body = JSON.parse(created) as { batch_id: number; batch_code: string };
    const count = await scalar<number>(
      `select count(*)::int as count
         from public.audit_log
        where entity = 'batch'
          and entity_id = $1
          and action = 'CREATE'`,
      [String(body.batch_id)],
    );
    const actor = await scalar<string>(
      `select actor_id::text as actor_id
         from public.audit_log
        where entity = 'batch'
          and entity_id = $1
          and action = 'CREATE'`,
      [String(body.batch_id)],
    );
    expect(count).toBe(1);
    expect(actor).toBe(CLERK_ID);
  });

  it('supports DELETE auditing for a table without protected history', async () => {
    const aimagId = await scalar<number>(
      `insert into public.aimags (code, name) values ('ZZ', 'Delete Test')
       returning id`,
    );
    await db.query(`delete from public.aimags where id = $1`, [aimagId]);

    const audit = await row<{ action: string; entity: string; entity_id: string }>(
      `select action, entity, entity_id
         from public.audit_log
        where entity = 'aimags'
          and entity_id = $1
        order by id desc
        limit 1`,
      [String(aimagId)],
    );
    expect(audit.action).toBe('DELETE');
    expect(audit.entity).toBe('aimags');
  });
});

describe('public verification', () => {
  it('returns only selected whitelist fields and no PII, internal id, token, lab text, or storage path', async () => {
    await asActingRole('quality_staff', async () =>
      db.query(
        `update public.publish_config
            set published_fields = '["batchNo","aimagName","sumName","quantityKg","finenessMicron","cleanYieldPct","impurityPct","testedAt","verificationStatus"]'::jsonb,
                status = 'PUBLISHED'
          where batch_id = $1`,
        [batchId],
      ),
    );

    await asRole('service_role', null, async () =>
      db.query(
        `update public.qr_code
            set storage_path = 'private/qr/batch-2026.png'
          where batch_id = $1`,
        [batchId],
      ),
    );

    const result = await asRole('anon', null, async () =>
      scalar<string | null>(`select public.public_verify($1)::text as body`, [qrToken]),
    );

    expect(result).not.toBeNull();
    const body = JSON.parse(result as string) as Record<string, unknown>;
    expect(body.batchNo).toMatch(/^MN-2026-/);
    expect(body.aimagName).toBe('Arkhangai');
    expect(body.sumName).toBe('Tsenkher');
    expect(Number(body.finenessMicron)).toBeCloseTo(15.5);
    expect(Number(body.cleanYieldPct)).toBeCloseTo(88.25);
    expect(Number(body.impurityPct)).toBeCloseTo(2.1);
    expect(body.testedAt).toBe('2026-06-02');
    expect(body.verificationStatus).toBe('verified');

    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/private lab note/);
    expect(serialized).not.toMatch(/private\/qr|storage_path/i);
    expect(serialized).not.toMatch(/token|supplierId|supplier_id|Approved Supplier/i);
    expect(serialized).not.toMatch(new RegExp(qrToken));
  });

  it('returns null before READY, when private, and for an unknown token', async () => {
    const hidden = await asRole('anon', null, async () =>
      scalar<string | null>(`select public.public_verify('not-a-real-token')::text as body`),
    );
    expect(hidden).toBeNull();
  });
});

describe('quality_test rename guard', () => {
  it('is idempotent when tested_at already exists', async () => {
    await expect(execMigration(migrationFiles[4])).resolves.toBeUndefined();
  });

  it('fails safely when both test_date and tested_at exist', async () => {
    await db.exec(`alter table public.quality_test rename column tested_at to test_date`);
    await db.exec(`alter table public.quality_test add column tested_at date`);
    await expect(execMigration(migrationFiles[4])).rejects.toThrow(/ambiguous/i);
  });

  it('fails safely when neither expected column exists', async () => {
    await db.exec(`alter table public.quality_test drop column test_date`);
    await db.exec(`alter table public.quality_test drop column tested_at`);
    await expect(execMigration(migrationFiles[4])).rejects.toThrow(/neither test_date nor tested_at/i);
  });
});
