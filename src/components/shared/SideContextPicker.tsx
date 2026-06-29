import { useSideContext, type Discipline, type Side } from "@/contexts/SideContext";
import { cn } from "@/lib/utils";

interface SideContextPickerProps {
  discipline: Discipline;
  /** Force render even if athlete isn't switch/ambi (e.g. coach review surface). */
  force?: boolean;
  className?: string;
  size?: "sm" | "md";
  /** Optional label prefix, e.g. "Hitting side" */
  label?: string;
}

/**
 * Compact L/R pill. Auto-hides for non-switch / non-ambi athletes unless `force`.
 * Single source of truth — wires to `SideContext`.
 */
export function SideContextPicker({
  discipline,
  force = false,
  className,
  size = "sm",
  label,
}: SideContextPickerProps) {
  const { shouldShowPicker, selectedSide, setSide } = useSideContext();
  if (!force && !shouldShowPicker(discipline)) return null;

  const side = selectedSide[discipline];
  const heightCls = size === "sm" ? "h-7 text-[11px]" : "h-9 text-xs";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <div className={cn(
        "inline-flex rounded-md border border-border overflow-hidden",
        heightCls,
      )}>
        {(["R", "L"] as Side[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(discipline, s)}
            aria-pressed={side === s}
            className={cn(
              "px-2.5 font-semibold transition-colors",
              side === s
                ? "bg-primary/20 text-primary"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
