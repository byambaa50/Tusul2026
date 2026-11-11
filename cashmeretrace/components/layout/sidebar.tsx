"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import BrandMark from "@/components/layout/brand-mark";
import { navByRole, type Role } from "@/lib/constants/nav";
import { getLocaleFromPathname } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  role: Role;
  collapsed?: boolean;
  /** Called after a link click — closes the mobile Sheet. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Navigation list driven by `lib/constants/nav.ts` (role → sections).
 * Phase-2 targets render disabled with a "Phase 2" chip (NFR-09 mirror).
 */
export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
  inverse = false,
  className,
}: SidebarNavProps & { inverse?: boolean }) {
  const tN = useTranslations("nav");
  const tC = useTranslations("common");
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);
  const sections = navByRole[role];

  return (
    <nav
      aria-label={tN(`roles.${role}`)}
      className={cn("flex flex-1 flex-col gap-6 px-3 pt-2 pb-6", className)}
    >
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="flex flex-col gap-1">
          {section.labelKey && !collapsed ? (
            <p
              className={cn(
                "mb-1 px-3 text-[11px] font-semibold tracking-[0.12em] uppercase",
                inverse ? "text-sage-300/80" : "text-ink-500",
              )}
            >
              {tN(section.labelKey)}
            </p>
          ) : null}

          {section.items.map((item) => {
            const href = `/${locale}${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const Icon = item.icon;

            if (item.phase !== 1) {
              return (
                <span
                  key={item.href}
                  aria-disabled
                  title={tC("labels.phase2")}
                  className={cn(
                    "flex h-9 cursor-default items-center gap-2.5 rounded-lg px-3 text-sm opacity-60",
                    inverse ? "text-ivory-50/70" : "text-ink-500",
                  )}
                >
                  <Icon aria-hidden className={cn("size-4 shrink-0", active ? "text-forest-800" : "text-olive-600")} />
                  {collapsed ? null : <span className="truncate">{tN(item.labelKey)}</span>}
                  {collapsed ? null : (
                    <span className="bg-cream-200 text-olive-600 ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      {tC("labels.phase2")}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? tN(item.labelKey) : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  inverse
                    ? active
                      ? "bg-white/12 text-white"
                      : "text-ivory-50/80 hover:bg-white/8 hover:text-white"
                    : active
                      ? "bg-sage-100 text-forest-900"
                      : "text-ink-700 hover:bg-sage-100/80 hover:text-forest-900",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    inverse ? "text-current" : active ? "text-forest-700" : "text-ink-500",
                  )}
                />
                {collapsed ? null : <span className="truncate font-medium">{tN(item.labelKey)}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Desktop (md+) sidebar: 264px expanded → 76px collapsed. */
export default function AppSidebar({
  role,
  collapsed,
  onToggleCollapse,
}: {
  role: Role;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const tC = useTranslations("common");

  return (
    <aside
      className={cn(
        "bg-forest-900 text-ivory-50 sticky top-0 h-dvh rounded-none border-r border-white/10",
        "flex flex-col",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center px-4", collapsed && "justify-center px-0")}>
        <BrandMark compact={collapsed} inverse />
      </div>

      <SidebarNav role={role} collapsed={collapsed} inverse />

      <div className="shrink-0 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? tC("labels.expand") : tC("labels.collapse")}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-ivory-50/75 transition-colors hover:bg-white/8 hover:text-white"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {collapsed ? null : <span className="font-medium">{tC("labels.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
