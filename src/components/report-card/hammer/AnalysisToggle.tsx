import { cn } from "@/lib/utils";

export type AnalysisView = "report_card" | "analysis";

interface Props {
  value: AnalysisView;
  onChange: (v: AnalysisView) => void;
  className?: string;
}

/**
 * Per-analysis segmented pill: [Report Card] [Analysis].
 * Report Card is the default; the Analysis tab exposes the full detailed
 * narrative analysis untouched.
 */
export function AnalysisToggle({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Analysis view"
      className={cn(
        "inline-flex w-full rounded-full bg-muted p-1 text-sm font-medium",
        className,
      )}
    >
      {(
        [
          { id: "report_card", label: "Report Card" },
          { id: "analysis", label: "Analysis" },
        ] as const
      ).map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
