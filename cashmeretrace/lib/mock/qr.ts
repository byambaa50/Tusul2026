/**
 * MOCK QR RECORDS (UC-06 / FR-2.8) — one QR code per registered batch.
 * Generation and status transitions (Үүссэн → АшиглахадБэлэн) persist to
 * localStorage. The encoded path is the public verification route (UC-13):
 * `/verify/{token}`. The page shows only fields the quality officer published.
 */
import { useSyncExternalStore } from "react";

import { writeJson } from "@/lib/mock/storage";
import type { QrRecord } from "@/lib/types/domain";

const STORAGE_KEY = "ct.mock.qr";
const QR_EVENT = "ct:mock:qr-change";

const VERIFY_PATH = "/verify/";

export const demoQrRecords: QrRecord[] = [
  {
    batchId: "MN-2026-000001",
    token: "demo7f3c2a91b4",
    payload: `${VERIFY_PATH}demo7f3c2a91b4`,
    status: "ready",
    createdAt: "2026-05-05T09:20:00.000Z",
    readyAt: "2026-05-05T09:24:00.000Z",
  },
  {
    batchId: "MN-2026-000002",
    token: "demo81d6e4a2c9",
    payload: `${VERIFY_PATH}demo81d6e4a2c9`,
    status: "created",
    createdAt: "2026-05-14T10:05:00.000Z",
  },
  {
    batchId: "MN-2026-000006",
    token: "demo5a0b9e73d1",
    payload: `${VERIFY_PATH}demo5a0b9e73d1`,
    status: "ready",
    createdAt: "2026-06-21T08:45:00.000Z",
    readyAt: "2026-06-21T08:48:00.000Z",
  },
];

const EMPTY: QrRecord[] = [];

function readStored(): QrRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QrRecord[]) : [];
  } catch {
    return EMPTY;
  }
}

function mergeRecords(): QrRecord[] {
  const byBatch = new Map<string, QrRecord>();
  for (const record of demoQrRecords) byBatch.set(record.batchId, record);
  for (const record of readStored()) byBatch.set(record.batchId, record);
  return [...byBatch.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Plain reader for batch detail / QR center. */
export function allQrRecords(): QrRecord[] {
  if (typeof window === "undefined") return [...demoQrRecords];
  return mergeRecords();
}

/** One QR record for a batch, if generated. */
export function qrForBatch(batchId: string | null): QrRecord | null {
  if (!batchId) return null;
  return allQrRecords().find((record) => record.batchId === batchId) ?? null;
}

function nextToken(batchId: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${batchId.replace(/-/g, "").toLowerCase()}${suffix}`;
}

/**
 * UC-06 step 5: generates and stores the QR record for a batch. Existing
 * codes are returned unchanged (one code per batch). Storage failures throw
 * so the screen can show UC-06 E2 without changing the batch.
 */
export function generateQr(batchId: string): QrRecord {
  const existing = qrForBatch(batchId);
  if (existing) return existing;

  const token = nextToken(batchId);
  const created: QrRecord = {
    batchId,
    token,
    payload: `${VERIFY_PATH}${token}`,
    status: "created",
    createdAt: new Date().toISOString(),
  };

  writeJson(STORAGE_KEY, [...readStored(), created]);
  window.dispatchEvent(new Event(QR_EVENT));
  return created;
}

/**
 * UC-06 steps 6–8 / E3: the rendered image passed the demo readability
 * check (download or print). Persists the ready state.
 */
export function markQrReady(batchId: string): QrRecord {
  const current = qrForBatch(batchId);
  if (!current) throw new Error("QR_NOT_FOUND");
  if (current.status === "ready") return current;

  const updated: QrRecord = {
    ...current,
    status: "ready",
    readyAt: new Date().toISOString(),
  };

  const stored = readStored().filter((record) => record.batchId !== batchId);
  writeJson(STORAGE_KEY, [...stored, updated]);
  window.dispatchEvent(new Event(QR_EVENT));
  return updated;
}

let cacheSig = "";
let cacheList: QrRecord[] = EMPTY;

function getSnapshot(): QrRecord[] {
  if (typeof window === "undefined") return EMPTY;
  const list = mergeRecords();
  const sig = list
    .map((record) => `${record.batchId}:${record.status}:${record.readyAt ?? ""}`)
    .join("|");
  if (sig !== cacheSig) {
    cacheSig = sig;
    cacheList = list;
  }
  return cacheList;
}

const getServerSnapshot = (): QrRecord[] => EMPTY;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(QR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(QR_EVENT, callback);
  };
}

/** Reactive QR records for clerk screens (UC-06). */
export function useQrRecords(): QrRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
