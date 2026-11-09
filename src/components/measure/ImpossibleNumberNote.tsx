import { IMPOSSIBLE_NUMBER_MESSAGE } from "@/lib/ledger/entryCheck";

/** Friendly inline note shown next to a field whose number is outside the metric's physical range. */
export function ImpossibleNumberNote({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <p role="alert" data-testid="impossible-number" className={`text-xs text-destructive mt-1 ${className}`}>
      {IMPOSSIBLE_NUMBER_MESSAGE}
    </p>
  );
}
