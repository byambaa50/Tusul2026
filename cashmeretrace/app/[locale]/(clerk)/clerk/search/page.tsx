import { Suspense } from "react";

import BatchSearch from "@/components/domain/clerk/batch-search";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

/** UC-07 — batch search; the header quick search lands here with ?q=. */
export default function ClerkSearchPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const q = first(query.q);
  return <BatchSearch key={q} initialQuery={q} />;
}
