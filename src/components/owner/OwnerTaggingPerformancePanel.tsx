import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVideoConfidenceMap } from "@/hooks/useVideoConfidenceMap";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { TIER_CLASSES, TIER_LABEL, type ConfidenceTier } from "@/lib/videoConfidence";

const LAYERS = ['movement_pattern', 'result', 'context', 'correction'] as const;
const LAYER_LABEL: Record<string, string> = {
  movement_pattern: 'Movement',
  result: 'Result',
  context: 'Context',
  correction: 'Correction',
};

function tierFromScore(score: number): ConfidenceTier {
  return score >= 90 ? 'elite' : score >= 70 ? 'solid' : 'needs_work';
}

export function OwnerTaggingPerformancePanel() {
  const [open, setOpen] = useState(false);
  const { data: confMap } = useVideoConfidenceMap();
  const { videos } = useVideoLibrary({ limit: 100 });

  const stats = useMemo(() => {
    if (!confMap || confMap.size === 0) {
      return null;
    }
    const all = [...confMap.values()];
    const avg = Math.round(all.reduce((s, c) => s + c.score, 0) / all.length);

    // Layer coverage across videos with at least one tag
    const layerCounts: Record<string, number> = {
      movement_pattern: 0, result: 0, context: 0, correction: 0,
    };
    let allFour = 0;
    for (const c of all) {
      const present = new Set<string>();
      // Reverse-engineer covered layers from breakdown.diversity:
      // diversity = 1 + uniqueLayers*6 → uniqueLayers = (diversity - 1) / 6
      const unique = c.breakdown.diversity > 0 ? Math.round((c.breakdown.diversity - 1) / 6) : 0;
      if (unique === 4) allFour += 1;
      // Fall back: cannot identify which layers without raw data; stats below
      // therefore use weakest-layer as "least covered overall" via per-video hint.
      void present;
    }

    // Most-missing layer: count "Cover more tag layers" hint as a global signal,
    // and additionally count per-video diversity gaps. Cheap & directional.
    const weakestLayerCount: Record<string, number> = {
      movement_pattern: 0, result: 0, context: 0, correction: 0,
    };
    for (const c of all) {
      // If diversity < 25, assume the missing layer is whichever is rarest globally;
      // at this scope we just flag "layer diversity low" — actual per-layer detection
      // would need raw assignments here. The hint surface is enough for v1.
      if (c.breakdown.diversity < 19) {
        // distribute the signal — minor weight to all layers
        for (const l of LAYERS) weakestLayerCount[l] += 1;
      }
    }

    const consistency = all.length > 0 ? Math.round((allFour / all.length) * 100) : 0;

    // Trend: last 5 vs prior 5 (sorted by created_at desc on videos)
    const sorted = [...videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const last5 = sorted.slice(0, 5).map(v => confMap.get(v.id)?.score).filter((n): n is number => typeof n === 'number');
    const prior5 = sorted.slice(5, 10).map(v => confMap.get(v.id)?.score).filter((n): n is number => typeof n === 'number');
    const last5Avg = last5.length ? last5.reduce((s, n) => s + n, 0) / last5.length : null;
    const prior5Avg = prior5.length ? prior5.reduce((s, n) => s + n, 0) / prior5.length : null;
    const trend: 'up' | 'down' | 'flat' | null =
      last5Avg == null || prior5Avg == null ? null
      : Math.abs(last5Avg - prior5Avg) < 2 ? 'flat'
      : last5Avg > prior5Avg ? 'up' : 'down';

    return { avg, total: all.length, consistency, trend, last5Avg, prior5Avg };
  }, [confMap, videos]);

  if (!stats) {
    return null;
  }
  const tier = tierFromScore(stats.avg);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-md border px-2 py-1 text-xs font-semibold ${TIER_CLASSES[tier]}`}>
            {stats.avg}/100
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Your tagging performance</p>
            <p className="text-[11px] text-muted-foreground">
              Avg confidence across {stats.total} videos · {TIER_LABEL[tier]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stats.trend === 'up' && (
            <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="h-3 w-3" /> Trending up
            </Badge>
          )}
          {stats.trend === 'down' && (
            <Badge className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <TrendingDown className="h-3 w-3" /> Trending down
            </Badge>
          )}
          {stats.trend === 'flat' && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Minus className="h-3 w-3" /> Steady
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t">
          <Stat label="Layer consistency" value={`${stats.consistency}%`}
            hint="Videos covering all 4 tag layers" />
          <Stat
            label="Last 5 avg"
            value={stats.last5Avg != null ? `${Math.round(stats.last5Avg)}` : '—'}
            hint={stats.prior5Avg != null ? `Prior 5: ${Math.round(stats.prior5Avg)}` : 'Not enough history yet'}
          />
          <Stat
            label="Coaching cue"
            value={stats.consistency < 60 ? 'Diversify layers' : stats.avg < 70 ? 'Lengthen descriptions' : 'Stay sharp'}
            hint="Biggest lever for next +10 points"
          />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-muted/30 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
