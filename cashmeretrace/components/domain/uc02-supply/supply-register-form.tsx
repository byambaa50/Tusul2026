"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import ConfirmDialog from "@/components/domain/shared/confirm-dialog";
import FormRow from "@/components/domain/shared/form-row";
import GeoSelect from "@/components/domain/shared/geo-select";
import SupplierStatusBanner from "@/components/domain/supplier/supplier-status-banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";
import { supplierById } from "@/lib/mock/suppliers";
import { addSupply } from "@/lib/mock/supplies";
import { formatDate, formatNumber } from "@/lib/format/mn";

type Values = {
  amount: string;
  aimag: string | null;
  soum: string | null;
  livestock: string;
  date: string;
};

const EMPTY_VALUES: Values = { amount: "", aimag: null, soum: null, livestock: "", date: "" };

/**
 * UC-02 — Нийлүүлэлтийн хэмжээ, гарал үүсэл бүртгэх (FR-1.3, FR-1.4):
 * precondition E1 — only түгжээгүй (идэвхтэй) suppliers get the form,
 * otherwise the block panel shows the status reason; E2 marks missing
 * required fields and returns; step 8 stores the record linked ONLY to the
 * user's own supplier record (BR-05); A1 «Цуцлах» asks through
 * ConfirmDialog; A2 «Дахин нийлүүлэх» loops from the success dialog.
 * Хэмжээ unit kg (deferred decision), малын тоо integer, огноо not in the
 * future — client-side demo validation.
 */
