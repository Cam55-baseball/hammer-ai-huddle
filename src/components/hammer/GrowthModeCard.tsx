import { Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useGrowthMode } from "@/hooks/useGrowthMode";
import { growthModeNote, type GrowthModeState } from "../../../supabase/functions/_shared/wic/growth/growthMode";

/** Shows while growth mode is on, and for 14 days after it turns off. */
export function GrowthModeCard() {
  const { data } = useGrowthMode();
  if (!data) return null;
  return <GrowthModeCardView state={data} />;
}

export function GrowthModeCardView({ state, today = new Date().toLocaleDateString("en-CA") }: { state: GrowthModeState; today?: string }) {
  const recentlyEnded = !!state.endedOn && (Date.parse(today) - Date.parse(state.endedOn)) / 86_400_000 <= 14;
  if (!state.active && !recentlyEnded) return null;
  const note = growthModeNote(state);
  if (!note) return null;
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex gap-3 p-4">
        <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{state.active ? "Growth mode: on" : "Growth mode: off"}</p>
          <p className="text-sm leading-6 text-muted-foreground">{note}</p>
          {state.active && state.grownInches != null && (
            <p className="text-xs text-muted-foreground">Why: you grew {state.grownInches} in within 3 months.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
