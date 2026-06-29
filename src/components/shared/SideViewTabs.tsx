import { useSideContext } from "@/contexts/SideContext";
import { cn } from "@/lib/utils";

export type SideViewMode = "L" | "R" | "combined";

interface Props {
  value: SideViewMode;
  onChange: (v: SideViewMode) => void;
  discipline?: "hit" | "throw";
  /** Force render even if not switch/ambi. */
  force?: boolean;
  className?: string;
}

/**
 * 3-tab segmented control: L · R · Combined. Auto-hides for non-switch/ambi athletes.
 * Use on any analytics surface that has both-sides data.
 */
export function SideViewTabs({ value, onChange, discipline = "hit", force = false, className }: Props) {
  const { shouldShowPicker } = useSideContext();
  if (!force && !shouldShowPicker(discipline)) return null;

  return (
    <div className={cn("inline-flex rounded-md border border-border overflow-hidden h-7", className)}>
      {(["L", "R", "combined"] as SideViewMode[]).map(mode => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
          className={cn(
            "px-2.5 text-[11px] font-semibold transition-colors capitalize",
            value === mode
              ? "bg-primary/20 text-primary"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
          )}
        >
          {mode === "combined" ? "Both" : mode}
        </button>
      ))}
    </div>
  );
}
