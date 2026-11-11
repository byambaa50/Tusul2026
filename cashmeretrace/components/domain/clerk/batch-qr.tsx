"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download, Printer, QrCode } from "lucide-react";
import QRCode from "qrcode";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import StatusBadge from "@/components/domain/shared/status-badge";
import { ClerkPageSkeleton, DetailItem, RecordNotFound } from "@/components/domain/clerk/clerk-ui";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { useBatches } from "@/lib/mock/batches";
import { generateQr, markQrReady, useQrRecords } from "@/lib/mock/qr";
import { useSuppliers } from "@/lib/mock/suppliers";

/**
 * UC-06 / FR-2.8 — QR generation and preview. The image is rendered
 * client-side from the stored payload; downloading or printing it performs
 * the demo readability confirmation and moves the status to
 * «АшиглахадБэлэн».
 */
export default function BatchQr({ batchId }: { batchId: string }) {
  const tq = useTranslations("clerk.qr");
  const hydrated = useHydrated();
  const locale = useCurrentLocale();
  const batches = useBatches();
  const batch = batches.find((entry) => entry.id === batchId) ?? null;

  if (!hydrated) return <ClerkPageSkeleton />;
  if (!batch) {
    return (
      <RecordNotFound
        title={tq("batchMissing")}
        description={tq("batchMissingHint")}
        backHref={`/${locale}/clerk/batches/qr`}
        backLabel={tq("backToCenter")}
      />
    );
  }
  return <BatchQrContent batchId={batch.id} />;
}

