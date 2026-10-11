/**
 * Power Primer built into the lift (owner Round 3, 2026-10-11). The lift itself
 * is the potentiation workout: lift set → rest → all-out explosive set → next
 * lift set … Every explosive round needs a 1–5 quality rating on its row; the
 * next one appears only at 4–5 with no speed-drop stop and room under every cap
 * (src/lib/prescription/primerRounds.ts). The lift always continues. Gates and
 * caps come from the builder payload; sets, reps and % of the lift never change.
 */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Lock } from "lucide-react";
import { RestTimer } from "@/components/hammer/cards/RestTimer";
import { usePocketLogHost } from "@/components/hammer/cards/PocketCard";
import { ExerciseDisclosure } from "@/components/hammer/cards/ExerciseDisclosure";
import { papAlternatives } from "../../../supabase/functions/_shared/wic/pap/powerPrimer";
import { QUALITY, primerState, type PrimerRound } from "@/lib/prescription/primerRounds";
import { enqueue, sendJob } from "@/lib/logging/logOutbox";

export type PowerPrimerPayload = {
  target: "throw" | "bat_speed" | "first_step" | "jump";
  primer: { source: "lift" | "library"; slug?: string; name: string; reps: [number, number]; heavy: boolean; cue?: string };
  action: { slug?: string; name: string; reps: [number, number]; oz?: number | null; lb?: number | null; real_throw?: boolean; cue?: string };
  rest_s: [number, number];
  max_sets: number;
  max_total_reps: number | null;
  half_volume: boolean;
  stop: { kind: "throw_swing"; drop_pct: number; in_a_row: number } | { kind: "sprint"; drop_pct: number } | { kind: "feel" };
  stop_buttons: string[];
  requires_throwing_warmup: boolean;
};

const UNIT: Record<PowerPrimerPayload["target"], string> = { throw: "mph", bat_speed: "mph", first_step: "s", jump: "" };
const MEASURE: Record<PowerPrimerPayload["target"], string> = { throw: "Throw speed", bat_speed: "Bat speed", first_step: "Sprint time", jump: "" };

function pbKey(t: string) { return `hm.pap.best.${t}`; }

export const PRIMER_EXPLAINER = [
  "This lift doubles as a speed workout. Each heavy set wakes up your fastest muscle fibers for a few minutes.",
  "After the rest, you do one all-out explosive set (sprint, throw or swing). That explosive set is the effort we measure — give it 100%.",
  "Right after it, rate how it felt from 5 (felt excellent) to 1 (ground feels soft), and add your speed or time if you measured it.",
  "If it felt excellent or good (5 or 4), you get another explosive set after your next lift set. At 3 or lower, or when your speed drops or you reach today's limit, that was the last one — explosive work only helps while it's crisp. Always finish the rest of the lift.",
];

