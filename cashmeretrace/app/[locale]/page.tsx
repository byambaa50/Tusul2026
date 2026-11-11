import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

/** /{locale} → /{locale}/login — there is no authenticated root in Phase 1. */
export default async function LocaleIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/login`);
}
