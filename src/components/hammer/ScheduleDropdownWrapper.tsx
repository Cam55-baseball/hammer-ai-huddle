import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarClock, ChevronDown } from "lucide-react";
import { HammerScheduleStrip } from "@/components/hammer/HammerScheduleStrip";
import { useGameDayContext } from "@/hooks/useGameDayContext";

/**
 * ScheduleDropdownWrapper — collapsible wrapper around HammerScheduleStrip
 * that starts closed and is clearly labeled so athletes know where to update
 * games, season dates, cancels/reschedules, and update Hammer what changed.
 * Per-day open state persists in localStorage.
 */
export function ScheduleDropdownWrapper() {
  // Step 21E1 — the season drives this card: the athlete's current season
  // state is the headline, and the entry point for changing it lives here.
  const seasonCtx = useGameDayContext();
  const seasonWords: Record<string, string> = {
    in_season: "In season",
    preseason: "Preseason",
    post_season: "Postseason",
    off_season: "Offseason",
  };
  const seasonLabel = seasonWords[String(seasonCtx?.seasonPhase ?? "")] ?? null;
  const seasonLine = seasonLabel
    ? `${seasonLabel} — games, season dates, cancels/reschedules, and update Hammer what changed.`
    : "Games, season dates, cancels/reschedules, and update Hammer what changed.";
  const dayKey = `hammer.today.schedule.open.${new Date().toISOString().slice(0, 10)}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(dayKey) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(dayKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, dayKey]);
  return (
    <Card className="border-border/60">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors rounded-md"
            aria-expanded={open}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">Schedule & What Changed</div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {seasonLine}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-1 pb-1">
          <HammerScheduleStrip />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

