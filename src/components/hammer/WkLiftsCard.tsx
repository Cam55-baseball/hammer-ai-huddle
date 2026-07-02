/**
 * WkLiftsCard — full-body elite lift template.
 *
 * Renders slot="lift" and slot="supplemental" in canonical sequence_role order
 * (arm care → trunk primer → compound → unilateral → upper push → upper pull
 * → carry / anti-rotation → trunk finisher → supplemental).
 *
 * Also surfaces movements that were HARD-BLOCKED for the current WK phase
 * (e.g. OS-only eccentrics in-season) with a "Request 1-session override"
 * affordance so the athlete can see WHY something was withheld and unlock it
 * for one session if they truly need it.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Dumbbell, Loader2, RefreshCw, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { useBlockedLiftMovements, explainWhyBlocked, type BlockedMovement } from "@/hooks/useBlockedLiftMovements";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { useGpSignal } from "@/hooks/useGpSignal";
import { toast } from "sonner";
import { CardMeta } from "@/components/hammer/cards/CardMeta";
import { CardActions } from "@/components/hammer/cards/CardActions";
import { getCard } from "@/lib/wic/cardRegistry";
import { useCanonicalPhaseDisplay } from "@/hooks/useCanonicalPhaseDisplay";

export function WkLiftsCard() {
  const { user } = useAuth();
  const gp = useGpSignal();
  // Phase 2 Fix 4 — pure consumer of the canonical snapshot.
  const {
    grouped, reductions, phaseDisplay: serverPhaseDisplay, phaseKey, generate, generating, isLoading, failed, retry, overrideMovement, snapshotIdentity,
  } = useHammersToday();
  const entry = getCard("lift")!;
  const { display: phaseDisplay } = useCanonicalPhaseDisplay(serverPhaseDisplay, phaseKey);
  const blocked = useBlockedLiftMovements(phaseKey);
  const [ackOpen, setAckOpen] = useState(false);
  const [acked, setAcked] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<BlockedMovement | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

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

  const confirmOverride = async () => {
    if (!overrideTarget || !overrideReason.trim()) return;
    setOverrideSubmitting(true);
    try {
      await overrideMovement(overrideTarget.slug, overrideReason.trim());
      setOverrideTarget(null);
      setOverrideReason("");
    } finally {
      setOverrideSubmitting(false);
    }
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
          Heavy work is suppressed by the generator. Freshness wins today — the card above holds the short crossover activation at the front of the day.
        </CardContent>
      </Card>
    );
  }

  const items = grouped.lifts;
  const blockedItems = blocked.data ?? [];

  return (
    <Card
      className="border-blue-500/30"
      data-card-type={entry.cardType}
      data-display-order={entry.displayOrder}
      data-generation-id={snapshotIdentity.generation_id ?? ""}
    >
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

        {phaseKey && blockedItems.length > 0 && (
          <details className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2 text-xs">
            <summary className="cursor-pointer font-medium flex items-center gap-1.5 text-violet-800 dark:text-violet-200">
              <Lock className="h-3 w-3" />
              {blockedItems.length} movement{blockedItems.length === 1 ? "" : "s"} blocked this phase
            </summary>
            <div className="mt-2 space-y-1.5">
              {blockedItems.slice(0, 12).map((m) => (
                <div key={m.slug} className="flex items-start justify-between gap-2 rounded border border-border/50 bg-background p-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground">{explainWhyBlocked(m, phaseKey)}</div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0" onClick={() => setOverrideTarget(m)}>
                    Request override
                  </Button>
                </div>
              ))}
              {blockedItems.length > 12 && (
                <div className="text-[11px] text-muted-foreground">+{blockedItems.length - 12} more…</div>
              )}
            </div>
          </details>
        )}
        <CardMeta entry={entry} generationId={snapshotIdentity.generation_id} />
        {items.length > 0 && <CardActions modality="lifts" items={items} phaseDisplay={phaseDisplay} />}
      </CardContent>


      <Dialog open={!!overrideTarget} onOpenChange={(o) => { if (!o) { setOverrideTarget(null); setOverrideReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request 1-session override</DialogTitle>
            <DialogDescription>
              {overrideTarget?.name} was blocked for the current phase. Overrides last for today only and are logged with your reason so the plan learns.
            </DialogDescription>
          </DialogHeader>
          {overrideTarget && phaseKey && (
            <div className="mb-2 text-xs">
              <Badge variant="outline" className="border-violet-500/50 text-violet-700 dark:text-violet-300">
                {explainWhyBlocked(overrideTarget, phaseKey)}
              </Badge>
            </div>
          )}
          <Textarea
            placeholder="Why do you need this today? (e.g. coach programmed it, testing week, personal max attempt…)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <Button onClick={confirmOverride} disabled={!overrideReason.trim() || overrideSubmitting}>
              {overrideSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Confirm override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
