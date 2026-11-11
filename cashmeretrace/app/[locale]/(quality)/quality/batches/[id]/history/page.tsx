import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityHistory from "@/components/domain/quality/quality-history";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-08 — insert-only quality result history for one batch. */
export default function QualityBatchHistoryPage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchHistoryContent params={params} />
    </Suspense>
  );
}

async function BatchHistoryContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityHistory batchId={id} />;
}
