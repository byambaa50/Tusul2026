import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import SupplierDetail from "@/components/domain/clerk/supplier-detail";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-04/UC-07 — supplier details. Params are awaited inside Suspense so the
 * static shell can prerender under Cache Components. */
export default function ClerkSupplierDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <SupplierDetailContent params={params} />
    </Suspense>
  );
}

async function SupplierDetailContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <SupplierDetail supplierId={id} />;
}
