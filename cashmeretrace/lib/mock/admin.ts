/**
 * MOCK ADMINISTRATION (UC-12)
 *
 * Staff accounts, system settings and the audit log live in localStorage.
 * Supplier accounts stay in the existing supplier registry; this module only
 * changes their status (approve, reject, lock, activate) and never exposes
 * those actions outside the admin screens.
 *
 * There is no backend and no separate password store for staff. The shared
 * demo password remains the one already used on the sign-in screen.
 */
import { useSyncExternalStore } from "react";

import { DEMO_PASSWORD } from "@/lib/mock/credentials";
import { writeJson } from "@/lib/mock/storage";
import {
  allSuppliers,
  applySupplierStatus,
  createSupplier,
  duplicateSupplierExists,
  usernameTaken,
} from "@/lib/mock/suppliers";
import type { Role } from "@/lib/constants/nav";
import type { Supplier, SupplierStatus, SupplierType } from "@/lib/types/domain";

export const staffRoles = ["clerk", "quality", "management", "admin"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const accountStatuses = ["pending", "active", "rejected", "locked"] as const;

export interface StaffUser {
  /** USR-001 */
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: SupplierStatus;
  aimag: string;
  soum: string;
  registeredOn: string;
  updatedOn?: string;
  rejectReason?: string;
}

/** Directory row: a staff account or a supplier registry account. */
export interface DirectoryAccount {
  id: string;
  kind: "staff" | "supplier";
  name: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  status: SupplierStatus;
  aimag: string;
  soum: string;
  registeredOn: string;
  updatedOn?: string;
  rejectReason?: string;
  supplierType?: SupplierType;
}

export const auditActions = [
  "userCreate",
  "userRole",
  "userStatus",
  "supplierApprove",
  "supplierReject",
  "supplierLock",
  "supplierActivate",
  "settingsUpdate",
] as const;
export type AuditAction = (typeof auditActions)[number];

export interface AuditChange {
  /** status | role | rejectReason | maxFailedLoginAttempts | account */
  field: string;
  from: string | null;
  to: string | null;
}

export interface AuditEntry {
  /** AUD-YYYY-000001 */
  id: string;
  occurredAt: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  entity: "user" | "supplier" | "settings";
  entityId: string;
  entityLabel: string;
  changes: AuditChange[];
}

export interface AdminSettings {
  /** Documented sign-in threshold (security architecture §9.7). Demo does not count attempts. */
  maxFailedLoginAttempts: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** The signed-in demo administrator. Role/status of this record stay fixed so the demo can still sign in. */
export const DEMO_ADMIN_USERNAME = "admin";

export const DEMO_ADMIN_ACTOR = {
  id: "USR-004",
  name: "Мөнхбат Цэрэн",
  role: "admin" as const,
};

const DEFAULT_SETTINGS: AdminSettings = {
  maxFailedLoginAttempts: 5,
  updatedAt: null,
  updatedBy: null,
};

export const demoStaffUsers: StaffUser[] = [
  {
    id: "USR-001",
    name: "Энхтуяа Доржсүрэн",
    username: "clerk",
    email: "enkh.clerk@cashmeretrace.mn",
    phone: "99112201",
    role: "clerk",
    status: "active",
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    registeredOn: "2026-01-06",
  },
  {
    id: "USR-002",
    name: "Ганзориг Бат-Эрдэнэ",
    username: "quality",
    email: "ganzorig.lab@cashmeretrace.mn",
    phone: "99112202",
    role: "quality",
    status: "active",
    aimag: "Улаанбаатар",
    soum: "Хан-Уул",
    registeredOn: "2026-01-08",
  },
  {
    id: "USR-003",
    name: "Оюунчимэг Сүхбаатар",
    username: "management",
    email: "oyunchimeg.m@cashmeretrace.mn",
    phone: "99112203",
    role: "management",
    status: "active",
    aimag: "Улаанбаатар",
    soum: "Сүхбаатар",
    registeredOn: "2026-01-10",
  },
  {
    id: DEMO_ADMIN_ACTOR.id,
    name: DEMO_ADMIN_ACTOR.name,
    username: DEMO_ADMIN_USERNAME,
    email: "munkhbat.admin@cashmeretrace.mn",
    phone: "99112204",
    role: "admin",
    status: "active",
    aimag: "Улаанбаатар",
    soum: "Чингэлтэй",
    registeredOn: "2026-01-04",
  },
  {
    id: "USR-005",
    name: "Лхагвасүрэн Пүрэв",
    username: "lhagva.p",
    email: "lhagva.p@cashmeretrace.mn",
    phone: "99112205",
    role: "clerk",
    status: "locked",
    aimag: "Увс",
    soum: "Улаангом",
    registeredOn: "2026-04-16",
  },
];

export const demoAuditLog: AuditEntry[] = [
  {
    id: "AUD-2026-000001",
    occurredAt: "2026-02-21T01:20:00.000Z",
    actorName: DEMO_ADMIN_ACTOR.name,
    actorRole: "admin",
    action: "supplierReject",
    entity: "supplier",
    entityId: "SP-003",
    entityLabel: "Дамбадорж Ганбаатар",
    changes: [
      { field: "status", from: "pending", to: "rejected" },
      {
        field: "rejectReason",
        from: null,
        to: "Аймаг, сумын гарал газрын мэдээлэл бүртгэлийн баримттай таарахгүй тул татгалзлаа.",
      },
    ],
  },
  {
    id: "AUD-2026-000002",
    occurredAt: "2026-06-12T02:40:00.000Z",
    actorName: DEMO_ADMIN_ACTOR.name,
    actorRole: "admin",
    action: "userStatus",
    entity: "user",
    entityId: "USR-005",
    entityLabel: "Лхагвасүрэн Пүрэв",
    changes: [{ field: "status", from: "active", to: "locked" }],
  },
  {
    id: "AUD-2026-000003",
    occurredAt: "2026-08-02T03:05:00.000Z",
    actorName: DEMO_ADMIN_ACTOR.name,
    actorRole: "admin",
    action: "settingsUpdate",
    entity: "settings",
    entityId: "max_failed_login_attempts",
    entityLabel: "max_failed_login_attempts",
    changes: [{ field: "maxFailedLoginAttempts", from: "5", to: "5" }],
  },
];

const USERS_KEY = "ct.mock.admin.users";
const AUDIT_KEY = "ct.mock.admin.audit";
const SETTINGS_KEY = "ct.mock.admin.settings";
const USERS_EVENT = "ct:mock:admin-users-change";
const AUDIT_EVENT = "ct:mock:admin-audit-change";
const SETTINGS_EVENT = "ct:mock:admin-settings-change";

const EMPTY_STAFF: StaffUser[] = [];
const EMPTY_AUDIT: AuditEntry[] = [];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStoredStaff(): StaffUser[] {
  const parsed = readJson<unknown>(USERS_KEY, EMPTY_STAFF);
  return Array.isArray(parsed) ? (parsed as StaffUser[]) : EMPTY_STAFF;
}

function readStoredAudit(): AuditEntry[] {
  const parsed = readJson<unknown>(AUDIT_KEY, EMPTY_AUDIT);
  return Array.isArray(parsed) ? (parsed as AuditEntry[]) : EMPTY_AUDIT;
}

function mergeStaff(): StaffUser[] {
  const byId = new Map<string, StaffUser>();
  for (const user of demoStaffUsers) byId.set(user.id, user);
  for (const user of readStoredStaff()) byId.set(user.id, user);
  return [...byId.values()].sort(
    (a, b) => b.registeredOn.localeCompare(a.registeredOn) || a.name.localeCompare(b.name),
  );
}

function mergeAudit(): AuditEntry[] {
  const byId = new Map<string, AuditEntry>();
  for (const entry of demoAuditLog) byId.set(entry.id, entry);
  for (const entry of readStoredAudit()) byId.set(entry.id, entry);
  return [...byId.values()].sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id),
  );
}

