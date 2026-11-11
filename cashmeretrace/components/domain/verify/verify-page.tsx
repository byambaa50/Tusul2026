"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, EyeOff, QrCode, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";

import GlassPanel from "@/components/domain/shared/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { usePublishConfigs } from "@/lib/mock/publish";
import { useQualityTests } from "@/lib/mock/quality";
import { useQrRecords } from "@/lib/mock/qr";
import {
  demoVerifyTokens,
  parseVerifyToken,
  resolvePublicVerification,
  type PublicBatchCard,
} from "@/lib/mock/verify";
import type { PublicField } from "@/lib/types/domain";

const INVALID_SAMPLE = "not-a-real-token";

function VerifySkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-4" aria-hidden>
      <div className="bg-forest-700/10 h-8 w-2/3 rounded-lg" />
      <div className="bg-forest-700/10 rounded-block h-48" />
      <div className="bg-forest-700/10 rounded-block h-24" />
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-forest-700/10 flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0">
      <dt className="text-ink-500 text-sm">{label}</dt>
      <dd className="text-forest-900 text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function StateCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "invalid" | "unavailable";
}) {
  const t = useTranslations("verify");
  const locale = useCurrentLocale();
  const Icon = tone === "invalid" ? CircleAlert : EyeOff;

  return (
    <GlassPanel className="w-full max-w-md p-6 sm:p-8">
      <div
        className={
          tone === "invalid"
            ? "bg-terracotta-500/10 text-terracotta-700 mb-5 grid size-12 place-items-center rounded-full"
            : "bg-camel-500/15 text-camel-600 mb-5 grid size-12 place-items-center rounded-full"
        }
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <h1 className="font-display text-forest-900 text-2xl font-semibold">{title}</h1>
      <p className="text-ink-500 mt-3 text-sm leading-relaxed">{body}</p>
      <Button asChild className="mt-6 h-11 w-full">
        <Link href={`/${locale}/verify`}>{t("tryAgain")}</Link>
      </Button>
    </GlassPanel>
  );
}

