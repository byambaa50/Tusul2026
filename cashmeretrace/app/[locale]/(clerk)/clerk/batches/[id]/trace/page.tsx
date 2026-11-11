import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import BatchTrace from "@/components/domain/clerk/batch-trace";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** FR-2.9 — origin traceability for one batch. */
export default function ClerkBatchTracePage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <BatchTraceContent params={params} />
    </Suspense>
  );
}

async function BatchTraceContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BatchTrace batchId={id} />;
}
