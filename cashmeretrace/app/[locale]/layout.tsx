import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import DocumentLang from "@/components/layout/document-lang";
import { SessionProvider } from "@/components/providers/session-provider";
import { isLocale, locales } from "@/lib/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Explicit-locale layout (no middleware): validates the segment, unlocks
 * static rendering via setRequestLocale, and boots the mock session.
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLang locale={locale} />
      <SessionProvider>{children}</SessionProvider>
    </NextIntlClientProvider>
  );
}
