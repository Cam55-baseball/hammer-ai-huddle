/**
 * SituationalPlanCard — renders one base/out state's plan from plan_json.situational_hitting.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StrikeZoneMini } from "./StrikeZoneMini";
import { findSituation } from "@/lib/games/situationalMatrix";

interface SituationalEntry {
  goal?: string;
  pitch_to_hunt?: string;
  zones?: string[];
  avoid_zones?: string[];
  swing_shape?: string;
  avoid?: string;
  confidence?: "low" | "med" | "high";
  source?: "direct_history" | "archetype" | "prior" | "ai_inference";
}

export function SituationalPlanCard({
  situationKey, entry, sport, active = false,
}: {
  situationKey: string;
  entry: SituationalEntry | undefined;
  sport: "baseball" | "softball";
  active?: boolean;
}) {
  const sit = findSituation(situationKey);
  return (
    <Card className={`p-3 space-y-2 ${active ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {sit?.label ?? situationKey}
          </div>
          <div className="text-sm font-semibold mt-0.5">
            {entry?.goal ?? sit?.default_goal ?? "—"}
          </div>
        </div>
        <StrikeZoneMini sport={sport} attack={entry?.zones} avoid={entry?.avoid_zones} />
      </div>

      {entry?.pitch_to_hunt && (
        <div className="text-xs"><span className="font-medium">Hunt:</span> {entry.pitch_to_hunt}</div>
      )}
      {entry?.swing_shape && (
        <div className="text-xs"><span className="font-medium">Swing shape:</span> {entry.swing_shape}</div>
      )}
      {entry?.avoid && (
        <div className="text-xs text-rose-600"><span className="font-medium">Avoid:</span> {entry.avoid}</div>
      )}
      <div className="flex gap-1 pt-1">
        {entry?.confidence && (
          <Badge variant="outline" className="text-[10px]">conf: {entry.confidence}</Badge>
        )}
        {entry?.source && (
          <Badge variant="outline" className="text-[10px]">src: {entry.source.replace("_", " ")}</Badge>
        )}
      </div>
    </Card>
  );
}
