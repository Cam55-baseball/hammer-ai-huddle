/**
 * SeasonCounter — the one season counter (Round 8 Step 1). Lives in The General.
 * Same season state every plan card uses; no cycle/block labels.
 */
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { useCanonicalPhaseDisplay } from "@/hooks/useCanonicalPhaseDisplay";

export function SeasonCounter() {
  const { phaseDaysIn, phaseDaysRemaining } = useSeasonStatus();
  const { display } = useCanonicalPhaseDisplay();
  const day = phaseDaysIn != null ? phaseDaysIn + 1 : null;
  return (
    <Card data-season-counter className="border-primary/20">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-2"><CalendarDays className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Season</p>
          <p className="font-bold text-foreground">
            {display}
            {day != null && ` · Week ${Math.floor((day - 1) / 7) + 1}, day ${day}`}
          </p>
          {phaseDaysRemaining != null && phaseDaysRemaining >= 0 && (
            <p className="text-xs text-muted-foreground">Days left in this season: {phaseDaysRemaining}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
