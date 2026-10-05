import { useState } from "react";
import { Button } from "@/components/ui/button";
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

/** Pure view: the kind of plan, its current phase, then what that means for lifting. */
export function PhaseStripView({ plan, open, onToggle }: { plan: AthletePhasePlan; open: boolean; onToggle: () => void }) {
  const phaseLabels = { P1: "Build your strength base", P2: "Lift heavier and move faster", P3: "Turn strength into game speed", P4: "Game-ready training" } as const;
  const displayNames: Record<string, string> = { "Power Potential": phaseLabels.P1, "Power Building": phaseLabels.P2, Explosiveness: phaseLabels.P3, "Game-Ready Production": phaseLabels.P4 };
  const displayLine = stripText(plan).replace(/Power Potential|Power Building|Explosiveness|Game-Ready Production/g, name => displayNames[name] ?? name);
  return (
    <div className="rounded-md border border-border/80 bg-background/65 px-4 py-3 text-sm text-foreground" data-testid="phase-strip">
      <h3 className="text-xs font-bold uppercase text-muted-foreground" data-testid="phase-heading">Your training phase</h3>
      <p className="mt-2 text-base font-semibold leading-snug" data-testid="phase-name">{displayLine}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{({ P1: "Lifting: build a strong base with controlled work.", P2: "Lifting: build strength with heavier and faster work.", P3: "Lifting: move weight faster and turn strength into speed.", P4: "Lifting: short, sharp lifts to keep your strength without leaving you tired for games." } as const)[plan.phase]}</p>
       {(plan.ramps ?? []).length > 0 && <div className="mt-3 space-y-1"><h4 className="text-xs font-bold text-muted-foreground">Your return to full training</h4>{plan.ramps?.map((r) => (
         <div key={r.discipline} className="text-xs text-foreground" data-testid="ramp-line">{r.line}</div>
       ))}</div>}
       {(plan.rampWarnings ?? []).length > 0 && <div className="mt-2 space-y-1"><h4 className="text-xs font-bold text-muted-foreground">What to watch today</h4>{plan.rampWarnings?.map((w) => (
         <div key={w} className="text-xs text-foreground" data-testid="ramp-warning">{w}</div>
       ))}</div>}
      <Button type="button" variant="link" aria-expanded={open} onClick={onToggle} className="mt-1 min-h-11 h-auto px-0 text-xs text-muted-foreground underline underline-offset-2" data-testid="phase-why-toggle">
        Why you're training this way
      </Button>
      {open && <p className="mt-1 text-muted-foreground" data-testid="phase-why">{plan.why}</p>}
    </div>
  );
}
