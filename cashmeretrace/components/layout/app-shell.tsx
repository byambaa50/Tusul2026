"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import AppHeader from "@/components/layout/header";
import AppSidebar, { SidebarNav } from "@/components/layout/sidebar";
import BrandMark from "@/components/layout/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSession } from "@/components/providers/session-provider";
import { type Role } from "@/lib/constants/nav";
import { getLocaleFromPathname } from "@/lib/i18n/config";

const SIDEBAR_COLLAPSED_KEY = "ct.mock.sidebar.collapsed";

/**
 * Shell boundary: the header/sidebar read the URL via usePathname(), which
 * only exists at runtime for dynamic routes (e.g. /clerk/batches/[id]).
 * Wrapping the shell in Suspense lets those routes still ship a static
 * skeleton shell under Cache Components (stream fallback → real shell).
 */
export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShellInner role={role}>{children}</AppShellInner>
    </Suspense>
  );
}

function ShellFallback() {
  return (
    <div className="page-backdrop flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4" aria-hidden>
        <Skeleton className="bg-ivory-100 h-10 w-56 rounded-field" />
        <Skeleton className="bg-ivory-100 h-4 w-32 rounded-field" />
      </div>
    </div>
  );
}

/**
 * Shared shell for all authenticated role groups:
 * - client-side mock guard: wrong/absent demo role → /{locale}/login;
 *   supplier sessions additionally need an explicit supplierId binding
 *   (BR-05 isolation mock — legacy role-only sessions are expired)
 * - desktop G2 sidebar (collapsible) + sticky G1 header + content column
 * - mobile (<md): Sheet navigation, opened from the header burger and
 *   closed on link click (SidebarNav's onNavigate) or via its overlay
 * The real authorization check happens server-side (NFR-09).
 */
function AppShellInner({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();
  const t = useTranslations("common");
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);

  const allowed =
    session.role === role &&
    (role !== "supplier" || Boolean(session.supplierId));

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
      ) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const toggleCollapsed = () => setCollapsed(!collapsed);

  /* Mock guard: only exact-role (and bound-supplier) sessions may stay. */
  useEffect(() => {
    if (!session.isHydrated) return;
    if (!allowed) {
      router.replace(`/${locale}/login`);
    }
  }, [session.isHydrated, allowed, locale, router]);

  if (!session.isHydrated || !allowed) {
    return (
      <div className="page-backdrop flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-4" aria-hidden>
          <Skeleton className="bg-ivory-100 h-10 w-56 rounded-field" />
          <Skeleton className="bg-ivory-100 h-4 w-32 rounded-field" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-backdrop flex min-h-dvh">
      <div className="no-print hidden md:block">
        <AppSidebar
          role={role}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role={role} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <footer className="no-print mx-auto w-full max-w-[1160px] px-4 pb-6 sm:px-6 lg:px-10">
          <p className="text-ink-500 text-xs">{t("footer.copyright")}</p>
        </footer>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="bg-forest-900 w-72 border-0 p-0 text-ivory-50">
          <div className="flex h-14 items-center px-4">
            <BrandMark inverse />
          </div>
          <SidebarNav role={role} inverse onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
