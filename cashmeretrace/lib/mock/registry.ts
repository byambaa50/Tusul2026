/**
 * MOCK REGISTRY (UC-01) — self-registered «баталгаажуулалт хүлээгдэж буй»
 * accounts persist in localStorage so a fresh registration can be demoed
 * across reloads. BR-12: they stay pending until an administrator approves
 * them from the admin approval list; they cannot log in (UC-10 E3) but
 * their status is displayed on the login/register screens.
 */
import { useSyncExternalStore } from "react";

import { saveCredential } from "@/lib/mock/credentials";
import { writeJson } from "@/lib/mock/storage";
import type { Supplier } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.registrations";
const REGISTRY_EVENT = "ct:mock:registry-change";

const EMPTY: Supplier[] = [];

let cacheSig = "";
let cacheList: Supplier[] = EMPTY;

function readAll(): Supplier[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Supplier[]) : [];
  } catch {
    return EMPTY;
  }
}

/** Signature-keyed snapshot cache — stable identity for useSyncExternalStore. */
function getSnapshot(): Supplier[] {
  if (typeof window === "undefined") return EMPTY;
  const list = readAll();
  const sig = list.map((r) => r.id).join(",") + `#${list.length}`;
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): Supplier[] => EMPTY;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(REGISTRY_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REGISTRY_EVENT, callback);
  };
}

/** Client hook — the registration list as a reactive snapshot. */
export function useRegistrations(): Supplier[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Plain reader for event handlers / non-react contexts. */
export function registrations(): Supplier[] {
  if (typeof window === "undefined") return EMPTY;
  return readAll();
}

function persist(list: Supplier[]) {
  writeJson(STORAGE_KEY, list);
  window.dispatchEvent(new Event(REGISTRY_EVENT));
}

/**
 * Appends a self-registered pending account (UC-01 step 7, BR-12) and stores
 * its password in the mock credential store. If either write fails, the
 * registry is rolled back and the error is rethrown so UC-01 E4 can show a
 * failed-save state instead of a false success.
 */
export function addRegistration(
  draft: Omit<Supplier, "id">,
  password: string,
): Supplier {
  const list = registrations();
  const created: Supplier = {
    ...draft,
    id: `SP-R${String(list.length + 1).padStart(3, "0")}`,
  };
  persist([...list, created]);

  try {
    saveCredential(created.id, password);
  } catch (error) {
    try {
      persist(list);
    } catch {
      /* Rollback itself failed; surface the original storage error. */
    }
    throw error;
  }

  return created;
}
