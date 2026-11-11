"use client";

import { useTranslations } from "next-intl";

import StatusBadge from "@/components/domain/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format/mn";
import type {
  ManagementAimagRow,
  ManagementMonthRow,
  ManagementRecentBatch,
  ManagementSoumRow,
} from "@/lib/mock/management";
import { cn } from "@/lib/utils";

function EmptyRow({ colSpan }: { colSpan: number }) {
  const t = useTranslations("management.common");
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-ink-500 py-7 text-center text-xs">
        {t("noData")}
      </TableCell>
    </TableRow>
  );
}

function decimal(value: number | null): string {
  return value === null ? "—" : formatNumber(value, 1);
}

export function AimagStatsTable({
  rows,
  showQuality = true,
  className,
}: {
  rows: ManagementAimagRow[];
  showQuality?: boolean;
  className?: string;
}) {
  const t = useTranslations("management.common");
  const colSpan = showQuality ? 8 : 5;

  return (
    <div className={cn("min-w-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("columns.aimag")}</TableHead>
            <TableHead className="text-right">{t("columns.soums")}</TableHead>
            <TableHead className="text-right">{t("columns.batches")}</TableHead>
            <TableHead className="text-right">
              {t("columns.amount")} ({t("unitKg")})
            </TableHead>
            <TableHead className="text-right">{t("columns.tested")}</TableHead>
            {showQuality ? (
              <>
                <TableHead className="text-right">
                  {t("columns.fineness")} ({t("unitMicron")})
                </TableHead>
                <TableHead className="text-right">
                  {t("columns.yield")} ({t("unitPercent")})
                </TableHead>
                <TableHead className="text-right">
                  {t("columns.admixture")} ({t("unitPercent")})
                </TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={colSpan} />
          ) : (
            rows.map((row) => (
              <TableRow key={row.aimag}>
                <TableCell className="text-forest-800 font-medium">{row.aimag}</TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.soumCount)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.batchCount)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.totalKg)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.testedBatches)}
                </TableCell>
                {showQuality ? (
                  <>
                    <TableCell className="text-ink-700 text-right tabular-nums">
                      {decimal(row.avgFinenessMicron)}
                    </TableCell>
                    <TableCell className="text-ink-700 text-right tabular-nums">
                      {decimal(row.avgCleanYieldPct)}
                    </TableCell>
                    <TableCell className="text-ink-700 text-right tabular-nums">
                      {decimal(row.avgImpurityPct)}
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function SoumStatsTable({
  rows,
  className,
}: {
  rows: ManagementSoumRow[];
  className?: string;
}) {
  const t = useTranslations("management.common");

  return (
    <div className={cn("min-w-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("columns.aimag")}</TableHead>
            <TableHead>{t("columns.soum")}</TableHead>
            <TableHead className="text-right">{t("columns.batches")}</TableHead>
            <TableHead className="text-right">
              {t("columns.amount")} ({t("unitKg")})
            </TableHead>
            <TableHead className="text-right">{t("columns.tested")}</TableHead>
            <TableHead className="text-right">
              {t("columns.fineness")} ({t("unitMicron")})
            </TableHead>
            <TableHead className="text-right">
              {t("columns.yield")} ({t("unitPercent")})
            </TableHead>
            <TableHead className="text-right">
              {t("columns.admixture")} ({t("unitPercent")})
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={8} />
          ) : (
            rows.map((row) => (
              <TableRow key={`${row.aimag}-${row.soum}`}>
                <TableCell className="text-ink-700">{row.aimag}</TableCell>
                <TableCell className="text-forest-800 font-medium">{row.soum}</TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.batchCount)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.totalKg)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.testedBatches)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {decimal(row.avgFinenessMicron)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {decimal(row.avgCleanYieldPct)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {decimal(row.avgImpurityPct)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function MonthlyStatsTable({
  rows,
  className,
}: {
  rows: ManagementMonthRow[];
  className?: string;
}) {
  const t = useTranslations("management.common");

  return (
    <div className={cn("min-w-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("columns.month")}</TableHead>
            <TableHead className="text-right">{t("columns.batches")}</TableHead>
            <TableHead className="text-right">
              {t("columns.amount")} ({t("unitKg")})
            </TableHead>
            <TableHead className="text-right">{t("columns.tested")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={4} />
          ) : (
            rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="text-forest-800 font-medium tabular-nums">
                  {row.label}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.batchCount)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.totalKg)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.testedBatches)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function RecentBatchesTable({
  rows,
  className,
}: {
  rows: ManagementRecentBatch[];
  className?: string;
}) {
  const t = useTranslations("management.common");

  return (
    <div className={cn("min-w-0", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("columns.batch")}</TableHead>
            <TableHead>{t("columns.origin")}</TableHead>
            <TableHead className="text-right">
              {t("columns.amount")} ({t("unitKg")})
            </TableHead>
            <TableHead className="text-right">{t("columns.livestock")}</TableHead>
            <TableHead>{t("columns.registeredOn")}</TableHead>
            <TableHead>{t("columns.quality")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-forest-800 font-medium tabular-nums">
                  {row.id}
                </TableCell>
                <TableCell className="text-ink-700">
                  {row.aimag} · {row.soum}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {formatNumber(row.amountKg)}
                </TableCell>
                <TableCell className="text-ink-700 text-right tabular-nums">
                  {row.livestockCount === null ? "—" : formatNumber(row.livestockCount)}
                </TableCell>
                <TableCell className="text-ink-700 tabular-nums">
                  {formatDate(row.registeredOn)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={row.tested ? "batch-tested" : "batch-registered"}
                    label={
                      row.tested ? t("status.tested") : t("status.registered")
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
