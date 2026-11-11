/**
 * MOCK SUPPLIERS (UC-04 / FR-2.2, FR-2.6, FR-2.7) — demo accounts covering
 * the UC-10 status paths plus clerk-created records. The clerk's create/edit
 * operations persist to `ct.mock.clerk.suppliers`; seed and self-registered
 * records are merged underneath so every existing Phase-2 screen keeps
 * working unchanged.
 *
 * BR-12: a record created by the registration clerk (or admin) is active
 * immediately. Status changes stay admin-only, so the clerk store never
 * writes a different status for an existing record.
 */
import { useSyncExternalStore } from "react";

import { registrations } from "@/lib/mock/registry";
import { writeJson } from "@/lib/mock/storage";
import type { Supplier, SupplierStatus } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.clerk.suppliers";
const SUPPLIERS_EVENT = "ct:mock:clerk-suppliers-change";

export const demoSuppliers: Supplier[] = [
  {
    id: "SP-001",
    name: "Батсайхан Ганболд",
    username: "batsaih",
    type: "herder",
    phone: "99110022",
    email: "batsaih.ganbold@example.mn",
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    status: "active",
    source: "demo",
    registeredOn: "2026-01-14",
  },
  {
    id: "SP-002",
    name: "«Дөлөн сарьдаг» хоршоо",
    username: "dolon.sardag",
    type: "cooperative",
    phone: "88123456",
    email: "dolon.sardag@example.mn",
    aimag: "Төв",
    soum: "Баянцагаан",
    status: "pending",
    source: "demo",
    registeredOn: "2026-04-02",
  },
  {
    id: "SP-003",
    name: "Дамбадорж Ганбаатар",
    username: "damba.ganaa",
    type: "herder",
    phone: "90223417",
    email: "damba.ganaa@example.mn",
    aimag: "Хэнтий",
    soum: "Дадал",
    status: "rejected",
    rejectReason:
      "Аймаг, сумын гарал газрын мэдээлэл бүртгэлийн баримттай таарахгүй тул татгалзлаа.",
    source: "demo",
    registeredOn: "2026-02-20",
  },
  {
    id: "SP-004",
    name: "«Алтан ноолуур» ХХК",
    username: "altan.noos",
    type: "enterprise",
    phone: "77112233",
    email: "info@altannoos.mn",
    aimag: "Архангай",
    soum: "Эрдэнэбулган",
    status: "active",
    source: "demo",
    registeredOn: "2026-03-08",
  },
  {
    id: "SP-005",
    name: "Сүхбаатарын Батмөнх",
    username: "batmunkh.s",
    type: "herder",
    phone: "99554433",
    email: "batmunkh.s@example.mn",
    aimag: "Хөвсгөл",
    soum: "Түнэл",
    status: "active",
    source: "demo",
    registeredOn: "2026-02-12",
  },
  {
    id: "SP-006",
    name: "«Говь ноолуур» хоршоо",
    username: "govi.noos",
    type: "cooperative",
    phone: "88221100",
    email: "govi.noos@example.mn",
    aimag: "Өмнөговь",
    soum: "Даланзадгад",
    status: "active",
    source: "demo",
    registeredOn: "2026-03-22",
  },
  {
    id: "SP-007",
    name: "Наранцэцэг Баярсайхан",
    username: "narantsetseg.b",
    type: "herder",
    phone: "99001122",
    email: "narantsetseg.b@example.mn",
    aimag: "Завхан",
    soum: "Тосонцэнгэл",
    status: "locked",
    source: "demo",
    registeredOn: "2026-05-18",
  },
];

const EMPTY: Supplier[] = [];

function readStored(): Supplier[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Supplier[]) : [];
  } catch {
    return EMPTY;
  }
}

function mergeSuppliers(): Supplier[] {
  const byId = new Map<string, Supplier>();
  for (const supplier of demoSuppliers) byId.set(supplier.id, supplier);
  for (const supplier of registrations()) byId.set(supplier.id, supplier);
  for (const supplier of readStored()) byId.set(supplier.id, supplier);
  return [...byId.values()];
}

function supplierSignature(list: Supplier[]): string {
  return JSON.stringify(list);
}

/** Demo account + self-registered + clerk-created accounts (BR-13 source). */
export function allSuppliers(): Supplier[] {
  if (typeof window === "undefined") {
    return [...demoSuppliers];
  }
  return mergeSuppliers();
}

/** Ганц бүртгэл — id-аар; demo panels + session binding use this. */
export function supplierById(id: string | null): Supplier | null {
  if (!id) return null;
  return allSuppliers().find((supplier) => supplier.id === id) ?? null;
}

