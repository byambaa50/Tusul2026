import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import SupplierForm from "@/components/domain/clerk/supplier-form";
import { ClerkPageSkeleton } from "@/components/domain/clerk/clerk-ui";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/** UC-04 — edit a supplier. */
export default function ClerkSupplierEditPage({ params }: Props) {
  return (
    <Suspense fallback={<ClerkPageSkeleton />}>
      <SupplierEditContent params={params} />
    </Suspense>
  );
}

async function SupplierEditContent({ params }: Pick<Props, "params">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <SupplierForm supplierId={id} />;
}
