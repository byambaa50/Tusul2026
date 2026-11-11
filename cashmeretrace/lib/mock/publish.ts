/**
 * MOCK PUBLISH CONFIG (UC-09 / §5.1 `publish_config`) — per-batch QR public
 * field selection. Unlike quality tests this is mutable (PATCH
 * /batches/:id/publish-fields), but it is still restricted to the §9.1
 * whitelist. `batchCode` is always included; PII and internal values can
 * never be added by the UI or the store.
 */
import { useSyncExternalStore } from "react";

import { batchById } from "@/lib/mock/batches";
import { writeJson } from "@/lib/mock/storage";
import {
  publicFields,
  type PublicField,
  type PublishConfig,
  type PublishStatus,
} from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.quality.publish";
const PUBLISH_EVENT = "ct:mock:quality-publish-change";

export const MANDATORY_PUBLIC_FIELD: PublicField = "batchCode";

export const demoPublishConfigs: PublishConfig[] = [
  {
    batchId: "MN-2026-000001",
    fields: [
      "batchCode",
      "origin",
      "supplyAmount",
      "livestockCount",
      "fineness",
      "cleanYield",
      "admixture",
      "testedOn",
      "verificationStatus",
    ],
    status: "published",
    updatedAt: "2026-06-02T08:10:00.000Z",
  },
  {
    batchId: "MN-2026-000002",
    fields: ["batchCode", "origin", "fineness", "cleanYield", "admixture", "testedOn"],
    status: "hidden",
    updatedAt: "2026-06-03T09:30:00.000Z",
  },
  {
    batchId: "MN-2026-000006",
    fields: ["batchCode", "origin", "fineness", "cleanYield", "testedOn", "verificationStatus"],
    status: "published",
    updatedAt: "2026-07-08T11:00:00.000Z",
  },
];

const EMPTY: PublishConfig[] = [];

function isPublicField(value: unknown): value is PublicField {
  return typeof value === "string" && (publicFields as readonly string[]).includes(value);
}

/**
 * The whitelist is enforced here as well as in the UI: unknown fields are
 * dropped, duplicates removed, `batchCode` forced in, and the canonical
 * order restored.
 */
export function normalizePublicFields(fields: readonly PublicField[]): PublicField[] {
  const selected = new Set<PublicField>();
  for (const field of fields) {
    if (isPublicField(field)) selected.add(field);
  }
  selected.add(MANDATORY_PUBLIC_FIELD);
  return publicFields.filter((field) => selected.has(field));
}

function readStored(): PublishConfig[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (entry): entry is PublishConfig =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as PublishConfig).batchId === "string" &&
          Array.isArray((entry as PublishConfig).fields) &&
          ((entry as PublishConfig).status === "hidden" ||
            (entry as PublishConfig).status === "published"),
      )
      .map((entry) => ({
        batchId: entry.batchId,
        fields: normalizePublicFields(entry.fields),
        status: entry.status,
        updatedAt:
          typeof entry.updatedAt === "string" ? entry.updatedAt : new Date(0).toISOString(),
      }));
  } catch {
    return EMPTY;
  }
}

function mergeConfigs(): PublishConfig[] {
  const byBatch = new Map<string, PublishConfig>();
  for (const config of demoPublishConfigs) byBatch.set(config.batchId, config);
  for (const config of readStored()) byBatch.set(config.batchId, config);
  return [...byBatch.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Plain reader; newest update first. */
export function allPublishConfigs(): PublishConfig[] {
  if (typeof window === "undefined") return [...demoPublishConfigs];
  return mergeConfigs();
}

/** Saved config for one batch, or null when the officer has not configured it. */
export function publishConfigFor(batchId: string | null): PublishConfig | null {
  if (!batchId) return null;
  return allPublishConfigs().find((config) => config.batchId === batchId) ?? null;
}

/** Safe default used by the selector and preview before the first save. */
export function defaultPublishConfig(batchId: string): PublishConfig {
  return {
    batchId,
    fields: [MANDATORY_PUBLIC_FIELD],
    status: "hidden",
    updatedAt: "",
  };
}

/**
 * UC-09 save: upserts the batch's whitelist selection and publish status.
 * The store rejects any batch that is not registered and normalises the
 * field list so a malformed call cannot leak a non-whitelisted value.
 */
export function savePublishConfig(
  batchId: string,
  fields: readonly PublicField[],
  status: PublishStatus,
): PublishConfig {
  if (!batchById(batchId)) throw new Error("BATCH_NOT_FOUND");

  const saved: PublishConfig = {
    batchId,
    fields: normalizePublicFields(fields),
    status: status === "published" ? "published" : "hidden",
    updatedAt: new Date().toISOString(),
  };

  const stored = readStored().filter((config) => config.batchId !== batchId);
  writeJson(STORAGE_KEY, [...stored, saved]);
  window.dispatchEvent(new Event(PUBLISH_EVENT));
  return saved;
}

let cacheSig = "";
let cacheList: PublishConfig[] = EMPTY;

function getSnapshot(): PublishConfig[] {
  if (typeof window === "undefined") return EMPTY;
  const list = mergeConfigs();
  const sig = JSON.stringify(list);
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): PublishConfig[] => EMPTY;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PUBLISH_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PUBLISH_EVENT, callback);
  };
}

/** Reactive publish configs for the quality dashboard/index/preview. */
export function usePublishConfigs(): PublishConfig[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
