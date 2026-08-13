/**
 * WkGeneratePanel — the explicit "Generate today's plan" surface.
 *
 * On-demand generation doctrine: Hammers Today is never built automatically.
 * The athlete presses this button and the generator picks up exactly where the
 * roadmap says they are. Block / week / deload are derived from a fixed
 * calendar anchor plus the athlete's real history, so generating on demand
 * lands on the same wave position an auto-build would have produced.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

/** Mirrors supabase/functions/_shared/wic/progression/progressionState.ts */
const WAVE_ANCHOR_ISO = "2024-01-01";
const BLOCK_PHASE_LABEL = ["Accumulate", "Intensify", "Peak", "Deload"] as const;

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export function resolveWavePosition(planDate: string) {
  const weekIndex = Math.floor(Math.max(0, daysBetween(WAVE_ANCHOR_ISO, planDate)) / 7);
  const weekSlot = weekIndex % 4;
  return {
    blockIndex: Math.floor(weekIndex / 4),
    weekInBlock: weekSlot + 1,
    phaseLabel: BLOCK_PHASE_LABEL[weekSlot],
  };
}

export function WkGeneratePanel({
  planDate,
  generating,
  onGenerate,
}: {
  planDate: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  const wave = resolveWavePosition(planDate);

  return (
    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-[0_0_0_4px_hsl(var(--primary)/0.06)]">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/15 p-2 shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold">Today's plan isn't built yet</h3>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Block {wave.blockIndex + 1} · Week {wave.weekInBlock} · {wave.phaseLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Generate when you're ready to train. It picks up exactly where your roadmap is —
              same block, same progression, built off your logged bests.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className={`w-full gap-2 font-semibold ${generating ? "" : "animate-pulse"}`}
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your plan…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate today's plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Shown when an existing plan drifted (schedule / season / generator change). */
export function WkStaleBanner({
  reason,
  generating,
  onRefresh,
}: {
  reason: "version" | "phase" | "game_day";
  generating: boolean;
  onRefresh: () => void;
}) {
  const text =
    reason === "game_day"
      ? "Your schedule changed today — refresh to re-shape the plan around it."
      : reason === "phase"
        ? "Your season phase changed — refresh to re-prescribe for the new phase."
        : "A newer plan engine is available — refresh to rebuild today's plan.";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2">
      <p className="text-xs text-amber-800 dark:text-amber-200 flex-1 min-w-[160px]">{text}</p>
      <Button size="sm" variant="outline" disabled={generating} onClick={onRefresh} className="gap-1.5 text-xs">
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Refresh
      </Button>
    </div>
  );
}
