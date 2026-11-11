import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityPublishForm from "@/components/domain/quality/quality-publish-form";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-09 — choose the whitelist fields published on the batch QR page. */
export default function QualityBatchPublishPage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchPublishContent params={params} />
    </Suspense>
  );
}

async function BatchPublishContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityPublishForm batchId={id} />;
}
