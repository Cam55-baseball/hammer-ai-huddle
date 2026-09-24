import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";
import {
  stripText, type AthletePhasePlan,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";


/** The athlete's latest phase plan — null unless adaptive_phases is on for them. */
export function useAdaptivePlan(): AthletePhasePlan | null {
  const { user } = useOptionalAuth();
  const sw = useQuery({
    queryKey: ["feature-switch", "adaptive_phases", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("wk_feature_switches" as any)
        .select("feature_key, mode, allowlist, updated_by")
        .eq("feature_key", "adaptive_phases")
        .maybeSingle();
      return isSwitchOnFor(data as any, user?.id ?? null);
    },
  });
  const on = sw.data === true;
  const plan = useQuery({
    queryKey: ["adaptive-phase-plan", user?.id],
    enabled: on,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("adaptive_phase_shadow")
        .select("plan")
        .eq("user_id", user!.id)
        .order("plan_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.plan ?? null) as AthletePhasePlan | null;
    },
  });
  const p = plan.data;
  return on && p && p.disciplines && p.phase ? p : null;
}

/** §6 + v1.1 — one plain-words strip. Renders nothing unless adaptive_phases is on for this athlete. */
export function AdaptivePhaseStrip() {
  const [open, setOpen] = useState(false);
  const p = useAdaptivePlan();
  if (!p) return null;
  return <PhaseStripView plan={p} open={open} onToggle={() => setOpen((o) => !o)} />;
}

/** Ramp Law §5 — the weekly card's ramp lines. Nothing when no ramp is running. */
export function RampLines() {
  const p = useAdaptivePlan();
  if (!p?.ramps?.length) return null;
  return (
    <div className="space-y-0.5 px-1 text-xs text-foreground" data-testid="weekly-ramp-lines">
      {p.ramps.map((r) => <div key={r.discipline}>{r.line}</div>)}
    </div>
  );
}

/** Pure view (tested): the top line, then ONE collapsed "Why this phase matters" line. Nothing else. */
export function PhaseStripView({ plan, open, onToggle }: { plan: AthletePhasePlan; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" data-testid="phase-strip">
      <div className="font-medium">{stripText(plan)}</div>
      {(plan.ramps ?? []).map((r) => (
        <div key={r.discipline} className="text-xs text-foreground" data-testid="ramp-line">{r.line}</div>
      ))}
      {(plan.rampWarnings ?? []).map((w) => (
        <div key={w} className="text-xs text-foreground" data-testid="ramp-warning">{w}</div>
      ))}
      <button type="button" aria-expanded={open} onClick={onToggle} className="mt-1 inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-2" data-testid="phase-why-toggle">
        Why this phase matters
      </button>
      {open && <p className="mt-1 text-muted-foreground" data-testid="phase-why">{plan.why}</p>}
    </div>
  );
}
