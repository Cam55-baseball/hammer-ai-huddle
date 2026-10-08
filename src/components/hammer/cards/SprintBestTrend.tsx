/**
 * SprintBestTrend — real-data-only sprint best-time trend inside the Speed card.
 * Shows, per distance, the athlete's all-time best and the last few session
 * bests (oldest → newest) as a small bar trend. Renders nothing until at
 * least one timed sprint exists on the account — never fake data.
 */
import { useSpeedHistory } from "@/hooks/useSpeedHistory";
import { TrendingDown } from "lucide-react";

export function SprintBestTrend({ today }: { today: string }) {
  const { sessions, bests } = useSpeedHistory(today);
  const distances = Object.keys(bests).map(Number).sort((a, b) => a - b);
  if (distances.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3" data-testid="sprint-best-trend">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <TrendingDown className="h-3 w-3" /> Your sprint bests
      </div>
      {distances.map((yd) => {
        const best = bests[String(yd)];
        // Last up-to-6 session bests for this distance, oldest → newest.
        const recent = sessions
          .filter((s) => s.times[String(yd)] != null)
          .slice(-6)
          .map((s) => s.times[String(yd)]);
        const worst = Math.max(...recent, best);
        const range = Math.max(worst - best, 0.01);
        return (
          <div key={yd} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] text-muted-foreground tabular-nums">{yd} yd</span>
            <span className="w-16 shrink-0 text-sm font-bold tabular-nums">{best.toFixed(2)}s</span>
            <div className="flex h-6 flex-1 items-end gap-1" aria-hidden>
              {recent.map((t, i) => {
                // Faster time = taller bar; the all-time best is highlighted.
                const h = 30 + ((worst - t) / range) * 70;
                const isBest = t === best;
                return (
                  <div
                    key={i}
                    className={`w-2 rounded-sm ${isBest ? "bg-primary" : "bg-muted-foreground/30"}`}
                    style={{ height: `${h}%` }}
                    title={`${t.toFixed(2)}s`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">Taller bar = faster. The highlighted bar is your best.</p>
    </div>
  );
}
