import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Consistent empty/blocked content state:
 * UC-03 A1 "Үр дүн хараахан бүртгэгдээгүй", UC-07 E2 "Багц олдсонгүй",
 * UC-11 A1, and the Phase-2 placeholders.
 */
export default function EmptyState({
  icon: Icon = Construction,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-brown-500/30 bg-linen/60 flex flex-col items-center justify-center gap-3 rounded-panel border border-dashed px-8 py-14 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-sage-100 text-olive-600 grid size-12 place-items-center rounded-full"
      >
        <Icon className="size-6" />
      </span>
      <p className="text-forest-800 font-display text-lg font-medium">{title}</p>
      {description ? (
        <p className="text-ink-700 max-w-md text-sm leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