function BatchQrContent({ batchId }: { batchId: string }) {
  const t = useTranslations("clerk.batch");
  const tq = useTranslations("clerk.qr");
  const tc = useTranslations("clerk.common");
  const ts = useTranslations("status");
  const locale = useCurrentLocale();

  const batches = useBatches();
  const qrRecords = useQrRecords();
  const suppliers = useSuppliers();

  const batch = batches.find((entry) => entry.id === batchId);
  const record = qrRecords.find((entry) => entry.batchId === batchId) ?? null;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const payload = record?.payload ?? null;

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1e3a2b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setRenderFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRenderFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!batch) return null;

  const supplier = suppliers.find((entry) => entry.id === batch.supplierId) ?? null;
  const activeBatch = batch;

  function handleGenerate() {
    setFeedback(null);
    try {
      generateQr(activeBatch.id);
    } catch {
      setFeedback(tq("generateError"));
    }
  }

  function markReady() {
    try {
      markQrReady(activeBatch.id);
    } catch {
      setFeedback(tq("readyError"));
    }
  }

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `CashmereTrace-${activeBatch.id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    markReady();
  }

  function handlePrint() {
    if (!dataUrl) return;
    window.print();
    markReady();
  }

  return (
    <>
      <PageHeader
        title={tq("screenTitle")}
        description={tq("screenSubtitle")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches/qr`}>{tq("backToCenter")}</Link>
            </Button>
            <Button asChild className="rounded-field font-semibold">
              <Link href={`/${locale}/clerk/batches/${batch.id}`}>{tq("openBatch")}</Link>
            </Button>
          </>
        }
      />

      {feedback ? (
        <p
          role="alert"
          className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field mb-4 border p-3 text-sm"
        >
          {feedback}
        </p>
      ) : null}

      {!record ? (
        <GlassPanel tier="g2" className="p-6 sm:p-10">
          <EmptyState
            icon={QrCode}
            title={tq("missingTitle")}
            description={tq("missingHint")}
            className="border-transparent bg-transparent"
          />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              className="rounded-field font-semibold"
              onClick={() => setConfirmOpen(true)}
            >
              <QrCode aria-hidden />
              {tq("generateConfirm")}
            </Button>
            <Button asChild variant="outline" className="bg-linen/60 rounded-field">
              <Link href={`/${locale}/clerk/batches/${batch.id}`}>{tq("openBatch")}</Link>
            </Button>
          </div>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <GlassPanel tier="g2" className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={record.status === "ready" ? "qr-ready" : "qr-created"}
                label={ts(`qr.${record.status}`)}
              />
              <span className="text-ink-500 text-xs">{tq("statusLabel")}</span>
            </div>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <DetailItem label={tq("batchLabel")}>
                <Link
                  href={`/${locale}/clerk/batches/${batch.id}`}
                  className="text-forest-800 tabular-nums underline-offset-4 hover:underline"
                >
                  {batch.id}
                </Link>
              </DetailItem>
              <DetailItem label={tq("supplierLabel")}>
                {supplier ? (
                  <Link
                    href={`/${locale}/clerk/suppliers/${supplier.id}`}
                    className="text-forest-800 underline-offset-4 hover:underline"
                  >
                    {supplier.name}
                  </Link>
                ) : (
                  batch.supplierId
                )}
              </DetailItem>
              <DetailItem label={t("colOrigin")}>
                {batch.aimag} · {batch.soum}
              </DetailItem>
              <DetailItem label={tq("createdAt")}>
                <span className="tabular-nums">
                  {formatDateTime(record.createdAt)}
                </span>
              </DetailItem>
              {record.readyAt ? (
                <DetailItem label={tq("readyAt")}>
                  <span className="tabular-nums">
                    {formatDateTime(record.readyAt)}
                  </span>
                </DetailItem>
              ) : null}
              <DetailItem label={tq("tokenLabel")}>
                <span className="text-xs break-all">{record.token}</span>
              </DetailItem>
              <DetailItem label={tq("payloadLabel")} className="sm:col-span-2">
                <span className="text-xs break-all">{record.payload}</span>
              </DetailItem>
            </dl>
          </GlassPanel>

          <GlassPanel tier="g2" className="p-6">
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {tq("previewTitle")}
            </h2>

            <div className="qr-print-area mt-4 flex flex-col items-center gap-3">
              <div className="border-brown-500/20 bg-white rounded-field border p-3">
                {renderFailed ? (
                  <p role="alert" className="text-terracotta-600 p-8 text-center text-sm">
                    {tq("renderError")}
                  </p>
                ) : dataUrl ? (
                  <Image
                    src={dataUrl}
                    alt={`QR ${batch.id}`}
                    width={320}
                    height={320}
                    unoptimized
                    className="size-56 sm:size-72"
                  />
                ) : (
                  <div className="text-ink-500 grid size-56 place-items-center text-center text-sm sm:size-72">
                    {tq("rendering")}
                  </div>
                )}
              </div>
              <p className="text-forest-800 text-sm font-medium tabular-nums">{batch.id}</p>
              <p className="text-ink-500 text-xs">{tq("readabilityNote")}</p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="bg-linen/60 rounded-field flex-1"
                disabled={!dataUrl}
                onClick={handleDownload}
              >
                <Download aria-hidden />
                {tq("download")}
              </Button>
              <Button
                type="button"
                className="rounded-field flex-1 font-semibold"
                disabled={!dataUrl}
                onClick={handlePrint}
              >
                <Printer aria-hidden />
                {tq("print")}
              </Button>
            </div>

            <p className="text-ink-500 mt-3 text-xs leading-relaxed">
              {record.status === "ready" ? tq("readyDone") : tq("readyHint")}
            </p>
          </GlassPanel>
        </div>
      )}

      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tq("generateConfirmTitle")}
        description={tq("generateConfirmBody", { code: batch.id })}
        confirmLabel={tq("generateConfirm")}
        cancelLabel={tc("continueEditing")}
        onConfirm={handleGenerate}
      />

      <style>{`
        @media print {
          @page { margin: 14mm; }
          body * { visibility: hidden; }
          .qr-print-area, .qr-print-area * { visibility: visible; }
          .qr-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: auto;
            padding: 0;
            margin: 0;
          }
          .qr-print-area img {
            width: 62mm;
            height: 62mm;
          }
          .qr-print-area p { color: #1e3a2b; }
          .qr-print-area > div { border: 1px solid #e7e2d8; padding: 4mm; }
        }
      `}</style>
    </>
  );
}
