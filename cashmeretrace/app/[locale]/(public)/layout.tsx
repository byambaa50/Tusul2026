import { getTranslations, setRequestLocale } from "next-intl/server";

import BrandMark from "@/components/layout/brand-mark";
import LocaleSwitcher from "@/components/layout/locale-switcher";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * MinimalShell for anonymous screens (UC-01/10/13): no navigation chrome,
 * glass header with wordmark + locale switcher, organic tinted backdrop.
 */
export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="page-backdrop flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <LocaleSwitcher locale={locale === "en" ? "en" : "mn"} />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 lg:py-16">
        {children}
      </main>

      <footer className="no-print px-4 pb-8 text-center">
        <p className="text-ink-500 text-xs">{t("footer.copyright")}</p>
      </footer>
    </div>
  );
}
