/**
 * Mnemonic number/date formatting helpers.
 * Numbers are grouped manually with a no-break space instead of Intl so the
 * SSR output and the browser render stay byte-identical (no hydration
 * mismatch from diverging CLDR versions).
 */
const GROUP = "\u00A0"; // no-break space, Mongolian thousand separator

function groupDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += GROUP;
    out += digits[i];
  }
  return out;
}

/** 1234567 → "1 234 567" (handles negatives); fractionDigits > 0 keeps "." decimals. */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(Math.max(fractionDigits, 0));
  const [intPart, decPart = ""] = fixed.split(".");
  const text = groupDigits(intPart) + (decPart ? "." + decPart : "");
  return negative ? `-${text}` : text;
}

/** ISO "2026-05-04" → "2026.05.04" (PDF tabular date style). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

/**
 * ISO timestamp → "2026.05.04 09:20" in local time (PDF tabular style).
 * Locale-independent so mn/en render the same shape; callers are all
 * hydration-guarded so the server never sees a different timezone.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