export function allStaffUsers(): StaffUser[] {
  if (typeof window === "undefined") return [...demoStaffUsers];
  return mergeStaff();
}

export function allAuditEntries(): AuditEntry[] {
  if (typeof window === "undefined") {
    return [...demoAuditLog].sort(
      (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id),
    );
  }
  return mergeAudit();
}

export function readAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const parsed = readJson<Partial<AdminSettings> | null>(SETTINGS_KEY, null);
  if (!parsed || typeof parsed.maxFailedLoginAttempts !== "number") return DEFAULT_SETTINGS;
  return {
    maxFailedLoginAttempts: parsed.maxFailedLoginAttempts,
    updatedAt: parsed.updatedAt ?? null,
    updatedBy: parsed.updatedBy ?? null,
  };
}

export function isProtectedDemoAdmin(account: { username: string; role: Role }): boolean {
  return account.username === DEMO_ADMIN_USERNAME && account.role === "admin";
}

export function toDirectoryAccount(supplier: Supplier): DirectoryAccount {
  return {
    id: supplier.id,
    kind: "supplier",
    name: supplier.name,
    username: supplier.username,
    email: supplier.email,
    phone: supplier.phone,
    role: "supplier",
    status: supplier.status,
    aimag: supplier.aimag,
    soum: supplier.soum,
    registeredOn: supplier.registeredOn,
    updatedOn: supplier.updatedOn,
    rejectReason: supplier.rejectReason,
    supplierType: supplier.type,
  };
}