function PublishedCard({ card }: { card: PublicBatchCard }) {
  const t = useTranslations("verify");
  const selected = (field: PublicField) => card.fields.includes(field);
  const showOrigin =
    selected("origin") || selected("supplyAmount") || selected("livestockCount");
  const showQuality =
    selected("fineness") ||
    selected("cleanYield") ||
    selected("admixture") ||
    selected("testedOn");

  return (
    <GlassPanel className="w-full max-w-md overflow-hidden">
      <div className="border-forest-700/10 border-b px-5 py-6 sm:px-7">
        <p className="text-forest-700 text-xs font-medium tracking-wide uppercase">
          {t("resultKicker")}
        </p>
        <h1 className="font-display text-forest-900 mt-2 text-2xl font-semibold sm:text-3xl">
          {t("resultTitle")}
        </h1>
        {card.verification ? (
          <p
            className={
              card.verification === "verified"
                ? "border-forest-700/25 bg-forest-700/10 text-forest-800 mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
                : "border-camel-500/40 bg-camel-500/10 text-camel-600 mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
            }
          >
            <ShieldCheck className="size-4" aria-hidden />
            {t(`verification.${card.verification}`)}
          </p>
        ) : null}
      </div>

      <dl className="px-5 py-2 sm:px-7">
        <FieldRow label={t("fields.batchCode")} value={card.batchCode} />
      </dl>

      {showOrigin ? (
        <section className="border-forest-700/10 border-t px-5 py-4 sm:px-7">
          <h2 className="text-forest-800 text-sm font-semibold">{t("originTitle")}</h2>
          <dl>
            {selected("origin") ? (
              <FieldRow
                label={t("fields.origin")}
                value={
                  card.aimag && card.soum ? `${card.aimag} · ${card.soum}` : t("empty")
                }
              />
            ) : null}
            {selected("supplyAmount") && card.supplyAmountKg !== null ? (
              <FieldRow
                label={t("fields.supplyAmount")}
                value={`${formatNumber(card.supplyAmountKg, 1)} ${t("units.kg")}`}
              />
            ) : null}
            {selected("livestockCount") ? (
              <FieldRow
                label={t("fields.livestockCount")}
                value={
                  card.livestockCount === null
                    ? t("noQualityValue")
                    : `${formatNumber(card.livestockCount)} ${t("units.head")}`
                }
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      {showQuality ? (
        <section className="border-forest-700/10 border-t px-5 py-4 sm:px-7">
          <h2 className="text-forest-800 text-sm font-semibold">{t("qualityTitle")}</h2>
          <dl>
            {selected("fineness") ? (
              <FieldRow
                label={t("fields.fineness")}
                value={
                  card.finenessMicron === null
                    ? t("noQualityValue")
                    : `${formatNumber(card.finenessMicron, 1)} ${t("units.micron")}`
                }
              />
            ) : null}
            {selected("cleanYield") ? (
              <FieldRow
                label={t("fields.cleanYield")}
                value={
                  card.cleanYieldPct === null
                    ? t("noQualityValue")
                    : `${formatNumber(card.cleanYieldPct, 1)} ${t("units.percent")}`
                }
              />
            ) : null}
            {selected("admixture") ? (
              <FieldRow
                label={t("fields.admixture")}
                value={
                  card.impurityPct === null
                    ? t("noQualityValue")
                    : `${formatNumber(card.impurityPct, 1)} ${t("units.percent")}`
                }
              />
            ) : null}
            {selected("testedOn") ? (
              <FieldRow
                label={t("fields.testedOn")}
                value={card.testedOn ? formatDate(card.testedOn) : t("noQualityValue")}
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      <p className="text-ink-500 border-forest-700/10 border-t px-5 py-4 text-xs leading-relaxed sm:px-7">
        {t("notice")}
      </p>
    </GlassPanel>
  );
}

/** UC-13 result for a token route. Renders nothing private. */
export function VerifyResult({ token }: { token: string }) {
  const t = useTranslations("verify");
  const hydrated = useHydrated();
  const qrRecords = useQrRecords();
  const batches = useBatches();
  const configs = usePublishConfigs();
  const tests = useQualityTests();

  if (!hydrated) return <VerifySkeleton />;

  const result = resolvePublicVerification(token, qrRecords, batches, configs, tests);
  if (result.kind === "invalid") {
    return <StateCard tone="invalid" title={t("invalidTitle")} body={t("invalidBody")} />;
  }
  if (result.kind === "unavailable") {
    return (
      <StateCard tone="unavailable" title={t("unavailableTitle")} body={t("unavailableBody")} />
    );
  }
  return <PublishedCard card={result} />;
}

function SampleQr() {
  const t = useTranslations("verify");
  const locale = useCurrentLocale();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const target = `${window.location.origin}/verify/${demoVerifyTokens.published}`;
    let cancelled = false;
    QRCode.toDataURL(target, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1e3a2b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={`/${locale}/verify/${demoVerifyTokens.published}`}
      className="border-forest-700/15 mx-auto grid size-36 place-items-center rounded-2xl border bg-white p-2 shadow-soft"
      aria-label={t("sampleTitle")}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={t("sampleTitle")} className="size-full" />
      ) : (
        <QrCode className="text-forest-700 size-10" aria-hidden />
      )}
    </Link>
  );
}

/** Public token entry. No session is required. */
export function VerifyLookup() {
  const t = useTranslations("verify");
  const locale = useCurrentLocale();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = parseVerifyToken(token);
    if (!next) {
      setError(t("tokenRequired"));
      return;
    }
    router.push(`/${locale}/verify/${encodeURIComponent(next)}`);
  }

  const samples = [
    { href: demoVerifyTokens.published, label: t("samplePublished") },
    { href: demoVerifyTokens.partial, label: t("samplePartial") },
    { href: demoVerifyTokens.unpublished, label: t("sampleHidden") },
    { href: INVALID_SAMPLE, label: t("sampleInvalid") },
  ];

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="font-display text-forest-900 text-3xl font-semibold tracking-tight">
          {t("lookupTitle")}
        </h1>
        <p className="text-ink-500 mt-2 text-sm leading-relaxed">{t("lookupSubtitle")}</p>
      </div>

      <GlassPanel className="p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-forest-900 text-sm font-medium">{t("tokenLabel")}</span>
            <Input
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setError(null);
              }}
              placeholder={t("tokenPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="h-12 px-3 font-mono text-base"
              aria-invalid={error ? true : undefined}
            />
          </label>
          {error ? <p className="text-terracotta-700 text-sm">{error}</p> : null}
          <Button type="submit" className="h-12 w-full text-base">
            {t("submit")}
          </Button>
        </form>
      </GlassPanel>

      <GlassPanel className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1 text-center">
          <h2 className="text-forest-900 text-sm font-semibold">{t("sampleTitle")}</h2>
          <p className="text-ink-500 text-xs leading-relaxed">{t("sampleHint")}</p>
        </div>
        <SampleQr />
        <ul className="space-y-2">
          {samples.map((sample) => (
            <li key={sample.href}>
              <Link
                href={`/${locale}/verify/${sample.href}`}
                className="border-forest-700/10 hover:bg-forest-700/5 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm"
              >
                <span className="text-forest-900 font-medium">{sample.label}</span>
                <span className="text-ink-500 truncate font-mono text-xs">{sample.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
