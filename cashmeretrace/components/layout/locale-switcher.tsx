"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { localeNames, replaceLocale, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const segments = ["mn", "en"] as const;

/** Segmented MN | EN switcher — keeps the current route, swaps the prefix. */
export default function LocaleSwitcher({ locale }: { locale: Locale }) {
  const t = useTranslations("common");
  const pathname = usePathname() ?? "/";

  return (
    <div
      role="group"
      aria-label={t("labels.language")}
      className="inline-flex items-center rounded-field border border-brown-500/20 bg-linen/70 p-0.5"
    >
      {segments.map((target) => (
        <Link
          key={target}
          href={replaceLocale(pathname, target)}
          title={localeNames[target]}
          aria-current={target === locale ? "true" : undefined}
          className={cn(
            "rounded-[8px] px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-colors",
            target === locale
              ? "bg-forest-700 text-ivory-50"
              : "text-ink-700 hover:text-forest-800",
          )}
        >
          {target === "mn" ? "MN" : "EN"}
        </Link>
      ))}
    </div>
  );
}
