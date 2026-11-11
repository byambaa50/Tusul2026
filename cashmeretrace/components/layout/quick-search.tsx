"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { type Role } from "@/lib/constants/nav";
import { getLocaleFromPathname } from "@/lib/i18n/config";

/**
 * Header quick-search entry (UC-07 gateway). Enabled for the registration
 * clerk and the quality officer: submitting opens that role's batch search
 * screen with the query prefilled.
 */
export default function QuickSearch({ role }: { role: Role }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);
  const [value, setValue] = useState("");

  const enabled = role === "clerk" || role === "quality";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    const query = value.trim();
    const target = role === "clerk" ? "clerk/search" : "quality/search";
    router.push(
      `/${locale}/${target}${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-56 sm:block">
      <Search
        aria-hidden
        className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={!enabled}
        aria-disabled={!enabled}
        placeholder={t("labels.quickSearchPlaceholder")}
        aria-label={t("labels.quickSearchPlaceholder")}
        className="bg-linen/70 h-10 rounded-field pr-3 pl-9 text-xs"
      />
    </form>
  );
}
