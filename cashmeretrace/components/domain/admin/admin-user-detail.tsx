"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import DemoNote from "@/components/domain/shared/demo-note";
import EmptyState from "@/components/domain/shared/empty-state";
import PageHeader from "@/components/domain/shared/page-header";
import {
  AccountStatusBadge,
  AdminOnlyNote,
  AdminPageSkeleton,
  AdminSection,
  RoleLabel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format/mn";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useCurrentLocale } from "@/lib/i18n/use-current-locale";
import {
  assignStaffRole,
  approveSupplierAccount,
  isProtectedDemoAdmin,
  rejectSupplierAccount,
  setStaffStatus,
  setSupplierAccountStatus,
  staffRoles,
  toDirectoryAccount,
  useStaffUsers,
  type StaffRole,
} from "@/lib/mock/admin";
import { useSuppliers } from "@/lib/mock/suppliers";

export default function AdminUserDetail({ userId }: { userId: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <AdminPageSkeleton />;
  return <AdminUserDetailContent userId={userId} />;
}

function AdminUserDetailContent({ userId }: { userId: string }) {
  const t = useTranslations("admin.detail");
  const tc = useTranslations("admin.common");
  const tr = useTranslations("nav.roles");
  const ta = useTranslations("admin.approvals");
  const td = useTranslations("admin.dialogs");
  const tt = useTranslations("admin.form");
  const ts = useTranslations("management.supplierTypes");
  const locale = useCurrentLocale();
  const staff = useStaffUsers();
  const suppliers = useSuppliers();

  const account = useMemo(() => {
    const staffUser = staff.find((user) => user.id === userId);
    if (staffUser) {
      return {
        id: staffUser.id,
        kind: "staff" as const,
        name: staffUser.name,
        username: staffUser.username,
        email: staffUser.email,
        phone: staffUser.phone,
        role: staffUser.role,
        status: staffUser.status,
        aimag: staffUser.aimag,
        soum: staffUser.soum,
        registeredOn: staffUser.registeredOn,
        updatedOn: staffUser.updatedOn,
        rejectReason: staffUser.rejectReason,
      };
    }
    const supplier = suppliers.find((entry) => entry.id === userId);
    return supplier ? toDirectoryAccount(supplier) : null;
  }, [staff, suppliers, userId]);

  const [role, setRole] = useState<StaffRole | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (!account) {
    return (
      <EmptyState
        title={t("notFound")}
        description={t("notFoundHint")}
      />
    );
  }

  const selectedRole = role ?? (account.kind === "staff" ? account.role : "clerk");
  const protectedAdmin = isProtectedDemoAdmin(account);
  const back = (
    <Button asChild variant="outline" className="bg-linen/60 rounded-field">
      <Link href={`/${locale}/admin/users`}>{t("backToList")}</Link>
    </Button>
  );

  const run = (action: () => void) => {
    setError(null);
    setNotice(null);
    try {
      action();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(code === "PROTECTED_ADMIN" ? tc("protectedAdmin") : tc("storageError"));
    }
  };

  return (
    <>
      <PageHeader title={account.name} description={t("subtitle")} actions={back} />
      <AdminOnlyNote className="mb-4" />

      <AdminSection title={t("identityTitle")}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label={tc("columns.name")} value={account.name} />
          <Field label="ID" value={account.id} />
          <Field label={tc("columns.username")} value={account.username} />
          <Field label={t("kindStaff").includes("ажил") || account.kind === "staff" ? t(account.kind === "staff" ? "kindStaff" : "kindSupplier") : t("kindSupplier")} value={account.kind === "staff" ? t("kindStaff") : t("kindSupplier")} />
          <Field label={tc("columns.role")} value={<RoleLabel role={account.role} />} />
          <div>
            <dt className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">{tc("columns.status")}</dt>
            <dd className="mt-1">
              <AccountStatusBadge status={account.status} />
            </dd>
          </div>
          <Field label={tc("columns.contact")} value={`${account.phone} · ${account.email}`} />
          <Field label={tc("columns.origin")} value={`${account.aimag} · ${account.soum}`} />
          <Field label={tc("columns.registeredOn")} value={formatDate(account.registeredOn)} />
          {account.updatedOn ? <Field label={t("updated")} value={formatDate(account.updatedOn)} /> : null}
          {account.supplierType ? (
            <Field label={tt("type")} value={ts(account.supplierType)} />
          ) : null}
        </dl>
      </AdminSection>

      <AdminSection className="mt-4" title={t("roleTitle")} description={account.kind === "supplier" ? t("supplierRoleHint") : t("roleHint")}>
        {account.kind === "supplier" || protectedAdmin ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink-700 text-sm">
              {t("roleCurrent")}: <span className="text-forest-900 font-medium"><RoleLabel role={account.role} /></span>
            </p>
            {protectedAdmin ? <DemoNote>{t("protectedNote")}</DemoNote> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-48 flex-col gap-1.5">
              <Label htmlFor="assign-role">{t("roleCurrent")}</Label>
              <Select value={selectedRole} onValueChange={(value) => setRole(value as StaffRole)}>
                <SelectTrigger id="assign-role" className="bg-linen/80 h-10 rounded-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staffRoles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {tr(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="rounded-field font-semibold"
              disabled={selectedRole === account.role}
              onClick={() =>
                run(() => {
                  assignStaffRole(account.id, selectedRole as StaffRole);
                  setNotice(t("roleSaved"));
                })
              }
            >
              {t("roleSave")}
            </Button>
          </div>
        )}
      </AdminSection>

      <AdminSection className="mt-4" title={t("statusTitle")} description={t("statusHint")}>
        <div className="flex flex-col gap-3">
          <AccountStatusBadge status={account.status} />
          {account.rejectReason ? (
            <p className="text-ink-700 text-sm leading-relaxed">
              <span className="text-forest-800 font-medium">{t("reason")}: </span>
              {account.rejectReason}
            </p>
          ) : null}
          <p className="text-ink-500 text-xs leading-relaxed">{t("lockNote")}</p>
          {protectedAdmin ? <DemoNote>{t("protectedNote")}</DemoNote> : null}
          {!protectedAdmin ? (
            <div className="flex flex-wrap gap-2">
              {account.kind === "supplier" && account.status === "pending" ? (
                <>
                  <Button type="button" className="rounded-field font-semibold" onClick={() => setApproveOpen(true)}>
                    {t("approve")}
                  </Button>
                  <Button type="button" variant="outline" className="bg-linen/60 rounded-field" onClick={() => setRejectOpen(true)}>
                    {t("reject")}
                  </Button>
                </>
              ) : null}
              {account.status === "active" ? (
                <Button type="button" variant="outline" className="bg-linen/60 rounded-field" onClick={() => setLockOpen(true)}>
                  {t("lock")}
                </Button>
              ) : null}
              {account.status === "locked" || (account.kind === "staff" && account.status === "pending") ? (
                <Button type="button" className="rounded-field font-semibold" onClick={() => setActivateOpen(true)}>
                  {t("activate")}
                </Button>
              ) : null}
            </div>
          ) : null}
          {notice ? <p className="text-forest-800 text-sm">{notice}</p> : null}
          {error ? (
            <p role="alert" className="text-terracotta-700 text-sm">
              {error}
            </p>
          ) : null}
        </div>
      </AdminSection>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={ta("approveTitle")}
        description={ta("approveBody", { name: account.name })}
        confirmLabel={ta("approveConfirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() => run(() => approveSupplierAccount(account.id))}
      />
      <ConfirmDialog
        open={lockOpen}
        onOpenChange={setLockOpen}
        title={td("lockTitle")}
        description={td("lockBody", { name: account.name })}
        confirmLabel={td("lockConfirm")}
        cancelLabel={tc("cancel")}
        danger
        onConfirm={() =>
          run(() => {
            if (account.kind === "supplier") setSupplierAccountStatus(account.id, "locked");
            else setStaffStatus(account.id, "locked");
          })
        }
      />
      <ConfirmDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title={td("activateTitle")}
        description={td("activateBody", { name: account.name })}
        confirmLabel={td("activateConfirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() =>
          run(() => {
            if (account.kind === "supplier") setSupplierAccountStatus(account.id, "active");
            else setStaffStatus(account.id, "active");
          })
        }
      />
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="glass-g2 rounded-block sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display">{ta("rejectTitle")}</DialogTitle>
            <DialogDescription>{ta("rejectBody", { name: account.name })}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">{ta("rejectReason")}</Label>
            <textarea
              id="reject-reason"
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
            <Button type="button" variant="outline" className="bg-linen/60 rounded-field" onClick={() => setRejectOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-field font-semibold"
              onClick={() => {
                if (!reason.trim()) {
                  setReasonError(ta("rejectRequired"));
                  return;
                }
                run(() => rejectSupplierAccount(account.id, reason.trim()));
                setRejectOpen(false);
                setReason("");
              }}
            >
              {ta("rejectConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-500 text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-forest-900 mt-1 text-sm">{value}</dd>
    </div>
  );
}
