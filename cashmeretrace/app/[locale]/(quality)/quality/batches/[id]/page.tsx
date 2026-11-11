import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityBatchDetail from "@/components/domain/quality/quality-batch-detail";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-07 — read-only batch detail for the quality officer. */
export default function QualityBatchDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchDetailContent params={params} />
    </Suspense>
  );
}

async function BatchDetailContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityBatchDetail batchId={id} />;
}
