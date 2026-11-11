import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityCompare from "@/components/domain/quality/quality-compare";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-08 — latest vs previous result comparison for one batch. */
export default function QualityBatchComparePage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchCompareContent params={params} />
    </Suspense>
  );
}

async function BatchCompareContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityCompare batchId={id} />;
}
