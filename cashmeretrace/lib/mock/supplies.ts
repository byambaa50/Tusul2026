/**
 * MOCK SUPPLIES (UC-02, FR-1.3/1.4) — seeded records for SP-001 only
 * (BR-05: a supplier sees ONLY their own records). New registrations made
 * in the demo persist to localStorage under `ct.mock.supplies` and merge
 * with the seed through a signature-cached snapshot (hydration-safe).
 */
import { useSyncExternalStore } from "react";

import { writeJson } from "@/lib/mock/storage";
import type { SupplyRecord } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.supplies";
const SUPPLIES_EVENT = "ct:mock:supplies-change";

export const demoSupplyRecords: SupplyRecord[] = [
  {
    id: "SUP-0001",
    supplierId: "SP-001",
    amountKg: 320,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 450,
    dateIso: "2026-05-03",
  },
  {
    id: "SUP-0002",
    supplierId: "SP-001",
    amountKg: 145,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 410,
    dateIso: "2026-05-06",
  },
  {
    id: "SUP-0003",
    supplierId: "SP-001",
    amountKg: 380,
    aimag: "Хөвсгөл",
    soum: "Цагаан-Уул",
    livestockCount: 690,
    dateIso: "2026-05-12",
  },
  {
    id: "SUP-0004",
    supplierId: "SP-001",
    amountKg: 410,
    aimag: "Хөвсгөл",
    soum: "Түнэл",
    livestockCount: 730,
    dateIso: "2026-05-25",
  },
  {
    id: "SUP-0005",
    supplierId: "SP-001",
    amountKg: 350,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 520,
    dateIso: "2026-06-03",
  },
  {
    id: "SUP-0006",
    supplierId: "SP-001",
    amountKg: 190,
    aimag: "Хөвсгөл",
    soum: "Мөрөн",
    livestockCount: 480,
    dateIso: "2026-06-14",
  },
];

const EMPTY: SupplyRecord[] = [];

function readStored(): SupplyRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupplyRecord[]) : [];
  } catch {
    return EMPTY;
  }
}

function persist(list: SupplyRecord[]) {
  writeJson(STORAGE_KEY, list);
  window.dispatchEvent(new Event(SUPPLIES_EVENT));
}

/**
 * Adds a UC-02 record for the current supplier; returns its id. Storage
 * failures throw so the form can keep the entered data and show UC-02 E3
 * instead of a false success.
 */
export function addSupply(input: Omit<SupplyRecord, "id">): SupplyRecord {
  const stored = readStored();
  const created: SupplyRecord = {
    ...input,
    id: `SUP-D${String(stored.length + 1).padStart(3, "0")}`,
  };
  persist([...stored, created]);
  return created;
}

let cacheSig = "";
let cacheList: SupplyRecord[] = EMPTY;

/** Plain reader for traceability / clerk screens (FR-2.9). */
export function suppliesFor(supplierId: string | null): SupplyRecord[] {
  if (!supplierId || typeof window === "undefined") return EMPTY;
  return [
    ...readStored().filter((record) => record.supplierId === supplierId),
    ...demoSupplyRecords.filter((record) => record.supplierId === supplierId),
  ].sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.id.localeCompare(a.id));
}

/** One supply record by id (batch → supply traceability link). */
export function supplyById(id: string | null): SupplyRecord | null {
  if (!id || typeof window === "undefined") return null;
  return (
    [...readStored(), ...demoSupplyRecords].find((record) => record.id === id) ??
    null
  );
}

/** Newest first (огноогоор); merged seed + stored for ONE supplier only. */
function getSnapshot(supplierId: string): SupplyRecord[] {
  if (typeof window === "undefined") return EMPTY;
  const ownStored = readStored().filter((r) => r.supplierId === supplierId);
  const sig = supplierId + "|" + ownStored.map((r) => r.id).join(",") + `#${ownStored.length}`;
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = [
      ...ownStored,
      ...demoSupplyRecords.filter((r) => r.supplierId === supplierId),
    ].sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.id.localeCompare(a.id));
  }
  return cacheList;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SUPPLIES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SUPPLIES_EVENT, callback);
  };
}

/** Client hook for the UC-02 history/table (own records only). */
export function useSupplies(supplierId: string | null): SupplyRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => (supplierId ? getSnapshot(supplierId) : EMPTY),
    () => EMPTY,
  );
}
