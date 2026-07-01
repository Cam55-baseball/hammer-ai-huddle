/**
 * WkBatSpeedCard — Phase 3 canonical single-responsibility card.
 * Rotational velocity ONLY. Never merges running speed or lifts.
 * Placed BEFORE lifts so bat-speed exposure happens while CNS is fresh.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Bolt } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { CardMeta } from "@/components/hammer/cards/CardMeta";
import { getCard } from "@/lib/wic/cardRegistry";
import { seasonDisplayLabel } from "@/lib/wic/seasonDisplay";

export function WkBatSpeedCard() {
  const { grouped, generate, generating, isLoading, failed, retry, snapshotIdentity, dayKind } = useHammersToday();
  const entry = getCard("bat_speed")!;
  const items = grouped.batSpeedCard;
  const isGameDay = dayKind === "game" || dayKind === "both";
  const label = seasonDisplayLabel(snapshotIdentity.season_phase) || snapshotIdentity.season_display || null;

  return (
    <Card
      className="border-fuchsia-500/30"
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={snapshotIdentity.generation_id ?? ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bolt className="h-4 w-4 text-fuchsia-500 shrink-0" />
            <span className="truncate">Bat Speed</span>
            <Badge variant="outline" className="text-[10px]">
              {isGameDay ? "Game day · light" : "Pre-lift · fresh CNS"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
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
          <p className="text-xs text-muted-foreground py-2">No rotational velocity work today (cadence rest).</p>
        ) : (
          items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
        )}
        <CardMeta entry={entry} generationId={snapshotIdentity.generation_id} />
      </CardContent>
    </Card>
  );
}
