"use client";

import FormRow from "@/components/domain/shared/form-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aimagEntries, soumsOfAimag } from "@/lib/mock/geo";

type Props = {
  aimag: string | null;
  soum: string | null;
  onAimagChange: (value: string) => void;
  onSoumChange: (value: string) => void;
  labels: { aimag: string; soum: string; aimagPlaceholder: string; soumPlaceholder: string; soumNone: string };
  aimagError?: string | null;
  soumError?: string | null;
  required?: boolean;
};

/**
 * Dependent аймаг → сум selection pair (UC-01 registration, UC-02 origin):
 * choosing an aimag filters/re-exposes its soums; the soum selection and
 * both error slots are always reserved (FieldError in FormRow).
 */
export default function GeoSelect({
  aimag,
  soum,
  onAimagChange,
  onSoumChange,
  labels,
  aimagError = null,
  soumError = null,
  required = true,
}: Props) {
  const soums = soumsOfAimag(aimag);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormRow label={labels.aimag} htmlFor="geo-aimag" required={required} error={aimagError}>
        <Select
          value={aimag ?? ""}
          onValueChange={(value) => onAimagChange(value)}
        >
          <SelectTrigger
            id="geo-aimag"
            aria-invalid={aimagError ? true : undefined}
            className="bg-linen/80 h-11 w-full rounded-field"
          >
            <SelectValue placeholder={labels.aimagPlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-field">
            {aimagEntries.map((entry) => (
              <SelectItem key={entry.aimag} value={entry.aimag}>
                {entry.aimag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label={labels.soum} htmlFor="geo-soum" required={required} error={soumError}>
        <Select
          key={aimag ?? "none"}
          value={soum ?? ""}
          disabled={!soums.length}
          onValueChange={(value) => onSoumChange(value)}
        >
          <SelectTrigger
            id="geo-soum"
            aria-invalid={soumError ? true : undefined}
            className="bg-linen/80 h-11 w-full rounded-field"
          >
            <SelectValue placeholder={!soums.length ? labels.soumNone : labels.soumPlaceholder} />
          </SelectTrigger>
          <SelectContent className="rounded-field">
            {soums.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>
    </div>
  );
}
