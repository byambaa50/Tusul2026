import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import QualityPublicPreview from "@/components/domain/quality/quality-public-preview";
import { QualityPageSkeleton } from "@/components/domain/quality/quality-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-09/UC-13 — whitelist-only public QR page preview. */
export default function QualityBatchPreviewPage({ params }: Props) {
  return (
    <Suspense fallback={<QualityPageSkeleton />}>
      <BatchPreviewContent params={params} />
    </Suspense>
  );
}

async function BatchPreviewContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <QualityPublicPreview batchId={id} />;
}
