"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import EmptyState from "@/components/domain/shared/empty-state";
import GlassPanel from "@/components/domain/shared/glass-panel";
import PageHeader from "@/components/domain/shared/page-header";
import {
  AccountStatusBadge,
  AdminOnlyNote,
  AdminPageSkeleton,
} from "@/components/domain/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import { approveSupplierAccount, rejectSupplierAccount } from "@/lib/mock/admin";
import { useSuppliers } from "@/lib/mock/suppliers";
import type { Supplier } from "@/lib/types/domain";

export default function AdminApprovals() {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminApprovalsContent />;
}

function AdminApprovalsContent() {
  const t = useTranslations("admin.approvals");
  const tc = useTranslations("admin.common");
  const tt = useTranslations("management.supplierTypes");
  const locale = useCurrentLocale();
  const suppliers = useSuppliers();
  const pending = useMemo(
    () =>
      suppliers
        .filter((supplier) => supplier.status === "pending")
        .sort((a, b) => a.registeredOn.localeCompare(b.registeredOn) || a.name.localeCompare(b.name)),
    [suppliers],
  );

  const [approveTarget, setApproveTarget] = useState<Supplier | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Supplier | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => void) => {
    setError(null);
    try {
      action();
    } catch {
      setError(tc("storageError"));
    }
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AdminOnlyNote className="mb-4" />
      {error ? (
        <p role="alert" className="text-terracotta-700 mb-3 text-sm">
          {error}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState icon={BadgeCheck} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((supplier) => (
            <GlassPanel key={supplier.id} tier="g2" className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-forest-900 font-display text-lg font-semibold">{supplier.name}</h2>
                    <AccountStatusBadge status="pending" />
                  </div>
                  <p className="text-ink-500 mt-1 text-xs tabular-nums">{supplier.id}</p>
                  <p className="text-ink-700 mt-2 text-sm">
                    {tt(supplier.type)} · {supplier.aimag} · {supplier.soum}
                  </p>
                  <p className="text-ink-700 text-sm">
                    {supplier.phone} · {supplier.email}
                  </p>
                  <p className="text-ink-500 mt-1 text-xs">
                    {t("registeredOn", { date: formatDate(supplier.registeredOn) })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="bg-linen/60 rounded-field">
                    <Link href={`/${locale}/admin/users/${supplier.id}`}>{tc("view")}</Link>
                  </Button>
                  <Button type="button" size="sm" className="rounded-field font-semibold" onClick={() => setApproveTarget(supplier)}>
                    {t("approveConfirm")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="bg-linen/60 rounded-field"
                    onClick={() => {
                      setRejectTarget(supplier);
                      setReason("");
                      setReasonError(null);
                    }}
                  >
                    {t("rejectConfirm")}
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
        title={t("approveTitle")}
        description={approveTarget ? t("approveBody", { name: approveTarget.name }) : undefined}
        confirmLabel={t("approveConfirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() => {
          if (!approveTarget) return;
          run(() => approveSupplierAccount(approveTarget.id));
          setApproveTarget(null);
        }}
      />

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="glass-g2 rounded-block sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display">{t("rejectTitle")}</DialogTitle>
            <DialogDescription>
              {rejectTarget ? t("rejectBody", { name: rejectTarget.name }) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="approval-reason">{t("rejectReason")}</Label>
            <textarea
              id="approval-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              rows={3}
              className="border-input bg-linen/80 rounded-field w-full border px-3 py-2 text-sm outline-none"
            />
            {reasonError ? (
              <p role="alert" className="text-terracotta-700 text-xs">
                {reasonError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="bg-linen/60 rounded-field" onClick={() => setRejectTarget(null)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-field font-semibold"
              onClick={() => {
                if (!reason.trim()) {
                  setReasonError(t("rejectRequired"));
                  return;
                }
                if (!rejectTarget) return;
                run(() => rejectSupplierAccount(rejectTarget.id, reason.trim()));
                setRejectTarget(null);
                setReason("");
              }}
            >
              {t("rejectConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
