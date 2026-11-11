"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const TABLE_PAGE_SIZE = 6;

/** Slice a filtered list and reset to the first page when the filter key changes. */
export function usePageSlice<T>(items: readonly T[], resetKey: string) {
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pages = Math.max(1, Math.ceil(items.length / TABLE_PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * TABLE_PAGE_SIZE;

  return {
    page: current,
    pages,
    rows: items.slice(start, start + TABLE_PAGE_SIZE),
    setPage,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + TABLE_PAGE_SIZE, items.length),
  };
}

export default function TablePager({
  page,
  pages,
  total,
  from,
  to,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("common.pager");
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3">
      <p className="text-ink-500 text-xs tabular-nums">{t("range", { from, to, total })}</p>
      <div className="flex items-center gap-2">
        <p className="text-ink-700 text-xs tabular-nums">{t("page", { page, pages })}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={t("previous")}
        >
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label={t("next")}
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
