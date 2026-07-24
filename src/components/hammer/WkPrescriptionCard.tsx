/**
 * WkPrescriptionCard — single elite prescription with full transparency payload.
 * Shows phase, why-this-lift, training-age reasoning, CNS load, reductions,
 * injury substitutions, and a complete/skip control.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ShieldCheck, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useHammerDailyTasks } from "@/hooks/useHammerDailyTasks";

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

function cleanAthleteCopy(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/Chosen because[^.]*\./gi, "")
    .replace(/Doctrine:[^.]*\./gi, "")
    .replace(/\b(?:beginner|\d+(?:\.\d+)?-year) training age\b/gi, "")
    .replace(/\s*\(pro prospect\)/gi, "")
    .replace(/\bOffseason Q[1-4]\s+—\s+[^.]+/gi, "")
    .replace(/\bIn-Season\s+—\s+[^.]+/gi, "")
    .replace(/\bPost-Season\s+—\s+[^.]+/gi, "")
    .replace(/\bCNS cost\b/gi, "training load")
    .replace(/\bCNS is fresh\b/gi, "you are freshest")
    .replace(/\bwhile CNS fresh\b/gi, "while you are freshest")
    .replace(/\bCNS\b/g, "readiness")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function WkPrescriptionCard({
  rx,
  phaseDisplay,
  phaseKey,
  generating,
}: {
  rx: WkRx;
  phaseDisplay?: string | null;
  phaseKey?: string | null;
  generating?: boolean;
}) {
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
        duration_seconds_completed: rx.duration_seconds ?? null,
        distance_feet_completed: rx.distance_feet ?? null,
        total_reps_completed: rx.total_reps ?? null,
        rpe: null,
      }).then(({ error: logErr }) => {
        if (logErr) console.warn("wk_session_logs insert failed", logErr);
      });
    }
    toast.success(status === "completed" ? "Logged — nice work." : "Skipped");
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
  };

  const why = rx.why_payload;
  const storedPhase = why?.phase ?? rx.phase ?? null;
  // Only surface the "older season" language when the plan is settled. While
  // Hammer is regenerating, show a softer "Updating..." note so athletes
  // aren't alarmed by a transient mismatch.
  const rawMismatch = !!phaseKey && !!storedPhase && storedPhase !== phaseKey;
  const phaseMismatch = rawMismatch && !generating;
  const athleteWhy = generating && rawMismatch
    ? `Updating your plan to match ${phaseDisplay ?? "your current phase"}…`
    : phaseMismatch
    ? `This movement was generated under an older season setting. Hammer is rebuilding today's plan so it matches ${phaseDisplay ?? "your current phase"}.`
    : cleanAthleteCopy(rx.why_v2?.why_exercise ?? why?.why ?? null);
  const todayLine = phaseMismatch || (generating && rawMismatch)
    ? null
    : cleanAthleteCopy(rx.why_v2?.why_today ?? null);
  const reductions = why?.reductions ?? [];
  // Precise, age-8-readable dosage. Every card must show at least one
  // concrete number (sets/reps, seconds, feet, or total contacts) so athletes
  // know exactly what to execute — no more vague "1 × 1" placeholders.
  const unit = (rx.dosage_unit ?? "reps").toLowerCase();
  const dosageParts: string[] = [];
  // For total-dose movements (innings, contacts, seconds, feet) the primary
  // number is `total_reps` — do NOT render "X sets × 1 reps" alongside it.
  const isTotalDoseUnit =
    unit === "innings" || unit === "contacts" || unit === "throws" ||
    unit === "seconds" || unit === "feet";
  const hasTotalDose = !!rx.total_reps || !!rx.duration_seconds || !!rx.distance_feet;

  // Time-based mobility/warmup: render a single clean total-duration string
  // instead of "1 sets × 1 reps" or "45 sec per set".
  const isSecondsOnly =
    unit === "seconds" && !!rx.duration_seconds &&
    (!rx.sets || rx.sets <= 1) && (!rx.reps || rx.reps <= 1) &&
    !rx.total_reps && !rx.distance_feet;

  if (isSecondsOnly) {
    const secs = rx.duration_seconds as number;
    dosageParts.push(
      secs >= 60
        ? `${Math.round(secs / 60)} min total`
        : `${secs} sec total`
    );
  } else {
    const setsRepsMeaningful =
      !!rx.sets && !!rx.reps && !(rx.sets === 1 && rx.reps === 1) &&
      !(isTotalDoseUnit && hasTotalDose);
    if (setsRepsMeaningful) {
      const repsLabel =
        unit === "seconds" ? `${rx.reps} sec` :
        unit === "feet" ? `${rx.reps} ft` :
        unit === "contacts" ? `${rx.reps} contacts` :
        unit === "throws" ? `${rx.reps} throws` :
        unit === "each" ? `${rx.reps} each side` :
        `${rx.reps} reps`;
      dosageParts.push(`${rx.sets} sets × ${repsLabel}`);
    } else if (rx.sets && rx.sets > 1 && !(isTotalDoseUnit && hasTotalDose)) {
      dosageParts.push(`${rx.sets} sets`);
    } else if (rx.reps && rx.reps > 1 && !(isTotalDoseUnit && hasTotalDose)) {
      dosageParts.push(`${rx.reps} reps`);
    }
    if (rx.duration_seconds) {
      dosageParts.push(
        rx.duration_seconds >= 60
          ? `${Math.round(rx.duration_seconds / 60)} min per set`
          : `${rx.duration_seconds} sec per set`
      );
    }
    if (rx.distance_feet) dosageParts.push(`${rx.distance_feet} feet per rep`);
    if (rx.total_reps && rx.total_reps !== rx.reps) {
      const totalLabel =
        unit === "innings" ? `${rx.total_reps} total innings` :
        unit === "contacts" ? `${rx.total_reps} total contacts` :
        unit === "throws" ? `${rx.total_reps} total throws` :
        `${rx.total_reps} total`;
      dosageParts.push(totalLabel);
    }
    if (rx.tempo) dosageParts.push(`tempo ${rx.tempo}`);
    if (rx.load_pct) dosageParts.push(`${rx.load_pct}% 1RM`);
  }
  const dosage = dosageParts.length > 0
    ? dosageParts.join(" • ")
    : "Complete as described in the cue below.";

  return (
    <Card className={`p-3 border ${rx.status === "completed" ? "opacity-60" : ""}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className={`text-[10px] ${SLOT_TONE[rx.slot]}`}>
                {SLOT_LABEL[rx.slot]}
              </Badge>
              {rx.substituted_from_slug && (
                <Badge variant="outline" className="text-[10px] gap-1 border-rose-500/50 text-rose-700 dark:text-rose-300">
                  <ShieldCheck className="h-3 w-3" /> Injury-swap
                </Badge>
              )}
              {rx.why_payload?.override && (
                <Badge variant="outline" className="text-[10px] gap-1 border-violet-500/50 text-violet-700 dark:text-violet-300">
                  Override — 1 session
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
          {(() => {
            const hasWhy = athleteWhy || todayLine;
            if (!hasWhy) return null;
            return (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded border border-primary/30 bg-primary/5 p-2 flex items-center justify-between gap-2 text-left hover:bg-primary/10 transition-colors group"
                  >
                    <span className="font-medium flex items-center gap-1">
                      <Info className="h-3 w-3" /> Why this movement
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 rounded border border-primary/20 bg-primary/5 p-2 space-y-1 text-muted-foreground">
                  {athleteWhy && <div>{athleteWhy}</div>}
                  {todayLine && (
                    <div>
                      <span className="text-foreground">Today —</span> {todayLine}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })()}
          {why.cue && (
            <div className="rounded border border-primary/20 p-2">
              <div className="font-medium mb-0.5">Cue</div>
              <div className="text-foreground/80">{why.cue}</div>
            </div>
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
