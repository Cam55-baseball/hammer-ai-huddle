/**
 * WkSpeedCard — Phase 3 canonical single-responsibility card.
 * Running speed ONLY. Never merges bat speed or lifts.
 * Placed BEFORE lifts so athletes hit sprint targets while CNS is fresh.
 * Game-day: renders the backend-prescribed short crossover activation.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { CardMeta } from "@/components/hammer/cards/CardMeta";
import { CardActions } from "@/components/hammer/cards/CardActions";
import { getCard } from "@/lib/wic/cardRegistry";
import { useCanonicalPhaseDisplay } from "@/hooks/useCanonicalPhaseDisplay";
import { WkCardFailureNotice } from "@/components/hammer/WkCardFailureNotice";

export function WkSpeedCard() {
  const { grouped, generate, generating, isLoading, failed, failureReason, retry, snapshotIdentity, dayKind } = useHammersToday();
  const entry = getCard("speed")!;
  const items = grouped.speedCard;
  const isGameDay = dayKind === "game" || dayKind === "both";
  const { display: label } = useCanonicalPhaseDisplay(
    snapshotIdentity.season_display,
    snapshotIdentity.season_phase,
  );

  return (
    <Card
      className={isGameDay ? "border-amber-500/40 bg-amber-500/5" : "border-violet-500/30"}
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={snapshotIdentity.generation_id ?? ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className={`h-4 w-4 shrink-0 ${isGameDay ? "text-amber-600" : "text-violet-500"}`} />
            <span className="truncate">Speed</span>
            <Badge variant="outline" className="text-[10px]">
              {isGameDay ? "Game day · activation" : "Pre-lift · fresh CNS"}
            </Badge>
          </div>
          {!isGameDay && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          )}
        </CardTitle>
        {label && <div className="text-[11px] text-muted-foreground line-clamp-2">{label}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        {failed ? (
          <Button size="sm" onClick={retry} className="h-7 w-full">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        ) : isLoading || generating ? (
          <Skeleton className="h-14 w-full rounded" />
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            {isGameDay ? "No activation programmed (rest)." : "No sprint work today (cadence rest)."}
          </p>
        ) : (
          items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
        )}
        <CardMeta entry={entry} generationId={snapshotIdentity.generation_id} />
        {items.length > 0 && <CardActions modality="speed" items={items} phaseDisplay={label} />}
      </CardContent>
    </Card>
  );
}
