import { cn } from "@/lib/utils";

export type RuntimeState = "calm" | "watch" | "escalate" | "unknown";

const LABEL: Record<RuntimeState, string> = {
  calm: "Calm",
  watch: "Watch",
  escalate: "Escalate",
  unknown: "Unknown",
};

const CLS: Record<RuntimeState, string> = {
  calm: "bg-state-calm text-state-calm-foreground",
  watch: "bg-state-watch text-state-watch-foreground",
  escalate: "bg-state-escalate text-state-escalate-foreground",
  unknown: "bg-state-unknown text-state-unknown-foreground",
};

/**
 * Semantic runtime state tier. Pure presentation — never authored from UI,
 * only forwarded from a projection. `unknown` is a first-class state, not a
 * fallback for missing data; it is the truthful answer when missingness exists.
 */
export function StateBadge({
  state,
  label,
  className,
}: {
  state: RuntimeState;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        CLS[state],
        className,
      )}
    >
      {label ?? LABEL[state]}
    </span>
  );
}
