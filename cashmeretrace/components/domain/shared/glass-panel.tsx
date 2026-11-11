import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type GlassTier = "g1" | "g2" | "g3";

/**
 * One component, three glass tiers (design spec §5):
 * g1 = header chrome · g2 = panels/dialogs/stat cards · g3 = dark scrim.
 */
export default function GlassPanel({
  tier = "g2",
  className,
  children,
}: {
  tier?: GlassTier;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        tier === "g1" && "glass-g1",
        tier === "g2" && "glass-g2",
        tier === "g3" && "glass-g3",
        tier === "g3" ? "rounded-xl" : "rounded-xl shadow-[0_1px_2px_rgba(36,40,31,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
