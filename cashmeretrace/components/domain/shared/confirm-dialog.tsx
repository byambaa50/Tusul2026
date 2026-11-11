"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive confirmation (e.g. UC-01/UC-02 А1 «Цуцлах» discard). */
  danger?: boolean;
  onConfirm: () => void;
};

/**
 * Reusable confirmation dialog (A1 «Цуцлах» paths in UC-01/UC-02):
 * explicit cancel/confirm so demoing a discard is deliberate. Glass G2
 * surface to match the approved dialog styling.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-g2 rounded-block gap-3" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-forest-900 font-display text-base leading-snug font-semibold">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-ink-700 leading-relaxed">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="bg-linen/60 rounded-field"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            className="rounded-field font-semibold"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
