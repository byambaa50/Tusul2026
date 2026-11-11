"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";

import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import TablePager, { usePageSlice } from "@/components/domain/shared/table-pager";
import { AdminOnlyNote, AdminPageSkeleton, AuditChangeList, RoleLabel } from "@/components/domain/admin/admin-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useAuditLog, type AuditEntry } from "@/lib/mock/admin";

const entities = ["all", "user", "supplier", "settings"] as const;

export default function AdminAuditLog() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminAuditContent />;
}

function AdminAuditContent() {
  const t = useTranslations("admin.audit");
  const tc = useTranslations("admin.common");
  const audit = useAuditLog();
  const [entity, setEntity] = useState<(typeof entities)[number]>("all");

  const rows = useMemo(
    () => audit.filter((entry) => entity === "all" || entry.entity === entity),
    [audit, entity],
  );
  const pageSlice = usePageSlice(rows, entity);

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminOnlyNote className="mb-4" />

      <GlassPanel tier="g2" className="mb-4 p-5">
        <div className="max-w-xs">
          <Select value={entity} onValueChange={(value) => setEntity(value as (typeof entities)[number])}>
            <SelectTrigger className="bg-linen/80 h-10 w-full rounded-field" aria-label={t("entityFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entities.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`entities.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassPanel>

      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <GlassPanel tier="g2" className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{tc("columns.when")}</TableHead>
                <TableHead>{tc("columns.who")}</TableHead>
                <TableHead>{tc("columns.action")}</TableHead>
                <TableHead>{tc("columns.what")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.rows.map((entry) => (
                <AuditRow key={entry.id} entry={entry} actionLabel={t(`actions.${entry.action}`)} />
              ))}
            </TableBody>
          </Table>
          <TablePager
            page={pageSlice.page}
            pages={pageSlice.pages}
            total={pageSlice.total}
            from={pageSlice.from}
            to={pageSlice.to}
            onPage={pageSlice.setPage}
          />
        </GlassPanel>
      )}
      <DemoNote className="mt-4">{tc("demoNote")}</DemoNote>
    </>
  );
}

function AuditRow({ entry, actionLabel }: { entry: AuditEntry; actionLabel: string }) {
  return (
    <TableRow>
      <TableCell className="text-ink-700 align-top text-xs whitespace-nowrap tabular-nums">
        {formatDateTime(entry.occurredAt)}
      </TableCell>
      <TableCell className="align-top">
        <p className="text-forest-800 text-sm font-medium">{entry.actorName}</p>
        <p className="text-ink-500 text-xs">
          <RoleLabel role={entry.actorRole} />
        </p>
      </TableCell>
      <TableCell className="align-top">
        <p className="text-forest-900 text-sm font-medium">{actionLabel}</p>
        <p className="text-ink-500 text-xs">
          {entry.entityLabel}
          <span className="tabular-nums"> · {entry.entityId}</span>
        </p>
      </TableCell>
      <TableCell className="align-top">
        <AuditChangeList changes={entry.changes} />
      </TableCell>
    </TableRow>
  );
}