export function PowerPrimerBlock({ pp: base, planDate, liftName, liftSets }: { pp: PowerPrimerPayload; planDate?: string | null; liftName?: string; liftSets?: number }) {
  const logHost = usePocketLogHost();
  const [actionIdx, setActionIdx] = useState(0);
  const actionAlts = useMemo(() => base.action.slug ? papAlternatives(base.action.slug, base.target) : [], [base]);
  const pp: PowerPrimerPayload = useMemo(() => {
    const aa = actionIdx > 0 ? actionAlts[actionIdx - 1] : null;
    return { ...base, action: aa ? { ...base.action, slug: aa.slug, name: aa.name, oz: aa.oz ?? null, lb: aa.lb ?? null, cue: aa.cue } : base.action };
  }, [base, actionIdx, actionAlts]);
  const date = planDate ?? new Date().toLocaleDateString("en-CA");
  const warmKey = `hm.pap.warm.${planDate ?? "today"}`;
  const [warm, setWarm] = useState(() => typeof window !== "undefined" && localStorage.getItem(warmKey) === "1");
  const [rounds, setRounds] = useState<PrimerRound[]>([{ rating: null, value: null }]);
  const [entry, setEntry] = useState("");
  const [manualStop, setManualStop] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const lowerIsBetter = pp.target === "first_step";
  const sets = Math.max(liftSets ?? 0, 1);
  const rules = { max_sets: Math.min(pp.max_sets, sets), max_total_reps: pp.max_total_reps, stop: pp.stop, actionReps: pp.action.reps[1], realThrow: !!pp.action.real_throw };
  const st = primerState(rules, rounds);
  const stopReason = manualStop ?? st.stopReason;

  const { data: accountBest } = useQuery({
    queryKey: ["pap-best", user?.id, pp.target],
    enabled: !!user && pp.target !== "jump",
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wk_session_logs" as any).select("metrics")
        .eq("user_id", user.id).eq("metrics->>kind", "pap_speed").eq("metrics->>target", pp.target).limit(500);
      const vals = ((data as any[]) ?? []).map((r) => Number(r.metrics?.value)).filter((v) => Number.isFinite(v) && v > 0);
      if (!vals.length) return null;
      return lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
    },
  });
  const best = useMemo(() => {
    if (accountBest != null) return accountBest;
    const v = Number(typeof window !== "undefined" ? localStorage.getItem(pbKey(pp.target)) : NaN);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [pp.target, st.done, accountBest]);
  const locked = pp.requires_throwing_warmup && !warm;

  function rate(i: number, rating: number) {
    const v = Number(entry);
    const value = Number.isFinite(v) && v > 0 ? v : null;
    const next = rounds.map((r, n) => n === i ? { rating, value } : r);
    const s2 = primerState(rules, next);
    setRounds(s2.next ? [...next, { rating: null, value: null }] : next);
    setEntry("");
    const label = QUALITY.find((q) => q.value === rating)?.label ?? "";
    if (value != null) {
      const top = value;
      if (best == null || (lowerIsBetter ? top < best : top > best)) localStorage.setItem(pbKey(pp.target), String(top));
    }
    if (!user) return;
    // Every rating is saved for trends (record-only row; speed optional).
    void supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, plan_date: date, prescription_id: null,
      movement_slug: pp.action.slug ?? `pap_${pp.target}`, load_used: null,
      metrics: { kind: "pap_speed", target: pp.target, round: i + 1, rating, rating_label: label, value, unit: UNIT[pp.target] || null, lift: liftName ?? null },
    }).then(({ error }) => { setSaveFailed(!!error); if (!error) qc.invalidateQueries({ queryKey: ["pap-best", user.id, pp.target] }); });
    if (pp.action.real_throw) {
      const id = `arm:${user.id}:${date}:pap_max_throws`;
      enqueue({ kind: "arm", id, userId: user.id, at: Date.now(), row: { entry_date: date, source: "pitching", throw_type: "pap_max_throws", count: s2.realThrows, prescribed: pp.max_total_reps, status: "done" } });
      void sendJob(id).then((ok) => { if (!ok) setSaveFailed(true); });
    }
  }

  const ratedCount = st.done;
  const rows: JSX.Element[] = [];
  for (let i = 0; i < sets; i++) {
    rows.push(<li key={`l${i}`} data-primer-lift-set={i + 1} className="text-xs"><span className="font-medium">Lift set {i + 1}</span> — {liftName ?? pp.primer.name} (log it above)</li>);
    const showExplosive = i < rounds.length && !(stopReason && i >= ratedCount) && i < rules.max_sets;
    if (!showExplosive) continue;
    const r = rounds[i];
    rows.push(<li key={`e${i}`} data-primer-explosive={i + 1} className="space-y-1 rounded-md border border-primary/40 bg-primary/5 p-2">
      <p className="text-xs font-semibold"><Zap className="mr-1 inline h-3 w-3 text-primary" />{pp.action.name} — {pp.action.reps[1]} rep{pp.action.reps[1] === 1 ? "" : "s"}</p>
      <p data-primer-measured className="text-[11px] font-semibold text-primary">All-out effort — this is what we measure</p>
      {r.rating == null ? <>
        <RestTimer label="Rest after the lift set" seconds={pp.rest_s[0]} maxSeconds={pp.rest_s[1]} />
        {UNIT[pp.target] && <Input inputMode="decimal" className="h-8 w-36 text-xs" placeholder={`${MEASURE[pp.target]} (${UNIT[pp.target]}, optional)`} value={entry} onChange={(e) => setEntry(e.target.value)} aria-label={`${MEASURE[pp.target]} (${UNIT[pp.target]})`} />}
        <p className="text-[11px] font-medium">How did that explosive set feel? (required)</p>
        <div role="group" aria-label={`Rate explosive set ${i + 1}`} className="flex flex-wrap gap-1">
          {QUALITY.map((q) => <Button key={q.value} size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => rate(i, q.value)}>{q.value}/5 {q.label}</Button>)}
        </div>
      </> : <p data-primer-rating={r.rating} className="text-[11px]">Rated {r.rating}/5 — {QUALITY.find((q) => q.value === r.rating)?.label}{r.value != null ? ` · ${r.value} ${UNIT[pp.target]}` : ""}</p>}
    </li>);
  }

  const entries = <section data-power-primer-entries className="space-y-2">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-primary" />{liftName ?? pp.primer.name}: heavy set + all-out effort</h4>
    {locked ? (
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> All-out throws unlock after your throwing warm-up (in the drop-down below). Your lift sets go ahead now.</p>
    ) : <ol className="space-y-1">{rows}</ol>}
    {stopReason && !locked && <p data-pap-stopped className="text-xs font-medium">{stopReason}</p>}
    {pp.action.real_throw && <p data-primer-arm className="text-[11px] text-muted-foreground">Arm count: {st.realThrows} real throws = {st.armUnits} arm units (each counts 1.5).</p>}
    {saveFailed && <p role="status" className="text-[11px] text-amber-700 dark:text-amber-300">Couldn't save your rating yet — it will retry.</p>}
  </section>;

  return (
    <section data-power-primer className="border-b border-border py-2">
      {logHost && createPortal(entries, logHost)}
      <ExerciseDisclosure name={`${liftName ?? "Lift"}: how the heavy set + all-out effort works`}>
        {PRIMER_EXPLAINER.map((t) => <p key={t} className="text-xs text-muted-foreground">{t}</p>)}
        <p className="text-xs"><span className="font-medium">All-out effort:</span> {pp.action.name}{pp.action.oz ? ` (${pp.action.oz} oz ball)` : pp.action.lb ? ` (${pp.action.lb} lb med ball)` : ""}, {pp.action.reps[0]}–{pp.action.reps[1]} reps each time. {actionAlts.length > 0 && <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setActionIdx((i) => (i + 1) % (actionAlts.length + 1))}>Alternative</Button>}</p>
        <p className="text-[11px] text-muted-foreground">Limit today: {rules.max_sets} all-out sets{pp.max_total_reps != null ? `, ${pp.max_total_reps} throws total` : ""}{pp.half_volume ? " (half today — readiness is lower)" : ""}.</p>
        {pp.requires_throwing_warmup && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={warm} onChange={(e) => { setWarm(e.target.checked); localStorage.setItem(warmKey, e.target.checked ? "1" : "0"); }} />
            I finished my full throwing warm-up (arm care + catch ramp)
          </label>
        )}
        {!logHost && entries}
        {!locked && !stopReason && pp.stop_buttons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pp.stop_buttons.map((b) => <Button key={b} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setManualStop(`${b} — no more all-out sets today. Finish your lift.`)}>{b}</Button>)}
          </div>
        )}
        {best != null && UNIT[pp.target] && <p className="text-[11px] text-muted-foreground">Personal best: {best} {UNIT[pp.target]}</p>}
      </ExerciseDisclosure>
    </section>
  );
}
