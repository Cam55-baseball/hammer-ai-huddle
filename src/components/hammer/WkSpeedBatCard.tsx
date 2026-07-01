/**
 * WkSpeedBatCard — Bat-Speed + Sprint Speed work.
 *
 * Placed BEFORE the Lifts card so athletes hit rotational + sprint targets
 * while the CNS is fresh. Renders slot="bat_speed" and slot="speed" only.
 * Game-day: shows a CNS activation primer instead of blank.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { useGpSignal } from "@/hooks/useGpSignal";

const GAME_DAY_PRIMER = [
  { name: "Med-ball scoop toss × 5/side", detail: "2 sets · pop, not grind" },
  { name: "Pogos × 20", detail: "2 sets · stiff ankles" },
  { name: "Short accel × 3 (10y at 80%)", detail: "primes CNS without draining" },
];

export function WkSpeedBatCard() {
  const gp = useGpSignal();
  const { grouped, phaseDisplay, generate, generating, isLoading, failed, retry } =
    useWkDailyPrescriptions();

  if (gp.gameToday) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="min-w-0">Speed & Bat-Speed — activation only</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Game day</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          <p className="text-muted-foreground">Sharp, not drained. Keep it short.</p>
          <ul className="space-y-1.5 pt-1">
            {GAME_DAY_PRIMER.map((it, i) => (
              <li key={i} className="rounded border border-amber-500/20 bg-background/60 p-2">
                <div className="font-medium text-foreground">{it.name}</div>
                <div className="text-[11px] text-muted-foreground">{it.detail}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const items = grouped.speedBat;

  return (
    <Card className="border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="truncate">Speed & Bat-Speed</span>
            <Badge variant="outline" className="text-[10px]">Pre-lift · fresh CNS</Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </CardTitle>
        {phaseDisplay && <div className="text-[11px] text-muted-foreground line-clamp-2">{phaseDisplay}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        {failed ? (
          <Button size="sm" onClick={retry} className="h-7 w-full">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        ) : isLoading ? (
          <>
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No speed/bat work programmed today (cadence rest).</p>
        ) : (
          items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
        )}
      </CardContent>
    </Card>
  );
}
