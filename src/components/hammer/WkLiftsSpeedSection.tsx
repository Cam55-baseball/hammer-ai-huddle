/**
 * WkLiftsSpeedSection — elite Lifts + Speed + Bat-Speed + Conditioning section
 * inserted into Hammer Today Plan. Reads from useWkDailyPrescriptions.
 *
 * Includes:
 *   - Phase quarter chip + auto-resolve from Season Dates
 *   - Bat-speed/Speed-before-lifts sequence toggle
 *   - Recovery-responsibility ack drawer when reductions trigger
 *   - One WkPrescriptionCard per movement with full transparency payload
 *   - Game-day: swaps to a compact activation-primer instead of blanking
 *   - Retry-visible failure state so users are never stuck
 *   - 402px-safe layout
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Wind, RefreshCw, ArrowUpDown, AlertTriangle, Loader2, Zap } from "lucide-react";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGpSignal } from "@/hooks/useGpSignal";
import { toast } from "sonner";

const SEQ_KEY = "wk:batBeforeLifts";

const GAME_DAY_PRIMER = [
  { name: "Nasal-breath row + hip mobility", detail: "3 min · low-intensity flow" },
  { name: "Med-ball scoop toss × 5/side", detail: "2 sets · pop, not grind" },
  { name: "Pogos × 20", detail: "2 sets · stiff ankles, quiet landings" },
  { name: "Band pull-apart × 15", detail: "2 sets · scap wake-up" },
  { name: "Short accel × 3 (10y at 80%)", detail: "primes CNS without draining" },
];

export function WkLiftsSpeedSection() {
  const { user } = useAuth();
  const gp = useGpSignal();
  const {
    grouped,
    reductions,
    phaseDisplay,
    generate,
    generating,
    isLoading,
    data,
    failed,
    retry,
  } = useWkDailyPrescriptions();
  const [batBeforeLifts, setBatBeforeLifts] = useState<boolean>(() => {
    try { return localStorage.getItem(SEQ_KEY) !== "0"; } catch { return true; }
  });
  const [ackOpen, setAckOpen] = useState(false);
  const [acked, setAcked] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(SEQ_KEY, batBeforeLifts ? "1" : "0"); } catch {}
  }, [batBeforeLifts]);

  const ordered = useMemo(() => {
    if (batBeforeLifts) {
      return [
        ...grouped.bat_speed,
        ...grouped.speed,
        ...grouped.supplemental,
        ...grouped.lift,
        ...grouped.conditioning,
        ...grouped.cross_sport,
      ];
    }
    return [
      ...grouped.supplemental,
      ...grouped.lift,
      ...grouped.bat_speed,
      ...grouped.speed,
      ...grouped.conditioning,
      ...grouped.cross_sport,
    ];
  }, [grouped, batBeforeLifts]);

  const submitAck = async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const reason = reductions.length === 1 ? reductions[0].reason : "mixed";
    const { error } = await supabase.from("wk_recovery_acks" as any).upsert(
      {
        user_id: user.id,
        ack_date: today,
        reduction_reason: reason,
        reduction_payload: { reductions },
      },
      { onConflict: "user_id,ack_date,reduction_reason" },
    );
    if (error) {
      toast.error("Could not record acknowledgment");
      return;
    }
    setAcked(true);
    setAckOpen(false);
    toast.success("Recovery is on you today. We've got your back.");
  };

  if (gp.gameToday) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="min-w-0">Game day — lifts paused</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Activation primer</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            Heavy work is suppressed to protect freshness. A 10-minute CNS primer keeps you sharp without draining you.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => setPrimerOpen((v) => !v)}
          >
            {primerOpen ? "Hide primer" : "Show primer"}
          </Button>
          {primerOpen && (
            <ul className="space-y-1.5 pt-1">
              {GAME_DAY_PRIMER.map((it, i) => (
                <li key={i} className="rounded border border-amber-500/20 bg-background/60 p-2">
                  <div className="font-medium text-foreground">{it.name}</div>
                  <div className="text-[11px] text-muted-foreground">{it.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Dumbbell className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Lifts, Speed & Conditioning</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => generate()}
              disabled={generating}
              title="Regenerate today's elite plan"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
        </CardTitle>
        {phaseDisplay && (
          <div className="text-[11px] text-muted-foreground line-clamp-2">{phaseDisplay}</div>
        )}
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
                <div className="mt-2 text-amber-900/70 dark:text-amber-100/70">
                  Step up recovery. Hammer can't take the fall for under-recovered training — that's on you.
                </div>
                <Button size="sm" className="mt-2 h-7" onClick={() => setAckOpen((v) => !v)}>
                  I will recover
                </Button>
              </div>
            </div>
            {ackOpen && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="default" onClick={submitAck}>Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setAckOpen(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] whitespace-normal max-w-full">
            {batBeforeLifts ? "Bat-Speed / Speed → Lifts" : "Lifts → Bat-Speed / Speed"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={() => setBatBeforeLifts((v) => !v)}
            title="Smart default: bat-speed and speed work go BEFORE lifts to protect CNS targets"
          >
            <ArrowUpDown className="h-3 w-3" /> Reorder
          </Button>
        </div>

        {failed && !generating ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              Elite plan couldn't build
            </div>
            <p className="text-muted-foreground">
              The generator timed out or errored. Your other blocks above are unaffected.
            </p>
            <Button size="sm" onClick={retry} className="h-7">
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate plan
            </Button>
          </div>
        ) : isLoading || (data && data.length === 0 && generating) ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-16 w-full rounded" />
            <Skeleton className="h-16 w-full rounded" />
            <div className="text-[11px] text-muted-foreground text-center pt-1">
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
              Building your elite plan…
            </div>
          </div>
        ) : ordered.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            <Wind className="h-4 w-4 inline mr-1" />
            No prescriptions yet. Tap refresh to generate.
          </div>
        ) : (
          <div className="space-y-2">
            {ordered.map((rx) => (
              <WkPrescriptionCard key={rx.id} rx={rx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
