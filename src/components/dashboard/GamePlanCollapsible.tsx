import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GamePlanCard } from "@/components/GamePlanCard";

const STORAGE_KEY = "dashboard.gameplan.open";

interface Props {
  selectedSport: "baseball" | "softball";
}

/**
 * UI-only collapsible wrapper around <GamePlanCard />.
 * Lets athletes hide the long Game Plan body so the Command Center
 * remains visible above the fold. Persists open/closed locally.
 * No changes to GamePlanCard internals, projections, or runtime logic.
 */
export function GamePlanCollapsible({ selectedSport }: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Hide Game Plan" : "Show Game Plan"}
          className="flex w-full min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <div className="text-base font-semibold text-foreground">Game Plan</div>
            <div className="truncate text-sm text-muted-foreground">
              Your training plan for today
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <GamePlanCard selectedSport={selectedSport} />
      </CollapsibleContent>
    </Collapsible>
  );
}
