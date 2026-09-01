import { Info } from "lucide-react";

/**
 * Honest empty state. We never render a preview or placeholder number —
 * if the sample is empty, we say exactly what is missing and what fills it.
 */
export function CalibrationEmptyState({
  headline,
  detail,
}: {
  headline: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{headline}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
