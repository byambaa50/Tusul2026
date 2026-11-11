import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * "Эрх хүрэлцэхгүй" state — NFR-09: users without correct rights get an
 * explicit denial; server-side is the real gate (Phase 2).
 */
export default function AccessDenied({
  title,
  message,
  children,
  className,
}: {
  title?: string;
  message?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-terracotta-500/25 bg-linen/70 flex flex-col items-center justify-center gap-3 rounded-panel border px-8 py-14 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-terracotta-500/10 text-terracotta-600 grid size-12 place-items-center rounded-full"
      >
        <ShieldAlert className="size-6" />
      </span>
      {title ? <p className="text-terracotta-600 font-display text-lg font-medium">{title}</p> : null}
      {message ? (
        <p className="text-ink-700 max-w-md text-sm leading-relaxed">{message}</p>
      ) : null}
      {children}
    </div>
  );
}
