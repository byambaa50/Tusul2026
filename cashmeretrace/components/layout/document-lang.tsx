"use client";

import { useEffect } from "react";

/**
 * Root layout can't read the [locale] segment, so <html lang> is server-
 * rendered with the primary locale (mn, NFR-19) and this component syncs
 * the document language to the URL locale after hydration (accessibility:
 * correct lang for screen readers/spellcheck on public en pages).
 */
export default function DocumentLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
