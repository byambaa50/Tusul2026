"use client";

import { useTranslations } from "next-intl";

import { type Role } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";

const roleStyles: Record<Role, string> = {
  supplier: "border-sage-500/40 bg-sage-200/60 text-forest-900",
  clerk: "border-forest-700/30 bg-forest-700/10 text-forest-800",
  quality: "border-olive-500/30 bg-olive-500/10 text-olive-600",
  management: "border-camel-500/40 bg-camel-500/10 text-camel-600",
  admin: "border-brown-500/40 bg-brown-500/10 text-brown-600",
};

export default function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  const t = useTranslations("nav");

  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        roleStyles[role],
        className,
      )}
    >
      {t(`roles.${role}`)}
    </span>
  );
}
