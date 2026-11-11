import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** 20px pre-reserved error slot — E-code messages never shift the layout. */
export function FieldError({ message }: { message?: string | null }) {
  return (
    <p
      aria-live="polite"
      role={message ? "alert" : undefined}
      className={cn(
        "text-terracotta-600 h-5 pt-0.5 text-xs",
        message ? "" : "invisible",
      )}
    >
      {message ?? ""}
    </p>
  );
}

type FormRowProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Form field wrapper: label (+ optional required asterisk), the field, an
 * optional hint, and an always-present error slot below the field.
 */
export default function FormRow({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className,
}: FormRowProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-ink-900 text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden title="required" className="text-terracotta-500 ml-0.5">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="text-ink-500 text-xs">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}
