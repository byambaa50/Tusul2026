import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Subtle olive/sage callout used for every clearly-labeled demo affordance. */
export default function DemoNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-olive-500/25 bg-sage-100/70 text-olive-600 flex gap-2 rounded-field border p-3 text-xs leading-relaxed",
        className,
      )}
    >
      <Info aria-hidden className="text-olive-500 mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
