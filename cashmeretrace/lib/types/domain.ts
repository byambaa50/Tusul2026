/**
 * Core entities of the registry domain, grounded in the PDF:
 * - Нийлүүлэгч (supplier, FR-2.4, table 97) — states «Баталгаажуулалт
 *   хүлээгдэж буй / Идэвхтэй / Татгалзсан / Түр түгжигдсэн», types
 *   Малчин / Хоршоо / Аж ахуйн нэгж (line 442).
 * - Нийлүүлэлт (supply, FR-1.3/1.4) — хэмжээ + гарал үүслийн (аймаг, сум,
 *   малын тоо) мэдээлэл.
 * - Багц (batch, FR-2.6/2.7, R-06) — дугаар, хэмжээ, гарал газар,
 *   бүртгэсэн огноо; Чанарын үзүүлэлт (FR-2.2) — нарийн ширхэг,
 *   цэвэр ноолуурын гарц, хольц, шинжилгээний огноо.
 * UNIT NOTE (decision deferred): the PDF specifies no measurement units for
 * хэмжээ and quality parameters; this demo uses kg for supply amount,
 * µm for fiber fineness and % for yield/impurities.
 */
export const supplierTypes = ["herder", "cooperative", "enterprise"] as const;

/** Нийлүүлэгчийн төрөл (PDF line 442: Малчин / Хоршоо / Аж ахуйн нэгж). */
export type SupplierType = (typeof supplierTypes)[number];

/** ХэрэглэгчийнТөлөв (state machine 106): the four supplier account states. */
export type SupplierStatus = "pending" | "active" | "rejected" | "locked";

export interface Supplier {
  /** Registry id, e.g. SP-001. */
  id: string;
  /** нэр */
  name: string;
  /** нэвтрэх нэр (имэйл) */
  username: string;
  /** төрөл */
  type: SupplierType;
  /** утас */
  phone: string;
  /** имэйл */
  email: string;
  /** аймаг */
  aimag: string;
  /** сум */
  soum: string;
  /** төлөв */
  status: SupplierStatus;
  /** UC-04 reject reason — shown to the supplier on the status banner. */
  rejectReason?: string;
  /** Бүртгүүлсэн огноо (ISO yyyy-mm-dd). */
  registeredOn: string;
  /** Demo seed / self-registration / clerk-created record (UC-04). */
  source?: "demo" | "self" | "clerk";
  /** FR-2.6 last edit date (ISO yyyy-mm-dd), set by the clerk form. */
  updatedOn?: string;
  /** Clerk's optional note about the supplier record. */
  notes?: string;
}

/** UC-02 record: нийлүүлсэн хэмжээ + гарал үүслийн мэдээлэл (BR-05 link). */
export interface SupplyRecord {
  id: string;
  /** Own-supplier isolation (BR-05). */
  supplierId: string;
  /** Нийлүүлсэн хэмжээ (кг — DD). */
  amountKg: number;
  /** аймаг */
  aimag: string;
  /** сум */
  soum: string;
  /** малын тоо (бүхэл тоо) */
  livestockCount: number;
  /** огноо (ISO yyyy-mm-dd, одоогоос хойш байхгүй) */
  dateIso: string;
}

/** FR-2.2 Чанарын үзүүлэлт — units are a deferred decision (µm / %). */
export interface QualityResult {
  /** нарийн ширхэг (**µm — DD) */
  finenessMicron: number;
  /** цэвэр ноолуурын гарц (% — DD) */
  cleanYieldPct: number;
  /** хольц (% — DD) */
  impurityPct: number;
  /** шинжилгээний огноо */
  testedOn: string;
}

/** FR-2.6/2.7 багц; state machine: Бүртгэгдсэн → Шинжилгээтэй. */
export interface Batch {
  /** MN-YYYY-000001 (FR-2.4, unique per BR-01); immutable after creation. */
  id: string;
  supplierId: string;
  /** хэмжээ (кг — DD) */
  amountKg: number;
  aimag: string;
  soum: string;
  /** Малын тоо — optional at batch level (UC-05 required data). */
  livestockCount?: number;
  /** бүртгэсэн огноо */
  registeredOn: string;
  status: "registered" | "tested";
  /** FR-2.2 result — null while Щинжилгээ хараахан хийгдээгүй (UC-03 A1). */
  test: QualityResult | null;
  /** Optional link to the supplier's supply record used for traceability (FR-2.9). */
  supplyId?: string;
  /** Clerk's optional batch note. */
  notes?: string;
  /** FR-2.6 last edit date (ISO yyyy-mm-dd). */
  updatedOn?: string;
}

/** UC-06 QR statuses from table 97: Үүссэн → АшиглахадБэлэн. */
export type QrStatus = "created" | "ready";

/** UC-06 record: one QR code linked to one registered batch. */
export interface QrRecord {
  /** BR-02-style link — exactly one batch. */
  batchId: string;
  /** Opaque demo token used in the public verification URL. */
  token: string;
  /** Encoded path of the public verification page (`/verify/{token}`). */
  payload: string;
  status: QrStatus;
  /** ISO date-time of generation. */
  createdAt: string;
  /** ISO date-time when the image passed the demo readability check. */
  readyAt?: string;
}

/**
 * §5.1 `quality_test` — laboratory result entered manually by the quality
 * officer. INSERT-ONLY (§5.3): there is no update/delete path. The latest
 * result is defined by `createdAt DESC, id DESC`; `testedOn` is display /
 * reporting date only.
 */
export interface QualityTest {
  /** QT-YYYY-000001 — unique inserted record id. */
  id: string;
  /** Required batch link (§5.3 integrity rule). */
  batchId: string;
  /** нарийн ширхэг (µm — demo display unit) */
  finenessMicron: number;
  /** цэвэр ноолуурын гарц (%) */
  cleanYieldPct: number;
  /** хольц (%) */
  impurityPct: number;
  /** лабораторийн дүгнэлт / мэдээлэл (free text) */
  labResult: string;
  /** шинжилгээний огноо (ISO yyyy-mm-dd) — display/reporting only. */
  testedOn: string;
  /** ISO date-time when the officer entered the result — latest ordering key. */
  createdAt: string;
  /** Demo actor label; the real system stores created_by_id. */
  createdBy: string;
}

/**
 * §9.1 QR public whitelist. These are the ONLY fields the public preview
 * may render. `batchCode` is mandatory; supplier names, contacts, supplier
 * ids, internal notes, audit data, previous test history and lab result text
 * must never be publishable.
 */
export const publicFields = [
  "batchCode",
  "origin",
  "supplyAmount",
  "livestockCount",
  "fineness",
  "cleanYield",
  "admixture",
  "testedOn",
  "verificationStatus",
] as const;

export type PublicField = (typeof publicFields)[number];

/** `publish_config.status` from table 97: Нууц / Нийтлэгдсэн. */
export type PublishStatus = "hidden" | "published";

/** §5.1 `publish_config` — per-batch QR public field selection. */
export interface PublishConfig {
  batchId: string;
  /** Whitelist subset; `batchCode` is always included by the store. */
  fields: PublicField[];
  status: PublishStatus;
  /** ISO date-time of the last field/status change. */
  updatedAt: string;
}
