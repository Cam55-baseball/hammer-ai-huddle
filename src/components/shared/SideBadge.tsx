import { cn } from "@/lib/utils";
import type { Side } from "@/contexts/SideContext";

/**
 * SideBadge — small L/R chip used inside cards/lists to make side context
 * unambiguous wherever a data row was recorded on a single side.
 */
export function SideBadge({
  side,
  className,
  title,
}: {
  side: Side | "both" | null | undefined;
  className?: string;
  title?: string;
}) {
  if (!side) return null;
  const label = side === "both" ? "Both" : side;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm border border-border bg-muted/40 px-1 py-0 text-[9px] font-bold uppercase leading-4 text-foreground/80",
        className,
      )}
      title={title ?? `Side: ${label}`}
    >
      {label}
    </span>
  );
}
