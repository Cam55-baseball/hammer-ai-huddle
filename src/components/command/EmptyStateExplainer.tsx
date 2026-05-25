import { Lightbulb } from "lucide-react";

/**
 * Deterministic empty-state copy for an intelligence card. No fabricated metrics.
 * The card shell will render this when no source event is available.
 */
export function EmptyStateExplainer({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
