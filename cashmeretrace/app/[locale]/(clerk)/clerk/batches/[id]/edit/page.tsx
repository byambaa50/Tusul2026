import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import BatchForm from "@/components/domain/clerk/batch-form";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-07 — edit a batch (number and quality stay immutable). */
export default function ClerkBatchEditPage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <BatchEditContent params={params} />
    </Suspense>
  );
}

async function BatchEditContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BatchForm mode="edit" batchId={id} />;
}