function staffToDirectory(user: StaffUser): DirectoryAccount {
  return {
    id: user.id,
    kind: "staff",
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    aimag: user.aimag,
    soum: user.soum,
    registeredOn: user.registeredOn,
    updatedOn: user.updatedOn,
    rejectReason: user.rejectReason,
  };
}

export function directoryAccounts(): DirectoryAccount[] {
  return [
    ...allStaffUsers().map(staffToDirectory),
    ...allSuppliers().map(toDirectoryAccount),
  ].sort(
    (a, b) => b.registeredOn.localeCompare(a.registeredOn) || a.name.localeCompare(b.name),
  );
}

export function directoryAccountById(id: string | null): DirectoryAccount | null {
  if (!id) return null;
  return directoryAccounts().find((account) => account.id === id) ?? null;
}

export function staffByUsername(username: string): StaffUser | null {
  const needle = username.trim().toLowerCase();
  if (!needle) return null;
  return (
    allStaffUsers().find((user) => user.username.toLowerCase() === needle) ?? null
  );
}

/**
 * Demo sign-in for a staff directory record. Returns the blocking status
 * when the password and role match but the account is not active.
 * Unknown usernames return null so the existing role-name check can run.
 */
export function staffSignIn(
  role: Role,
  username: string,
  password: string,
): { ok: true } | { ok: false; status: SupplierStatus } | null {
  const staff = staffByUsername(username);
  if (!staff) return null;
  if (password !== DEMO_PASSWORD || staff.role !== role) return null;
  if (staff.status !== "active") return { ok: false, status: staff.status };
  return { ok: true };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function directoryUsernameTaken(username: string): boolean {
  const needle = normalize(username);
  if (allStaffUsers().some((user) => user.username.toLowerCase() === needle)) return true;
  return usernameTaken(username);
}

export function directoryContactTaken(input: { phone: string; email: string }): boolean {
  const phone = input.phone.trim();
  const email = normalize(input.email);
  if (
    allStaffUsers().some(
      (user) => user.phone === phone || user.email.toLowerCase() === email,
    )
  ) {
    return true;
  }
  return duplicateSupplierExists(input);
}

function nextStaffId(list: StaffUser[]): string {
  const max = list.reduce((current, user) => {
    const match = /^USR-(\d+)$/.exec(user.id);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `USR-${String(max + 1).padStart(3, "0")}`;
}

function nextAuditId(list: AuditEntry[]): string {
  const year = new Date().getFullYear();
  const prefix = `AUD-${year}-`;
  const sequence =
    list.reduce((current, entry) => {
      if (!entry.id.startsWith(prefix)) return current;
      const value = Number(entry.id.slice(prefix.length));
      return Number.isInteger(value) ? Math.max(current, value) : current;
    }, 0) + 1;
  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

function appendAudit(entry: Omit<AuditEntry, "id" | "occurredAt" | "actorName" | "actorRole">) {
  const created: AuditEntry = {
    ...entry,
    id: nextAuditId(allAuditEntries()),
    occurredAt: new Date().toISOString(),
    actorName: DEMO_ADMIN_ACTOR.name,
    actorRole: DEMO_ADMIN_ACTOR.role,
  };
  writeJson(AUDIT_KEY, [...readStoredAudit(), created]);
  window.dispatchEvent(new Event(AUDIT_EVENT));
  return created;
}

function writeStaff(user: StaffUser, mode: "create" | "update") {
  const stored = readStoredStaff();
  const next =
    mode === "create"
      ? [...stored, user]
      : stored.some((entry) => entry.id === user.id)
        ? stored.map((entry) => (entry.id === user.id ? user : entry))
        : [...stored, user];
  writeJson(USERS_KEY, next);
  window.dispatchEvent(new Event(USERS_EVENT));
}

export function createStaffUser(draft: {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: "active" | "pending";
  aimag: string;
  soum: string;
}): StaffUser {
  if (directoryUsernameTaken(draft.username)) throw new Error("USERNAME_TAKEN");
  if (directoryContactTaken(draft)) throw new Error("DUPLICATE_CONTACT");

  const created: StaffUser = {
    id: nextStaffId(allStaffUsers()),
    name: draft.name.trim(),
    username: draft.username.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    role: draft.role,
    status: draft.status,
    aimag: draft.aimag,
    soum: draft.soum,
    registeredOn: todayIso(),
  };
  writeStaff(created, "create");
  appendAudit({
    action: "userCreate",
    entity: "user",
    entityId: created.id,
    entityLabel: created.name,
    changes: [
      { field: "account", from: null, to: created.role },
      { field: "status", from: null, to: created.status },
    ],
  });
  return created;
}

/** Admin-created supplier records are active immediately (BR-12). */
export function createSupplierAccount(draft: {
  name: string;
  username: string;
  email: string;
  phone: string;
  type: SupplierType;
  aimag: string;
  soum: string;
}): Supplier {
  if (directoryUsernameTaken(draft.username)) throw new Error("USERNAME_TAKEN");
  if (directoryContactTaken(draft)) throw new Error("DUPLICATE_CONTACT");

  const created = createSupplier({
    name: draft.name.trim(),
    username: draft.username.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    type: draft.type,
    aimag: draft.aimag,
    soum: draft.soum,
  });
  appendAudit({
    action: "userCreate",
    entity: "supplier",
    entityId: created.id,
    entityLabel: created.name,
    changes: [
      { field: "account", from: null, to: "supplier" },
      { field: "status", from: null, to: "active" },
    ],
  });
  return created;
}

export function assignStaffRole(id: string, role: StaffRole): StaffUser {
  const current = allStaffUsers().find((user) => user.id === id);
  if (!current) throw new Error("USER_NOT_FOUND");
  if (isProtectedDemoAdmin(current)) throw new Error("PROTECTED_ADMIN");
  if (current.role === role) return current;

  const updated: StaffUser = { ...current, role, updatedOn: todayIso() };
  writeStaff(updated, "update");
  appendAudit({
    action: "userRole",
    entity: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    changes: [{ field: "role", from: current.role, to: role }],
  });
  return updated;
}

export function setStaffStatus(id: string, status: SupplierStatus): StaffUser {
  const current = allStaffUsers().find((user) => user.id === id);
  if (!current) throw new Error("USER_NOT_FOUND");
  if (isProtectedDemoAdmin(current) && status !== "active") {
    throw new Error("PROTECTED_ADMIN");
  }
  if (current.status === status) return current;

  const updated: StaffUser = {
    ...current,
    status,
    rejectReason: status === "rejected" ? current.rejectReason : undefined,
    updatedOn: todayIso(),
  };
  writeStaff(updated, "update");
  appendAudit({
    action: "userStatus",
    entity: "user",
    entityId: updated.id,
    entityLabel: updated.name,
    changes: [{ field: "status", from: current.status, to: status }],
  });
  return updated;
}

export function approveSupplierAccount(id: string): Supplier {
  const current = allSuppliers().find((supplier) => supplier.id === id);
  if (!current) throw new Error("SUPPLIER_NOT_FOUND");
  const updated = applySupplierStatus(id, "active");
  appendAudit({
    action: "supplierApprove",
    entity: "supplier",
    entityId: updated.id,
    entityLabel: updated.name,
    changes: [{ field: "status", from: current.status, to: "active" }],
  });
  return updated;
}

export function rejectSupplierAccount(id: string, reason: string): Supplier {
  const current = allSuppliers().find((supplier) => supplier.id === id);
  if (!current) throw new Error("SUPPLIER_NOT_FOUND");
  const updated = applySupplierStatus(id, "rejected", reason);
  appendAudit({
    action: "supplierReject",
    entity: "supplier",
    entityId: updated.id,
    entityLabel: updated.name,
    changes: [
      { field: "status", from: current.status, to: "rejected" },
      { field: "rejectReason", from: current.rejectReason ?? null, to: reason.trim() },
    ],
  });
  return updated;
}

export function setSupplierAccountStatus(
  id: string,
  status: "active" | "locked",
): Supplier {
  const current = allSuppliers().find((supplier) => supplier.id === id);
  if (!current) throw new Error("SUPPLIER_NOT_FOUND");
  const updated = applySupplierStatus(id, status);
  appendAudit({
    action: status === "locked" ? "supplierLock" : "supplierActivate",
    entity: "supplier",
    entityId: updated.id,
    entityLabel: updated.name,
    changes: [{ field: "status", from: current.status, to: status }],
  });
  return updated;
}

export function saveAdminSettings(maxFailedLoginAttempts: number): AdminSettings {
  const current = readAdminSettings();
  if (current.maxFailedLoginAttempts === maxFailedLoginAttempts) return current;
  const next: AdminSettings = {
    maxFailedLoginAttempts,
    updatedAt: new Date().toISOString(),
    updatedBy: DEMO_ADMIN_ACTOR.name,
  };
  writeJson(SETTINGS_KEY, next);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
  appendAudit({
    action: "settingsUpdate",
    entity: "settings",
    entityId: "max_failed_login_attempts",
    entityLabel: "max_failed_login_attempts",
    changes: [
      {
        field: "maxFailedLoginAttempts",
        from: String(current.maxFailedLoginAttempts),
        to: String(maxFailedLoginAttempts),
      },
    ],
  });
  return next;
}

let staffSig = "";
let staffCache: StaffUser[] = demoStaffUsers;
let auditSig = "";
let auditCache: AuditEntry[] = demoAuditLog;
let settingsSig = "";
let settingsCache: AdminSettings = DEFAULT_SETTINGS;

function getStaffSnapshot(): StaffUser[] {
  const list = allStaffUsers();
  const sig = list.map((user) => `${user.id}:${user.role}:${user.status}:${user.updatedOn ?? ""}`).join("|");
  if (sig !== staffSig) {
    staffSig = sig;
    staffCache = list;
  }
  return staffCache;
}

function getAuditSnapshot(): AuditEntry[] {
  const list = allAuditEntries();
  const sig = list.map((entry) => entry.id).join("|");
  if (sig !== auditSig) {
    auditSig = sig;
    auditCache = list;
  }
  return auditCache;
}

function getSettingsSnapshot(): AdminSettings {
  const settings = readAdminSettings();
  const sig = `${settings.maxFailedLoginAttempts}:${settings.updatedAt ?? ""}`;
  if (sig !== settingsSig) {
    settingsSig = sig;
    settingsCache = settings;
  }
  return settingsCache;
}

const serverStaff = (): StaffUser[] => demoStaffUsers;
const serverAudit = (): AuditEntry[] => demoAuditLog;
const serverSettings = (): AdminSettings => DEFAULT_SETTINGS;

function subscribeStore(eventName: string) {
  return (callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(eventName, callback);
    };
  };
}

const subscribeStaff = subscribeStore(USERS_EVENT);
const subscribeAudit = subscribeStore(AUDIT_EVENT);
const subscribeSettings = subscribeStore(SETTINGS_EVENT);

export function useStaffUsers(): StaffUser[] {
  return useSyncExternalStore(subscribeStaff, getStaffSnapshot, serverStaff);
}

export function useAuditLog(): AuditEntry[] {
  return useSyncExternalStore(subscribeAudit, getAuditSnapshot, serverAudit);
}

export function useAdminSettings(): AdminSettings {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, serverSettings);
}
