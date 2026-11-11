import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import BatchDetail from "@/components/domain/clerk/batch-detail";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-05/UC-06 — batch details. */
export default function ClerkBatchDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <BatchDetailContent params={params} />
    </Suspense>
  );
}

async function BatchDetailContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BatchDetail batchId={id} />;
}
