/**
 * WkConditioningCard — Conditioning + Cross-Sport.
 * Placed next to the practice card so athletes stack conditioning against
 * their sport work, not their lifts. Hides on game day.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Loader2, RefreshCw } from "lucide-react";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { useGpSignal } from "@/hooks/useGpSignal";

export function WkConditioningCard() {
  const gp = useGpSignal();
  const { grouped, generate, generating, isLoading, failed, retry } = useWkDailyPrescriptions();

  if (gp.gameToday) return null;

  const items = grouped.conditioningCard;
  if (!isLoading && items.length === 0 && !failed) return null;

  return (
    <Card className="border-emerald-500/30">
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
      </CardContent>
    </Card>
  );
}
