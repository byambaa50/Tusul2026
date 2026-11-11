/**
 * Locale configuration — Mongolian first (NFR-19), English as secondary.
 * next-intl is used WITHOUT middleware: the locale lives in an explicit
 * `[locale]` URL segment, so no cookie/rewrite resolution is needed for
 * mandated QR-stable paths.
 */
export const locales = ["mn", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "mn";

export const localeNames: Record<Locale, string> = {
  mn: "Монгол",
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Same as isLocale but falls back to the default locale. */
export function asLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Derives the locale from a pathname like "/mn/login" (fallback: mn). */
export function getLocaleFromPathname(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && isLocale(first)) return first;
  return defaultLocale;
}

/** Builds the same route under another locale, e.g. /mn/login → /en/login. */
export function replaceLocale(pathname: string, target: Locale): string {
  const rest = pathname.replace(/^\/(mn|en)(?=\/|$)/, "");
  return `/${target}${rest === "" ? "/" : rest}`;
}
