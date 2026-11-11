import { Suspense } from "react";

import BatchForm from "@/components/domain/clerk/batch-form";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  searchParams: Promise<{ supplierId?: string | string[] }>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** UC-05 — register a batch. The optional supplierId preselects the supplier
 * when coming from the supplier detail screen. */
export default function ClerkBatchNewPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <BatchNewContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BatchNewContent({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  return <BatchForm mode="create" initialSupplierId={first(query.supplierId)} />;
}
