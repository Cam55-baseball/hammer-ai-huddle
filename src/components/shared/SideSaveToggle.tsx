import { useSideContext, type Discipline } from "@/contexts/SideContext";
import { cn } from "@/lib/utils";

export type SaveSide = "L" | "R" | "both";

interface Props {
  value: SaveSide;
  onChange: (v: SaveSide) => void;
  discipline: Discipline;
  /** Force render even if athlete isn't switch/ambi. */
  force?: boolean;
  className?: string;
  label?: string;
}

/**
 * L · R · Both segmented control used inside save dialogs so declared
 * switch hitters / ambidextrous throwers file each save under the
 * correct side (or both). Auto-hides for single-side athletes — those
 * users' saves keep `side = null` and the surface behaves unchanged.
 */
export function SideSaveToggle({
  value,
  onChange,
  discipline,
  force = false,
  className,
  label = discipline === "hit" ? "File under" : "File under",
}: Props) {
  const { shouldShowPicker } = useSideContext();
  if (!force && !shouldShowPicker(discipline)) return null;

  const options: { key: SaveSide; label: string }[] = [
    { key: "L", label: "Left" },
    { key: "R", label: "Right" },
    { key: "both", label: "Both" },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <div className="inline-flex rounded-md border border-border overflow-hidden h-8">
        {options.map(o => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={cn(
              "px-3 text-xs font-semibold transition-colors",
              value === o.key
                ? "bg-primary/20 text-primary"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
