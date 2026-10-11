/**
 * WkPrescriptionCard — single elite prescription with full transparency payload.
 * Shows phase, why-this-lift, training-age reasoning, CNS load, reductions,
 * injury substitutions, and a complete/skip control.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { PocketCard, usePocketDetails, usePocketLogHost } from "./cards/PocketCard";
import { ExerciseLogSheet } from "./logging/ExerciseLogSheet";
import { useCheckedRx } from "@/lib/hammer/prescription/useCheckedRx";
import { repairInstruction } from "../../../supabase/functions/_shared/wic/integrity/doseIntegrity";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ShieldCheck, CheckCircle2, Info, Repeat2, Loader2 } from "lucide-react";
import { LiftSwapSheet, LiftSwapUndoChip } from "@/components/hammer/LiftSwapSheet";
import { useSwapLadder } from "@/hooks/useLiftSubstitution";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { useHammerDailyTasks } from "@/hooks/useHammerDailyTasks";
import { LogButton } from "@/components/hammer/logging/LogButton";
import { CardOutcomeLog } from "@/components/hammer/logging/CardOutcomeLog";
import { useLiftPlateau, useVerifiedMax } from "@/hooks/useVerifiedMax";
import { workingWeight, UNLOCK_COPY } from "@/lib/lift/verifiedMax";
import { MethodBadge, MethodPanel } from "@/components/hammer/MethodPanel";
import { readTrainingMethod } from "@/lib/wic/methods";
import { deriveExecutionDisplay, type ExecutionSource } from "@/lib/wic/execution/executionDisplay";
import {
  WkProgressionBadge,
  WkProgressionNote,
  type ProgressionPayloadShape,
} from "@/components/hammer/WkProgressionNote";
import { missedStillEditable } from "@/lib/wic/execution/liftCompletion";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";
import { ProgramContentBlock, LimbHintBlock, GameFlushBlock } from "@/components/hammer/ProgramContentBlock";
import { ExerciseInstructions } from "./cards/ExerciseInstructions";
import { ActivityBasics } from "./cards/ActivityBasics";
import { formatPrescriptionDose } from "@/lib/hammer/prescription/formatPrescriptionDose";
import { ExerciseDisclosure } from "./cards/ExerciseDisclosure";
import { InlinePrescriptionLog } from "@/components/hammer/logging/InlinePrescriptionLog";

const SLOT_TONE: Record<WkRx["slot"], string> = {
  lift: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  supplemental: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  speed: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bat_speed: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  conditioning: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cross_sport: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ub_primer: "bg-primary/10 text-primary",
  windmill: "bg-primary/10 text-primary",
};

const SLOT_LABEL: Record<WkRx["slot"], string> = {
  lift: "Lift",
  supplemental: "Supplemental",
  speed: "Speed",
  bat_speed: "Bat-Speed",
  conditioning: "Conditioning",
  cross_sport: "Cross-Sport",
  ub_primer: "Upper-Body Primer",
  windmill: "Windmill Pitching",
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
  rx: rawRx,
  phaseDisplay,
  phaseKey,
  generating,
  side = null,
  allowSwap = true,
}: {
  rx: WkRx;
  phaseDisplay?: string | null;
  phaseKey?: string | null;
  generating?: boolean;
  side?: "L" | "R" | null;
  allowSwap?: boolean;
}) {
  const inPocket = usePocketDetails();
  const logHost = usePocketLogHost();
  // Prescription double-check: every card is repaired before it is shown.
  const rx = useCheckedRx(rawRx);
  const repair = (t: string) => repairInstruction(t, rx, "guide") ?? t;
  const [swapOpen, setSwapOpen] = useState(false);
  // Availability is resolved against the certified ladder (or, for rows that
  // predate substitution families, the identical catalog-derived ladder).
  const swapLadder = useSwapLadder(allowSwap ? rx : null, allowSwap);
  const swapAvailable = allowSwap && swapLadder.hasOptions;

  const { user } = useAuth();
  const vMax = useVerifiedMax(rx.load_pct ? rx.movement_slug : null);
  const plateau = useLiftPlateau(allowSwap && rx.slot === "lift" ? rx.movement_slug : null);
  const qc = useQueryClient();
  const tasks = useHammerDailyTasks(rx.plan_date);
  const taskSeed = {
    taskId: rx.id,
    source: "wk_prescription" as const,
    sourceRef: rx.slot,
    side,
    payload: { name: rx.movement_name, slug: rx.movement_slug, side },
  };
  const checked = side ? tasks.isDone(rx.id, side) : rx.status === "completed" || tasks.isDone(rx.id);

  const isMissed = (rx.status as string) === "missed";
  const missedLocked = isMissed && !missedStillEditable(rx.plan_date);

  const mark = async (status: "completed" | "skipped") => {
    if (!user?.id) return;
    if (missedLocked) {
      toast("This lift was more than 7 days ago, so it can't be changed now.");
      return;
    }
    if (!side) {
      const { error } = await supabase
        .from("wk_prescriptions" as any)
        .update({ status })
        .eq("id", rx.id);
      if (error) {
        toast.error(`Couldn't save — ${error.message || "try again"}.`);
        return;
      }
    }
    tasks.toggleTask(taskSeed, status === "completed");
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
        load_used: null, // never store a % as a weight (Round 8 2c)
        duration_seconds_completed: rx.duration_seconds ?? null,
        distance_feet_completed: rx.distance_feet ?? null,
        total_reps_completed: rx.total_reps ?? null,
        rpe: null,
        notes: side ? `${side}-side bat speed completed` : null,
      }).then(({ error: logErr }) => {
        if (logErr) console.warn("wk_session_logs insert failed", logErr);
      });
    }
    toast.success(status === "completed" ? "Logged — nice work." : "Skipped");
    qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
  };

  // Unchecking takes the mark back: the row returns to planned (or to missed
  // if the day already ended and was marked missed). It never records a skip.
  const toggleCheckbox = (next: boolean) => {
    if (next) {
      void mark("completed");
      return;
    }
    if (missedLocked || !user?.id) return;
    tasks.toggleTask(taskSeed, false);
    if (!side) {
      void supabase
        .from("wk_prescriptions" as any)
        .update({ status: "planned" })
        .eq("id", rx.id)
        .then(({ error }) => {
          if (error) toast.error(`Couldn't save — ${error.message || "try again"}.`);
          else qc.invalidateQueries({ queryKey: ["wk-rx", user.id, rx.plan_date] });
        });
    }
  };

  const why = rx.why_payload;
  const trainingMethod = readTrainingMethod(why);
  const progressionPayload = ((why as any)?.progression ?? null) as ProgressionPayloadShape | null;
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
  // Step 21D4 — "Why reduced today" belongs to real trims only. A scheduling
  // statement ("You're rested — heavy day is on", "Next heavy day: Monday")
  // describes the day, not a reduction, and belongs in the day header.
  const reductions = (why?.reductions ?? []).filter(
    (r: { detail?: string | null }) => !isDayStatementNotAReduction(r?.detail),
  );
  // Precise, age-8-readable dosage. Every card must show at least one
  // concrete number (sets/reps, seconds, feet, or total contacts) so athletes
  // know exactly what to execute — no more vague "1 × 1" placeholders.
  const unit = (rx.dosage_unit ?? "reps").toLowerCase();
  // Execution layer — Pass C section 1. Display only: this never returns a
  // set, a rep or a load, and a null/unknown field renders nothing.
  const exec = deriveExecutionDisplay(rx as unknown as ExecutionSource);
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
    // Execution layer (display only). `exec.repsSuffix` is a "+" on the way to
    // the screen; `rx.reps` below is still the doctrine's number, untouched.
    const setsText = exec.setsLabel ?? `${rx.sets} ${rx.sets === 1 ? "set" : "sets"}`;
    if (setsRepsMeaningful) {
      const repsLabel =
        unit === "seconds" ? `${rx.reps} sec` :
        unit === "feet" ? `${rx.reps} ft` :
        unit === "contacts" ? `${rx.reps} contacts` :
        unit === "throws" ? `${rx.reps} throws` :
        unit === "each" ? `${rx.reps} each side` :
        `${rx.reps}${exec.repsSuffix} reps`;
      dosageParts.push(`${setsText} × ${repsLabel}`);
    } else if (rx.sets && rx.sets > 1 && !(isTotalDoseUnit && hasTotalDose)) {
      dosageParts.push(setsText);
    } else if (rx.reps && rx.reps > 1 && !(isTotalDoseUnit && hasTotalDose)) {
      dosageParts.push(`${rx.reps}${exec.repsSuffix} reps`);
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
    if (exec.densityLabel) dosageParts.push(exec.densityLabel);
    if (exec.rirLabel) dosageParts.push(exec.rirLabel);
    if (rx.tempo) dosageParts.push(`tempo ${rx.tempo}`);
    if (rx.load_pct) {
      const w = workingWeight(vMax, rx.load_pct);
      dosageParts.push(w != null ? `${rx.load_pct}% of your max · working weight: ${w} lb` : `${rx.load_pct}% of your max · ${UNLOCK_COPY}`);
    }
  }
  const baseDose = formatPrescriptionDose(rx);
  const dosage = [baseDose, exec.densityLabel, exec.rirLabel, rx.tempo ? `tempo ${rx.tempo}` : null]
    .filter(Boolean).join(" • ");

  if (!inPocket) return <PocketCard id={`activity_${rx.id}`} category={rx.movement_name} tone="" planDate={rx.plan_date} prescribed countLabel={dosage} progress={{ done: checked ? 1 : 0, total: 1 }}>
    {() => <WkPrescriptionCard rx={rawRx} phaseDisplay={phaseDisplay} phaseKey={phaseKey} generating={generating} side={side} allowSwap={allowSwap} />}
  </PocketCard>;
  return (
    <div className={`border-b border-border py-2 ${checked ? "opacity-60" : ""}`}>
      {logHost && createPortal(<section data-exercise-entry-grid className="space-y-2"><h4 className="text-sm font-semibold break-words">{rx.movement_name}</h4><InlinePrescriptionLog rx={rx} /></section>, logHost)}
      <ExerciseDisclosure name={rx.movement_name}>
        <div className="mt-2 space-y-2 text-xs">
          <div className="font-medium text-foreground" data-prescribed-dose>{dosage}</div>
          <ActivityBasics name={rx.movement_name} slug={rx.movement_slug} dosage={dosage} setup={(why as any)?.setup} cue={why.cue} repair={repair} />
          <CardOutcomeLog rx={rx} disabled={missedLocked} />
          <ExerciseLogSheet open onOpenChange={() => {}} rx={rx} dosageText={dosage} embedded />
          {(() => {
            const whyText = String(athleteWhy ?? "").trim();
            const rawToday = String(todayLine ?? "").trim();
            const today = /[\p{L}\p{N}]/u.test(rawToday) ? rawToday : "";
            const changes = Array.from(new Set([
              ...reductions.map((r) => athleteNoticeCopy(r)),
              ...(rx.substitution_reason ? [String(rx.substitution_reason)] : []),
            ]));
            return (
              <ExerciseInstructions name={rx.movement_name} slug={rx.movement_slug} dosage={dosage}
                setup={(why as any)?.setup} cue={why.cue}
                why={[whyText, today].filter(Boolean).join(" ") || null}
                changes={changes} repair={repair} expanded />
            );
          })()}
          {plateau && (
            <p data-lift-plateau className="text-[11px] text-foreground">
              No new best on this lift in 3 sessions.{swapAvailable ? " Try a different lift of the same kind — tap Alternative. Your sets and reps stay the same." : " Keep your form clean — progress will come."}
            </p>
          )}
          {allowSwap && rx.substituted_from_slug && <LiftSwapUndoChip rx={rx} />}
        </div>

        <div className="mt-2 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {SLOT_LABEL[rx.slot] && (
              <Badge variant="secondary" className={`text-[10px] ${SLOT_TONE[rx.slot]}`}>
              {SLOT_LABEL[rx.slot]}
            </Badge>
            )}
            {rx.substituted_from_slug && !allowSwap && (
              <Badge variant="outline" className="text-[10px] gap-1 border-rose-500/50 text-rose-700 dark:text-rose-300">
                <ShieldCheck className="h-3 w-3" /> Injury-swap
              </Badge>
            )}
            {trainingMethod && <MethodBadge method={trainingMethod} />}
            {rx.why_payload?.override && (
              <Badge variant="outline" className="text-[10px] gap-1 border-violet-500/50 text-violet-700 dark:text-violet-300">
                Override — 1 session
              </Badge>
            )}
          </div>
          {trainingMethod && <MethodPanel method={trainingMethod} />}
          {typeof (rx.why_payload as any)?.adaptive_phase?.ramp_line === "string" && (
            <div className="text-xs text-foreground break-words" data-testid="card-ramp-line">
              {(rx.why_payload as any).adaptive_phase.ramp_line}
            </div>
          )}
          <ProgramContentBlock pc={(rx.why_payload as any)?.program_content} />
          <LimbHintBlock text={(rx.why_payload as any)?.limb_hint} />
          <GameFlushBlock gf={(rx.why_payload as any)?.game_flush} rxId={rx.id} />
          {(exec.intentLabel || exec.perSideLabel || exec.asymmetryLabel || exec.executionNote || exec.intensityModeLabel) && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {exec.intentLabel && <Badge variant="outline" className="text-[10px]">{exec.intentLabel}</Badge>}
                {exec.perSideLabel && <Badge variant="outline" className="text-[10px]">{exec.perSideLabel}</Badge>}
                {exec.asymmetryLabel && <span className="text-[11px] text-muted-foreground">{exec.asymmetryLabel}</span>}
              </div>
              {exec.executionNote && <div className="text-[11px] text-muted-foreground break-words">{exec.executionNote}</div>}
              {exec.intensityModeLabel && <div className="text-[11px] text-muted-foreground break-words">{exec.intensityModeLabel}</div>}
            </div>
          )}
          {why.sequencing_hint && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300">{why.sequencing_hint}</div>
          )}
        </div>
        {allowSwap && <Button variant="outline" size="sm" disabled={!swapAvailable} onClick={() => setSwapOpen(true)}>Alternative</Button>}
        {swapAvailable && <LiftSwapSheet rx={rx} open={swapOpen} onOpenChange={setSwapOpen} />}
      </ExerciseDisclosure>
    </div>
  );
}

/**
 * Step 21D4 — a "reduction" must describe something that was actually cut.
 * These lines are day-level scheduling statements produced by the rest-day
 * calculator when nothing was reduced; they render in the day header instead.
 * Function declaration, so it hoists above its use in the component.
 */
export function isDayStatementNotAReduction(detail?: string | null): boolean {
  const s = String(detail ?? "").trim().toLowerCase();
  if (!s) return true;
  return (
    s.startsWith("you're rested") ||
    s.startsWith("you’re rested") ||
    s.startsWith("next heavy day") ||
    s === "standard spacing today."
  );
}
