"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import StatusBadge from "@/components/domain/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/providers/session-provider";
import { useBatchesFor } from "@/lib/mock/batches";
import { formatDate, formatNumber } from "@/lib/format/mn";
import type { Batch } from "@/lib/types/domain";

/**
 * UC-03 — Өөрийн багцын чанарын мэдээлэл харах (FR-1.5):
 * own batches list (BR-05/FR-1.5 — other suppliers' data never renders) →
 * row select opens the detail dialog; A2 «Бусад багц сонгох» closes back to
 * the list; A1 — when a batch has no lab result yet the dialog/shows
 * «Үр дүн хараахан бүртгэгдээгүй» and the list remains. Units are a
 * deferred decision (µm, %).
 */
export default function BatchQuality() {
  const t = useTranslations("supplier.quality");
  const ts = useTranslations("status");
  const session = useSession();

  const batches = useBatchesFor(session.supplierId);
  const [selected, setSelected] = useState<Batch | null>(null);

  const toneByCode = (batch: Batch) =>
    batch.status === "tested" ? "batch-tested" : "batch-registered";

  return (
    <>
      <GlassPanel tier="g2" className="p-6 sm:p-8">
        <header className="mb-4">
          <h2 className="text-forest-900 font-display text-lg font-semibold">{t("title")}</h2>
        </header>

        {batches.length === 0 ? (
          /* UC-03 A1 — list stays, result never registered */
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyHint")}
            className="border-transparent bg-transparent py-10"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("col.code")}</TableHead>
                  <TableHead>{t("col.registeredOn")}</TableHead>
                  <TableHead className="text-right">{t("col.amount")}</TableHead>
                  <TableHead>{t("col.origin")}</TableHead>
                  <TableHead>{t("col.test")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("rowOpen")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <span className="bg-ivory-50 text-ink-900 tabular-nums rounded-field border px-2.5 py-1 text-xs font-medium tracking-wide">
                        {batch.id}
                      </span>
                    </TableCell>
                    <TableCell className="text-ink-700 tabular-nums">
                      {formatDate(batch.registeredOn)}
                    </TableCell>
                    <TableCell className="text-ink-700 text-right tabular-nums">
                      {formatNumber(batch.amountKg)}
                    </TableCell>
                    <TableCell className="text-ink-700">
                      {batch.aimag} · {batch.soum}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={toneByCode(batch)}
                        label={ts(`batch.${batch.status}`)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(batch)}
                        aria-haspopup="dialog"
                      >
                        {t("rowOpen")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-ink-500 mt-3 text-xs">{t("codeNote")}</p>
          </>
        )}

        <DemoNote className="mt-4">{t("onlyOwn")}</DemoNote>
      </GlassPanel>

      {/* Detail dialog: the selected batch's quality parameters (FR-2.2). */}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="glass-g2 rounded-block gap-4 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display text-lg font-semibold">
              {selected ? selected.id : ""}
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="text-ink-700 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <span className="opacity-75">{t("detailStatus")}</span>
              <span>
                <StatusBadge
                  status={toneByCode(selected)}
                  label={ts(`batch.${selected.status}`)}
                />
              </span>
              <span className="opacity-75">{t("detailDate")}</span>
              <span className="tabular-nums">{formatDate(selected.registeredOn)}</span>
              <span className="opacity-75">{t("detailOrigin")}</span>
              <span>
                {selected.aimag} · {selected.soum}
              </span>

              {selected.test ? (
                <>
                  <span className="opacity-75">{t("fineness")}</span>
                  <span className="tabular-nums">
                    {formatNumber(selected.test.finenessMicron, 1)} {t("unitMicron")}
                  </span>
                  <span className="opacity-75">{t("yield")}</span>
                  <span className="tabular-nums">
                    {formatNumber(selected.test.cleanYieldPct, 1)} {t("unitPercent")}
                  </span>
                  <span className="opacity-75">{t("impurity")}</span>
                  <span className="tabular-nums">
                    {formatNumber(selected.test.impurityPct, 1)} {t("unitPercent")}
                  </span>
                  <span className="opacity-75">{t("testedOn")}</span>
                  <span className="tabular-nums">{formatDate(selected.test.testedOn)}</span>
                </>
              ) : (
                <div className="col-span-2">
                  {/* UC-03 A1 */}
                  <EmptyState
                    title={t("noResult")}
                    description={t("noResultHint")}
                    className="px-6 py-8"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-brown-500/15 pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="bg-linen/60 rounded-field"
              onClick={() => setSelected(null)}
            >
              {t("selectAnother")} {/* A2: select another */}
            </Button>
            <Button
              type="button"
              className="rounded-field font-semibold"
              onClick={() => setSelected(null)}
            >
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
