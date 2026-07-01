/**
 * WkSpeedBatCard — Bat-Speed + Sprint Speed work.
 *
 * Placed BEFORE the Lifts card so athletes hit rotational + sprint targets
 * while the CNS is fresh. Renders slot="bat_speed" and slot="speed" only.
 * Game-day: renders the backend-prescribed short crossover activation so it
 * actually sits at the beginning of the day, not as a back-end conditioning card.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { useGpSignal } from "@/hooks/useGpSignal";

export function WkSpeedBatCard() {
  const gp = useGpSignal();
  // Phase 2 Fix 4 — pure consumer of the canonical snapshot.
  const { grouped, phaseDisplay, generate, generating, isLoading, failed, retry } = useHammersToday();
  const items = grouped.speedBat;

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
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">Sharp, not drained. Backend rule: short sports crossover activation must be first after warm-up on game days.</p>
          {failed ? (
            <Button size="sm" onClick={retry} className="h-7 w-full">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          ) : isLoading || generating ? (
            <Skeleton className="h-14 w-full rounded" />
          ) : items.length === 0 ? (
            <Button size="sm" variant="outline" className="h-7 w-full" onClick={() => generate()}>
              Generate game-day activation
            </Button>
          ) : (
            items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
          )}
        </CardContent>
      </Card>
    );
  }

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
