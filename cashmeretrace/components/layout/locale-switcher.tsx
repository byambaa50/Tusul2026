import { Suspense } from "react";

import LocaleSwitcherInner from "@/components/layout/locale-switcher-inner";
import { type Locale } from "@/lib/i18n/config";

const segments = ["mn", "en"] as const;

/**
 * The inner switcher reads usePathname(), which suspends on routes whose
 * dynamic params are not covered by generateStaticParams (e.g. /verify/[token]).
 * Keep the boundary above the hook consumer so the rest of the shell can stay
 * prerendered.
 */
export default function LocaleSwitcher({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<LocaleSwitcherFallback />}>
      <LocaleSwitcherInner locale={locale} />
    </Suspense>
  );
}

/** Static placeholder with the same footprint as the segmented control. */
function LocaleSwitcherFallback() {
  return (
    <div
      aria-hidden
      className="inline-flex items-center rounded-field border border-brown-500/20 bg-linen/70 p-0.5"
    >
      {segments.map((target) => (
        <span
          key={target}
          className="text-ink-700/40 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold tracking-wide select-none"
        >
          {target === "mn" ? "MN" : "EN"}
        </span>
      ))}
    </div>
  );
}