export default function SupplyRegisterForm() {
  const t = useTranslations("supplier.supply");
  const tb = useTranslations("supplier.blockedSupply");
  const tc = useTranslations("common");
  const session = useSession();

  const supplier = supplierById(session.supplierId);

  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<"amount" | "aimag" | "soum" | "livestock" | "date", string>>>({});
  const [summary, setSummary] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTopError(null);
  };

  function reset() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setSummary(false);
    setTopError(null);
  }

  const todayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requiredMessage = tc("errors.required");
    const next: typeof errors = {};
    if (!values.amount.trim()) next.amount = requiredMessage;
    if (!values.aimag) next.aimag = requiredMessage;
    if (!values.soum) next.soum = requiredMessage;
    if (!values.livestock.trim()) next.livestock = requiredMessage;
    if (!values.date) next.date = requiredMessage;

    const amount = Number(values.amount);
    if (!next.amount && (!Number.isFinite(amount) || amount <= 0)) {
      next.amount = t("error.amount");
    }
    const livestock = Number(values.livestock);
    if (!next.livestock && (!Number.isInteger(livestock) || livestock <= 0)) {
      next.livestock = t("error.livestock");
    }
    if (!next.date && values.date > todayIso()) {
      next.date = t("error.dateFuture"); // E2: not-future check
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      setSummary(true);
      return;
    }
    setErrors({});
    setSummary(false);

    // Step 8: linked to own supplier record only (BR-05). E3: a storage
    // failure keeps the form data and never shows the success dialog.
    try {
      addSupply({
        supplierId: supplier?.id ?? "",
        amountKg: amount,
        aimag: values.aimag ?? "",
        soum: values.soum ?? "",
        livestockCount: livestock,
        dateIso: values.date,
      });
    } catch {
      setTopError(t("error.storage"));
      return;
    }
    setTopError(null);
    setSuccessOpen(true); // Step 10 → A2 loop
  }

  const blockedReason =
    supplier?.status === "rejected" ? supplier.rejectReason ?? null : null;

  if (supplier && supplier.status !== "active") {
    // UC-02 E1: бүртгэл түгжээгүй биш → block with the status reason.
    return (
      <section className="rounded-block border border-terracotta-500/30 bg-terracotta-500/10 p-5">
        <h2 className="text-terracotta-700 font-display font-semibold">{tb("title")}</h2>
        <p className="text-ink-700 mt-2 text-sm leading-relaxed">{tb("body")}</p>
        <SupplierStatusBanner status={supplier.status} reason={blockedReason} className="mt-3 bg-transparent p-0" />
      </section>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {summary ? (
          <p
            role="alert"
            className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
          >
            {t("error.summaryRequired")}
          </p>
        ) : null}

        {topError ? (
          <p
            role="alert"
            className="border-terracotta-500/40 bg-terracotta-500/10 text-terracotta-700 rounded-field border p-3 text-sm leading-relaxed"
          >
            {topError}
          </p>
        ) : null}

        <section className="flex flex-col gap-3">
          <header>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("section.amount")}
            </h2>
            <p className="text-ink-500 mt-0.5 text-xs">{t("section.amountHint")}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow
              label={`${t("field.amount")} (${t("field.amountUnit")})`}
              htmlFor="supply-amount"
              required
              error={errors.amount}
            >
              <Input
                id="supply-amount"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={values.amount}
                onChange={(event) => set("amount", event.target.value)}
                className="bg-linen/80 h-11 rounded-field tabular-nums"
              />
            </FormRow>

            <FormRow label={t("field.date")} htmlFor="supply-date" required error={errors.date}>
              <Input
                id="supply-date"
                type="date"
                max={todayIso()}
                value={values.date}
                onChange={(event) => set("date", event.target.value)}
                className="bg-linen/80 h-11 rounded-field tabular-nums"
              />
            </FormRow>
          </div>
        </section>

        <section className="border-brown-500/15 flex flex-col gap-3 border-t pt-5">
          <header>
            <h2 className="text-forest-900 font-display text-base font-semibold">
              {t("section.origin")}
            </h2>
            <p className="text-ink-500 mt-0.5 text-xs">{t("section.originHint")}</p>
          </header>

          <GeoSelect
            aimag={values.aimag}
            soum={values.soum}
            onAimagChange={(value) => {
              set("aimag", value);
              set("soum", null); // dependent reset: sums belong to the aimag
            }}
            onSoumChange={(value) => set("soum", value)}
            labels={{
              aimag: t("field.aimag"),
              soum: t("field.soum"),
              aimagPlaceholder: t("aimagPlaceholder"),
              soumPlaceholder: t("soumPlaceholder"),
              soumNone: t("soumNone"),
            }}
            aimagError={errors.aimag}
            soumError={errors.soum}
          />

          <FormRow
            label={t("field.livestock")}
            htmlFor="supply-livestock"
            required
            hint={t("hint.livestock")}
            error={errors.livestock}
            className="sm:max-w-[calc(50%_-_0.5rem)]"
          >
            <Input
              id="supply-livestock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.livestock}
              onChange={(event) => set("livestock", event.target.value)}
              className="bg-linen/80 h-11 rounded-field tabular-nums"
            />
          </FormRow>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="bg-linen/60 rounded-field"
            onClick={() => setCancelOpen(true)}
          >
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" className="rounded-field font-semibold">
            {t("submit")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        confirmLabel={t("confirmCancel")}
        cancelLabel={t("continue")}
        danger
        onConfirm={reset} // UC-02 A1: nothing saved
      />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="glass-g2 rounded-block gap-3" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-forest-900 font-display text-lg font-semibold">
              {t("successTitle")}
            </DialogTitle>
            <DialogDescription className="text-ink-700 leading-relaxed">
              {t("successBody")}
            </DialogDescription>
          </DialogHeader>
          {values.date && values.amount ? (
            <p className="text-ink-500 tabular-nums text-xs">
              {formatDate(values.date)} · {formatNumber(Number(values.amount))}{" "}
              {t("field.amountUnit")}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="bg-linen/60 rounded-field"
              onClick={() => {
                reset();
                setSuccessOpen(false);
              }}
            >
              {t("again")} {/* A2: loop back to the form */}
            </Button>
            <Button
              type="button"
              className="rounded-field font-semibold"
              onClick={() => setSuccessOpen(false)}
            >
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
