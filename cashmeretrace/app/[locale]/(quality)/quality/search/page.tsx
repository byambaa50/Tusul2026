import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import QualitySearch from "@/components/domain/quality/quality-search";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quality.search" });
  return { title: `${t("title")} — CashmereTrace`, description: t("subtitle") };
}

/** UC-07 — quality batch search; the header quick search lands here with ?q=. */
export default function QualitySearchPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <SearchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchContent({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const q = first(query.q);
  return <QualitySearch key={q} initialQuery={q} />;
}
