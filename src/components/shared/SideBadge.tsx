import { cn } from "@/lib/utils";

interface Props {
  side?: string | null;
  className?: string;
}

/** Compact chip showing L / R / Both filing. Renders nothing when side is null. */
export function SideBadge({ side, className }: Props) {
  if (!side) return null;
  const label = side === "both" ? "L+R" : side;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        "bg-primary/15 text-primary border border-primary/30",
        className,
      )}
    >
      {label}
    </span>
  );
}
