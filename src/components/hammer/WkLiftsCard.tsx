/**
 * WkLiftsCard — full-body elite lift template.
 *
 * Renders slot="lift" and slot="supplemental" in canonical sequence_role order:
 *   arm care → trunk primer → compound → unilateral → upper push → upper pull
 *   → carry / anti-rotation → trunk finisher → supplemental.
 *
 * Phase modulation happens server-side in wk-generate-daily.
 * Game-day: paused with a short explanation (activation lives on the Speed card).
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Dumbbell, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { useGpSignal } from "@/hooks/useGpSignal";
import { toast } from "sonner";

export function WkLiftsCard() {
  const { user } = useAuth();
  const gp = useGpSignal();
  const {
    grouped, reductions, phaseDisplay, generate, generating, isLoading, failed, retry,
  } = useWkDailyPrescriptions();
  const [ackOpen, setAckOpen] = useState(false);
  const [acked, setAcked] = useState(false);

  const submitAck = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const reason = reductions.length === 1 ? reductions[0].reason : "mixed";
    const { error } = await supabase.from("wk_recovery_acks" as any).upsert(
      { user_id: user.id, ack_date: today, reduction_reason: reason, reduction_payload: { reductions } },
      { onConflict: "user_id,ack_date,reduction_reason" },
    );
    if (error) return toast.error("Could not record acknowledgment");
    setAcked(true); setAckOpen(false);
    toast.success("Recovery is on you today. We've got your back.");
  };

  if (gp.gameToday) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Lifts — paused for game day</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Heavy work is suppressed. Freshness wins today — the Speed & Bat-Speed card above holds your activation primer.
        </CardContent>
      </Card>
    );
  }

  const items = grouped.lifts;

  return (
    <Card className="border-blue-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Dumbbell className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="truncate">Lifts — Full Body</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => generate()} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </CardTitle>
        {phaseDisplay && <div className="text-[11px] text-muted-foreground line-clamp-2">{phaseDisplay}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        {reductions.length > 0 && !acked && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-800 dark:text-amber-200">Volume reduced today</div>
                <ul className="mt-1 space-y-0.5 text-amber-900/80 dark:text-amber-100/80">
                  {reductions.map((r, i) => <li key={i}>• {r.detail}</li>)}
                </ul>
                <Button size="sm" className="mt-2 h-7" onClick={() => setAckOpen((v) => !v)}>I will recover</Button>
                {ackOpen && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={submitAck}>Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAckOpen(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {failed ? (
          <Button size="sm" onClick={retry} className="h-7 w-full">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        ) : isLoading ? (
          <>
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Tap refresh to generate today's full-body template.</p>
        ) : (
          items.map((rx) => <WkPrescriptionCard key={rx.id} rx={rx} />)
        )}
      </CardContent>
    </Card>
  );
}