/** UC-01 E2 / UC-04 E3: нэвтрэх нэр бүртгэлтэй эсэх. */
export function usernameTaken(username: string, excludeId?: string): boolean {
  const needle = username.trim().toLowerCase();
  return allSuppliers().some(
    (supplier) =>
      supplier.id !== excludeId &&
      supplier.username.toLowerCase() === needle,
  );
}

/** UC-01 E3 / UC-04 E3: same supplier registered under another record. */
export function duplicateSupplierExists(
  input: { phone: string; email: string },
  excludeId?: string,
): boolean {
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  return allSuppliers().some(
    (supplier) =>
      supplier.id !== excludeId &&
      (supplier.phone === phone || supplier.email.toLowerCase() === email),
  );
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function nextSupplierId(list: Supplier[]): string {
  const max = list.reduce((current, supplier) => {
    const match = /^SP-(\d+)$/.exec(supplier.id);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `SP-${String(max + 1).padStart(3, "0")}`;
}

/**
 * FR-2.2 / UC-04: creates an active record (BR-12). BR-13 uniqueness is
 * checked again here so a stale form cannot persist a duplicate. Storage
 * failures throw so the form shows UC-04 E4.
 */
export function createSupplier(
  draft: Omit<
    Supplier,
    "id" | "status" | "source" | "registeredOn" | "updatedOn" | "rejectReason"
  >,
): Supplier {
  const list = allSuppliers();
  if (usernameTaken(draft.username)) {
    throw new Error("USERNAME_TAKEN");
  }
  if (duplicateSupplierExists({ phone: draft.phone, email: draft.email })) {
    throw new Error("DUPLICATE_SUPPLIER");
  }

  const created: Supplier = {
    ...draft,
    id: nextSupplierId(list),
    status: "active",
    source: "clerk",
    registeredOn: todayIso(),
  };

  writeJson(STORAGE_KEY, [...readStored(), created]);
  window.dispatchEvent(new Event(SUPPLIERS_EVENT));
  return created;
}

/**
 * FR-2.6 / UC-04: edits the permitted supplier fields. Status, id and the
 * original registration date stay untouched (status changes are admin-only).
 */
export function updateSupplier(
  id: string,
  patch: Omit<Supplier, "id" | "status" | "source" | "registeredOn" | "rejectReason">,
): Supplier {
  const current = supplierById(id);
  if (!current) throw new Error("SUPPLIER_NOT_FOUND");
  if (usernameTaken(patch.username, id)) {
    throw new Error("USERNAME_TAKEN");
  }
  if (duplicateSupplierExists({ phone: patch.phone, email: patch.email }, id)) {
    throw new Error("DUPLICATE_SUPPLIER");
  }

  const updated: Supplier = {
    ...current,
    ...patch,
    id: current.id,
    status: current.status,
    source: current.source,
    registeredOn: current.registeredOn,
    rejectReason: current.rejectReason,
    updatedOn: todayIso(),
  };

  const stored = readStored();
  const exists = stored.some((supplier) => supplier.id === id);
  const next = exists
    ? stored.map((supplier) => (supplier.id === id ? updated : supplier))
    : [...stored, updated];

  writeJson(STORAGE_KEY, next);
  window.dispatchEvent(new Event(SUPPLIERS_EVENT));
  return updated;
}

/**
 * Admin-only account status (UC-12). The clerk form never calls this.
 * Pending self-registrations are overlaid here so the merged directory
 * shows the decision without deleting the original registration.
 */
export function applySupplierStatus(
  id: string,
  status: SupplierStatus,
  rejectReason?: string,
): Supplier {
  const current = supplierById(id);
  if (!current) throw new Error("SUPPLIER_NOT_FOUND");

  const updated: Supplier = {
    ...current,
    status,
    rejectReason: status === "rejected" ? rejectReason?.trim() : undefined,
    updatedOn: todayIso(),
  };

  const stored = readStored();
  const exists = stored.some((supplier) => supplier.id === id);
  const next = exists
    ? stored.map((supplier) => (supplier.id === id ? updated : supplier))
    : [...stored, updated];

  writeJson(STORAGE_KEY, next);
  window.dispatchEvent(new Event(SUPPLIERS_EVENT));
  return updated;
}

let cacheSig = "";
let cacheList: Supplier[] = EMPTY;

function getSnapshot(): Supplier[] {
  if (typeof window === "undefined") return EMPTY;
  const list = mergeSuppliers();
  const sig = supplierSignature(list);
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): Supplier[] => EMPTY;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SUPPLIERS_EVENT, callback);
  window.addEventListener("ct:mock:registry-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SUPPLIERS_EVENT, callback);
    window.removeEventListener("ct:mock:registry-change", callback);
  };
}

/** Reactive supplier list for the clerk screens (UC-04/UC-07). */
export function useSuppliers(): Supplier[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
