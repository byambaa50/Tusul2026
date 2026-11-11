"use client";

import { usePathname } from "next/navigation";

import { getLocaleFromPathname, type Locale } from "@/lib/i18n/config";

/** Current explicit-locale segment for client components' internal links. */
export function useCurrentLocale(): Locale {
  const pathname = usePathname() ?? "/";
  return getLocaleFromPathname(pathname);
}
