/**
 * WkPrescriptionCard — single elite prescription with full transparency payload.
 * Shows phase, why-this-lift, training-age reasoning, CNS load, reductions,
 * injury substitutions, and a complete/skip control.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertTriangle, ShieldCheck, Zap, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const SLOT_TONE: Record<WkRx["slot"], string> = {
  lift: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  supplemental: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  speed: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bat_speed: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  conditioning: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cross_sport: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const SLOT_LABEL: Record<WkRx["slot"], string> = {
  lift: "Lift",
  supplemental: "Supplemental",
  speed: "Speed",
  bat_speed: "Bat-Speed",
  conditioning: "Conditioning",
  cross_sport: "Cross-Sport",
};

export function WkPrescriptionCard({ rx }: { rx: WkRx }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const mark = async (status: "completed" | "skipped") => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("wk_prescriptions" as any)
      .update({ status })
      .eq("id", rx.id);
    if (error) {
      toast.error("Could not update");
      return;
    }
    // On completion, persist a session log row so the Learning Loop has real
    // execution data (not just a status flip). Best-effort, non-blocking.
    if (status === "completed") {
      supabase.from("wk_session_logs" as any).insert({
        user_id: user.id,
        prescription_id: rx.id,
        plan_date: rx.plan_date,
        movement_slug: rx.movement_slug,
        sets_completed: rx.sets ?? null,
        reps_completed: rx.sets && rx.reps ? Array.from({ length: rx.sets }, () => rx.reps as number) : null,
        load_used: rx.load_pct ?? null,
        rpe: null,
      }).then(({ error: logErr }) => {
        if (logErr) console.warn("wk_session_logs insert failed", logErr);
      });
    }
    toast.success(status === "completed" ? "Logged — nice work." : "Skipped");
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
  };

  const why = rx.why_payload;
  const reductions = why?.reductions ?? [];
  const dosage =
    [
      rx.sets ? `${rx.sets} sets` : null,
      rx.reps ? `× ${rx.reps}` : null,
      rx.tempo ? `tempo ${rx.tempo}` : null,
      rx.load_pct ? `${rx.load_pct}% 1RM` : null,
    ].filter(Boolean).join(" • ") || "Engine-selected dosage";

  return (
    <Card className={`p-3 border ${rx.status === "completed" ? "opacity-60" : ""}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className={`text-[10px] ${SLOT_TONE[rx.slot]}`}>
                {SLOT_LABEL[rx.slot]}
              </Badge>
              {why.phase_display && (
                <span className="text-[10px] text-muted-foreground">{why.phase_display}</span>
              )}
              {rx.cns_clamped && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" /> CNS-clamped
                </Badge>
              )}
              {rx.substituted_from_slug && (
                <Badge variant="outline" className="text-[10px] gap-1 border-rose-500/50 text-rose-700 dark:text-rose-300">
                  <ShieldCheck className="h-3 w-3" /> Injury-swap
                </Badge>
              )}
            </div>
            <div className="mt-1 font-semibold text-sm line-clamp-2 break-words">{rx.movement_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 break-words">{dosage}</div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2">
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 space-y-2 text-xs">
          {why.why && (
            <div className="rounded bg-muted/30 p-2">
              <div className="font-medium mb-0.5 flex items-center gap-1"><Info className="h-3 w-3" /> Why today</div>
              <div className="text-muted-foreground">{why.why}</div>
            </div>
          )}
          {why.cue && (
            <div className="rounded border border-primary/20 p-2">
              <div className="font-medium mb-0.5">Cue</div>
              <div className="text-foreground/80">{why.cue}</div>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3" />
            CNS cost: <strong className="text-foreground">{rx.cns_cost}/3</strong>
            {typeof why.training_age_years === "number" && (
              <span>· Training age: {why.training_age_years}y{why.is_pro_prospect ? " · Pro/Prospect" : ""}</span>
            )}
          </div>
          {why.rep_rule && (
            <div className="text-[11px] text-muted-foreground">Phase rule: {why.rep_rule}</div>
          )}
          {why.sequencing_hint && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300">{why.sequencing_hint}</div>
          )}
          {rx.substitution_reason && (
            <div className="text-[11px] text-rose-700 dark:text-rose-300">{rx.substitution_reason}</div>
          )}
          {reductions.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
              <div className="font-medium mb-0.5">Why reduced today</div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {reductions.map((r, i) => <li key={i}>{r.detail}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="default" className="flex-1 gap-1" onClick={() => mark("completed")} disabled={rx.status === "completed"}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => mark("skipped")} disabled={rx.status === "skipped"}>
              Skip
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
