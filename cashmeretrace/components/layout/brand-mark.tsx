import { Leaf } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Wordmark — the product name is a Latin brand string (not UI copy),
 * so it is intentionally not localized.
 */
export default function BrandMark({
  compact = false,
  inverse = false,
  className,
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          inverse ? "bg-white/12 text-ivory-50" : "bg-forest-800 text-ivory-50",
        )}
      >
        <Leaf className="size-4" />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-sans text-[15px] font-semibold tracking-tight",
              inverse ? "text-ivory-50" : "text-forest-900",
            )}
          >
            CashmereTrace
          </span>
          {inverse ? (
            <span className="text-sage-300 mt-1 text-[10px] tracking-[0.14em] uppercase">
              MN
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
