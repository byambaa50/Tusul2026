import { cn } from "@/lib/utils";

/**
 * PDF state enums (table 97) → token bindings (spec §5):
 * supplier: Баталгаажуулалт хүлээгдэж буй / Идэвхтэй / Татгалзсан / Түр түгжигдсэн
 * batch: Бүртгэгдсэн / Шинжилгээтэй · publish: Нууц / Нийтлэгдсэн · QR: Үүссэн / АшиглахадБэлэн
 */
export type TraceStatus =
  | "supplier-pending"
  | "supplier-active"
  | "supplier-rejected"
  | "supplier-locked"
  | "batch-registered"
  | "batch-tested"
  | "publish-hidden"
  | "publish-published"
  | "qr-created"
  | "qr-ready";

const statusStyles: Record<TraceStatus, string> = {
  "supplier-pending": "border-camel-500/40 bg-camel-500/10 text-camel-600",
  "supplier-active": "border-sage-500/40 bg-sage-200/60 text-forest-900",
  "supplier-rejected": "border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-600",
  "supplier-locked": "border-slate-400/40 bg-slate-300/50 text-slate-700",
  "batch-registered": "border-sage-500/40 bg-sage-300/40 text-forest-800",
  "batch-tested": "border-forest-700/30 bg-forest-700/10 text-forest-800",
  "publish-hidden": "border-slate-400/40 bg-slate-300/50 text-slate-700",
  "publish-published": "border-sage-600/40 bg-sage-200/60 text-forest-900",
  "qr-created": "border-camel-500/40 bg-camel-500/10 text-camel-600",
  "qr-ready": "border-forest-700/30 bg-forest-700/10 text-forest-700",
};

/**
 * Colored chip for any system state. The label is passed pre-translated
 * (status.json holds the exact PDF wordings), so this component is
 * server-render safe.
 */
export default function StatusBadge({
  status,
  label,
  dot = true,
  className,
}: {
  status: TraceStatus;
  label: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {label}
    </span>
  );
}
