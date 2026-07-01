/**
 * WkConditioningCard — Phase 3 canonical single-responsibility card.
 * Conditioning ONLY. Cross-sport back-end content is carried inside this
 * card only when the generator explicitly placed it there.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Loader2, RefreshCw } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { CardMeta } from "@/components/hammer/cards/CardMeta";
import { getCard } from "@/lib/wic/cardRegistry";
import { useGpSignal } from "@/hooks/useGpSignal";

export function WkConditioningCard() {
  const gp = useGpSignal();
  const { grouped, generate, generating, isLoading, failed, retry, snapshotIdentity } = useHammersToday();
  const entry = getCard("conditioning")!;

  if (gp.gameToday) return null;

  const items = grouped.conditioningCard;
  if (!isLoading && items.length === 0 && !failed) return null;

  return (
    <Card
      className="border-emerald-500/30"
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={snapshotIdentity.generation_id ?? ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Heart className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="truncate">Conditioning</span>
            <Badge variant="outline" className="text-[10px]">Pair with practice</Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {failed ? (
          <Button size="sm" onClick={retry} className="h-7 w-full"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
        ) : isLoading ? (
          <Skeleton className="h-14 w-full rounded" />
        ) : (
          items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
        )}
        <CardMeta entry={entry} generationId={snapshotIdentity.generation_id} />
      </CardContent>
    </Card>
  );
}
