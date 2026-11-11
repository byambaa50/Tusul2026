"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleUser, LogOut, Menu } from "lucide-react";

import RoleBadge from "@/components/layout/role-badge";
import LocaleSwitcher from "@/components/layout/locale-switcher";
import QuickSearch from "@/components/layout/quick-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { supplierById } from "@/lib/mock/suppliers";
import { findNavItem, quickSearchRoles, type Role } from "@/lib/constants/nav";
import { getLocaleFromPathname } from "@/lib/i18n/config";

/**
 * Sticky G1-glass header (64px): breadcrumb + page label left; quick search
 * (clerk/quality), locale switcher and the demo user menu right. Supplier
 * sessions show the bound supplier's name (BR-05 demo) and a profile link.
 */
export default function AppHeader({
  role,
  onOpenMobileNav,
}: {
  role: Role;
  onOpenMobileNav: () => void;
}) {
  const tN = useTranslations("nav");
  const tC = useTranslations("common");
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);

  const matched = findNavItem(role, pathname);
  const title = matched ? tN(matched.item.labelKey) : tN(`roles.${role}`);
  const crumb = matched?.sectionLabelKey
    ? `${tN(`roles.${role}`)} · ${tN(matched.sectionLabelKey)}`
    : tN(`roles.${role}`);

  /**
   * BR-05 demo: the header shows the bound supplier's own name once the
   * client session is hydrated (null during SSR → generic label).
   */
  const supplier =
    role === "supplier" && session.supplierId
      ? supplierById(session.supplierId)
      : null;
  const userLabel = supplier ? supplier.name : tC("labels.userFallback");

  function handleLogout() {
    session.logout();
    router.replace(`/${locale}/login`);
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-black/8 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1160px] items-center gap-2 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label={tC("labels.openMenu")}
          className="text-forest-800 hover:bg-sage-100/70 -ml-1 grid size-10 shrink-0 place-items-center rounded-field transition-colors md:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-forest-900 truncate text-sm leading-tight font-semibold">
            {title}
          </p>
          <p className="text-ink-500 truncate text-[11px]">
            {crumb}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {quickSearchRoles.includes(role) ? <QuickSearch role={role} /> : null}
          <LocaleSwitcher locale={locale} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hover:bg-sage-100/70 h-10 gap-1.5 rounded-full pr-2 pl-1"
              >
                <span
                  aria-hidden
                  className="text-ivory-50 grid size-9 place-items-center rounded-full bg-forest-700 text-xs font-semibold"
                >
                  {tC("labels.demoUserAvatar")}
                </span>
                <ChevronDown aria-hidden className="text-ink-500 size-4" />
                <span className="sr-only">{tC("labels.userFallback")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-field">
              <DropdownMenuLabel className="flex flex-col items-start gap-1.5">
                <span className="text-ink-900 text-sm">{userLabel}</span>
                <RoleBadge role={role} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === "supplier" && session.supplierId ? (
                <DropdownMenuItem asChild className="gap-2">
                  <Link href={`/${locale}/supplier/profile`}>
                    <CircleUser aria-hidden className="size-4" />
                    {tN("supplier.profile")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                variant="destructive"
                onSelect={handleLogout}
                className="gap-2"
              >
                <LogOut aria-hidden className="size-4" />
                {tC("actions.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
