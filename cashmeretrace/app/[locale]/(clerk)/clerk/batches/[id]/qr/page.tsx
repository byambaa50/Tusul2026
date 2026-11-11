import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import BatchQr from "@/components/domain/clerk/batch-qr";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-06 — generate, preview, download/print one batch QR code. */
export default function ClerkBatchQrPage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <BatchQrContent params={params} />
    </Suspense>
  );
}

async function BatchQrContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BatchQr batchId={id} />;
}
