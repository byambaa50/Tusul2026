import { cn } from "@/lib/utils";

/**
 * Standard page intro: display heading (Lora) + optional sub-line + action slot.
 */
type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/** Standard page intro: display heading + optional sub-line + action slot. */
export default function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-forest-900 font-sans text-[1.65rem] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-ink-700 mt-1 max-w-2xl text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
