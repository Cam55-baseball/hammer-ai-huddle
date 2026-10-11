/**
 * Power Primer (owner approved 2026-10-07). Renders the builder's
 * why_payload.power_primer on the lift it belongs to. The primer IS the lift's
 * own first sets — sets, reps and % never change here. Display + logging only.
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

const TARGET_LABEL: Record<PowerPrimerPayload["target"], string> = {
  throw: "Throwing speed", bat_speed: "Bat speed", first_step: "First step", jump: "Jump power",
};
const UNIT: Record<PowerPrimerPayload["target"], string> = { throw: "mph", bat_speed: "mph", first_step: "sec (10 yd)", jump: "" };

function pbKey(t: string) { return `hm.pap.best.${t}`; }

export function PowerPrimerBlock({ pp: base, planDate }: { pp: PowerPrimerPayload; planDate?: string | null }) {
  const logHost = usePocketLogHost();
  const [primerIdx, setPrimerIdx] = useState(0);
  const [actionIdx, setActionIdx] = useState(0);
  const primerAlts = useMemo(() => base.primer.source === "library" && base.primer.slug ? papAlternatives(base.primer.slug, base.target) : [], [base]);
  const actionAlts = useMemo(() => base.action.slug ? papAlternatives(base.action.slug, base.target) : [], [base]);
  const pp: PowerPrimerPayload = useMemo(() => {
    const pa = primerIdx > 0 ? primerAlts[primerIdx - 1] : null;
    const aa = actionIdx > 0 ? actionAlts[actionIdx - 1] : null;
    return {
      ...base,
      primer: pa ? { ...base.primer, slug: pa.slug, name: pa.name, heavy: pa.heavy, cue: pa.cue } : base.primer,
      action: aa ? { ...base.action, slug: aa.slug, name: aa.name, oz: aa.oz ?? null, lb: aa.lb ?? null, cue: aa.cue } : base.action,
    };
  }, [base, primerIdx, actionIdx, primerAlts, actionAlts]);
  const warmKey = `hm.pap.warm.${planDate ?? "today"}`;
  const [warm, setWarm] = useState(() => typeof window !== "undefined" && localStorage.getItem(warmKey) === "1");
  const [values, setValues] = useState<number[]>([]);
  const [sets, setSets] = useState(0);
  const [reps, setReps] = useState(0);
  const [entry, setEntry] = useState("");
  const [stopped, setStopped] = useState<string | null>(null);
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const lowerFirst = pp.target === "first_step";
  // Account best (record-only rows, metrics.kind "pap_speed"); device copy is a fallback.
  const { data: accountBest } = useQuery({
    queryKey: ["pap-best", user?.id, pp.target],
    enabled: !!user && pp.target !== "jump",
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wk_session_logs" as any).select("metrics")
        .eq("user_id", user.id).eq("metrics->>kind", "pap_speed").eq("metrics->>target", pp.target).limit(500);
      const vals = ((data as any[]) ?? []).map((r) => Number(r.metrics?.value)).filter((v) => Number.isFinite(v) && v > 0);
      if (!vals.length) return null;
      return lowerFirst ? Math.min(...vals) : Math.max(...vals);
    },
  });
  const best = useMemo(() => {
    if (accountBest != null) return accountBest;
    const v = Number(typeof window !== "undefined" ? localStorage.getItem(pbKey(pp.target)) : NaN);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [pp.target, stopped, accountBest]);
  const locked = pp.requires_throwing_warmup && !warm;
  const lowerIsBetter = pp.target === "first_step";

  function checkStop(next: number[], s: number, r: number): string | null {
    if (s >= pp.max_sets) return "You reached today's set limit.";
    if (pp.max_total_reps != null && r >= pp.max_total_reps) return "You reached today's throw limit.";
    if (!next.length) return null;
    const dayBest = lowerIsBetter ? Math.min(...next) : Math.max(...next);
    if (pp.stop.kind === "throw_swing") {
      const n = pp.stop.in_a_row; const d = pp.stop.drop_pct;
      if (next.length >= n && next.slice(-n).every((v) => v <= dayBest * (1 - d / 100))) return `Speed dropped ${d}% twice in a row. Stop here.`;
    }
    if (pp.stop.kind === "sprint" && next[next.length - 1] >= dayBest * (1 + pp.stop.drop_pct / 100)) return `You got ${pp.stop.drop_pct}% slower. Stop here.`;
    return null;
  }

  function logSet() {
    const v = Number(entry);
    const next = Number.isFinite(v) && v > 0 ? [...values, v] : values;
    const s = sets + 1; const r = reps + pp.action.reps[1];
    setValues(next); setSets(s); setReps(r); setEntry("");
    if (user && Number.isFinite(v) && v > 0 && pp.target !== "jump") {
      void supabase.from("wk_session_logs" as any).insert({
        user_id: user.id, plan_date: planDate ?? new Date().toLocaleDateString("en-CA"), prescription_id: null,
        movement_slug: pp.action.slug ?? `pap_${pp.target}`, load_used: null,
        metrics: { kind: "pap_speed", target: pp.target, value: v, unit: UNIT[pp.target] },
      }).then(({ error }) => { if (!error) qc.invalidateQueries({ queryKey: ["pap-best", user.id, pp.target] }); });
    }
    if (next.length) {
      const top = lowerIsBetter ? Math.min(...next) : Math.max(...next);
      if (best == null || (lowerIsBetter ? top < best : top > best)) localStorage.setItem(pbKey(pp.target), String(top));
    }
    const why = checkStop(next, s, r);
    if (why) setStopped(why);
  }

  const entries = <section data-power-primer-entries className="space-y-2">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-primary" />Power Primer: {TARGET_LABEL[pp.target]}</h4>
    {locked ? (
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Max throws unlock after your throwing warm-up.</p>
    ) : stopped ? (
      <p data-pap-stopped className="text-xs font-medium">{stopped} Now finish your lift.</p>
    ) : <>
      <RestTimer label="Rest after primer" seconds={pp.rest_s[0]} maxSeconds={pp.rest_s[1]} />
      <div className="flex items-center gap-2">
        {UNIT[pp.target] && <Input inputMode="decimal" className="h-8 w-28 text-xs" placeholder={`Best ${UNIT[pp.target]}`} value={entry} onChange={(e) => setEntry(e.target.value)} aria-label={`Speed (${UNIT[pp.target]})`} />}
        <Button size="sm" variant="secondary" onClick={logSet}>Round {sets + 1} done</Button>
      </div>
    </>}
  </section>;

  return (
    <section data-power-primer className="border-b border-border py-2">
      {logHost && createPortal(entries, logHost)}
      <ExerciseDisclosure name={`Power Primer: ${TARGET_LABEL[pp.target]}`}>
      <p className="text-xs text-muted-foreground">
        Do the primer, rest, then one all-out effort. Repeat. Your lift's sets and weights stay the same. Finish the whole lift after.
      </p>
      <ol className="text-xs space-y-1 list-decimal pl-4">
        <li><span className="font-medium">Primer:</span> {pp.primer.name} — {pp.primer.reps[0]}–{pp.primer.reps[1]} reps{pp.primer.source === "lift" ? " (your first sets of this lift)" : ""}. Never to failure. {primerAlts.length > 0 && <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setPrimerIdx((i) => (i + 1) % (primerAlts.length + 1))}>Alternative</Button>}</li>
        <li><span className="font-medium">Rest:</span> {Math.round(pp.rest_s[0] / 60 * 10) / 10}–{Math.round(pp.rest_s[1] / 60 * 10) / 10} min.</li>
        <li><span className="font-medium">All-out effort:</span> {pp.action.name} — {pp.action.reps[0]}–{pp.action.reps[1]} reps{pp.action.oz ? ` (${pp.action.oz} oz ball)` : pp.action.lb ? ` (${pp.action.lb} lb med ball)` : ""}, 100% effort. {actionAlts.length > 0 && <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setActionIdx((i) => (i + 1) % (actionAlts.length + 1))}>Alternative</Button>}</li>
      </ol>
      <p className="text-[11px] text-muted-foreground">
        Limit: {pp.max_sets} rounds{pp.max_total_reps != null ? `, ${pp.max_total_reps} throws total` : ""}{pp.half_volume ? " (half today — readiness is lower)" : ""}.
      </p>
      {pp.requires_throwing_warmup && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={warm} onChange={(e) => { setWarm(e.target.checked); localStorage.setItem(warmKey, e.target.checked ? "1" : "0"); }} />
          I finished my full throwing warm-up (arm care + catch ramp)
        </label>
      )}
      {!logHost && entries}
      {!locked && !stopped && (
          <div className="flex flex-wrap gap-1">
            {pp.stop_buttons.map((b) => (
              <Button key={b} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStopped(`${b} — that's your signal to stop.`)}>{b}</Button>
            ))}
          </div>
      )}
      {best != null && UNIT[pp.target] && <p className="text-[11px] text-muted-foreground">Personal best: {best} {UNIT[pp.target]}</p>}
      </ExerciseDisclosure>
    </section>
  );
}
