import { getRequestConfig } from "next-intl/server";

import { asLocale } from "@/lib/i18n/config";

import mnCommon from "../dictionaries/mn/common.json";
import mnAuth from "../dictionaries/mn/auth.json";
import mnStatus from "../dictionaries/mn/status.json";
import mnNav from "../dictionaries/mn/nav.json";
import mnSupplier from "../dictionaries/mn/supplier.json";
import mnClerk from "../dictionaries/mn/clerk.json";
import mnQuality from "../dictionaries/mn/quality.json";
import mnManagement from "../dictionaries/mn/management.json";
import mnAdmin from "../dictionaries/mn/admin.json";
import mnVerify from "../dictionaries/mn/verify.json";
import enCommon from "../dictionaries/en/common.json";
import enAuth from "../dictionaries/en/auth.json";
import enStatus from "../dictionaries/en/status.json";
import enNav from "../dictionaries/en/nav.json";
import enSupplier from "../dictionaries/en/supplier.json";
import enClerk from "../dictionaries/en/clerk.json";
import enQuality from "../dictionaries/en/quality.json";
import enManagement from "../dictionaries/en/management.json";
import enAdmin from "../dictionaries/en/admin.json";
import enVerify from "../dictionaries/en/verify.json";

/**
 * Static, explicit-locale pattern (no middleware): dictionaries are plain
 * JSON, imported at build time — locale resolution happens in
 * `app/[locale]/layout.tsx` via `setRequestLocale`.
 */
const dictionaries = {
  mn: {
    common: mnCommon,
    auth: mnAuth,
    status: mnStatus,
    nav: mnNav,
    supplier: mnSupplier,
    clerk: mnClerk,
    quality: mnQuality,
    management: mnManagement,
    admin: mnAdmin,
    verify: mnVerify,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    status: enStatus,
    nav: enNav,
    supplier: enSupplier,
    clerk: enClerk,
    quality: enQuality,
    management: enManagement,
    admin: enAdmin,
    verify: enVerify,
  },
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = asLocale(requested ?? "");
  return { locale, messages: dictionaries[locale] };
});
