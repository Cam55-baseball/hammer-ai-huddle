import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
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

/** Pure view: heading (what kind of thing) · name (which phase) · one plain line (what it means).
 *  No day counts or timelines here (owner 2026-10-05) — Ask Hammer carries the detail. */
export function PhaseStripView({ plan, open, onToggle }: { plan: AthletePhasePlan; open: boolean; onToggle: () => void }) {
  const phaseLabels = { P1: "Build your strength base", P2: "Lift heavier and move faster", P3: "Turn strength into game speed", P4: "Game-ready training" } as const;
  const where = plan.ramp?.activeToday ? "getting ready for games"
    : plan.mode === "in_season" ? "in season"
    : plan.mode === "maintenance" ? "staying game-ready"
    : "building toward your season";
  const displayLine = `${phaseLabels[plan.phase]} · ${where}`;
  const meaning = ({
    P1: "Lifting: controlled work to build a strong base.",
    P2: "Lifting: heavier and faster work to build strength.",
    P3: "Lifting: move weight fast so strength turns into speed.",
    P4: "Lifting: short, sharp lifts that keep you strong and fresh for games.",
  } as const)[plan.phase];
  const ramping = (plan.ramps ?? []).length > 0;
  const askHammer = () => {
    const detail = [stripText(plan), ...(plan.ramps ?? []).map((r) => r.line), ...(plan.rampWarnings ?? [])].join(" | ");
    const q = `My training phase card says "${displayLine}". The full plan detail is: ${detail}. Explain where I am in my programme and what's coming next.`;
    window.location.assign(`/hammer/recall?ask=${encodeURIComponent(q)}`);
  };
  return (
    <div className="rounded-md border border-border/80 bg-background/65 px-4 py-3 text-sm text-foreground" data-testid="phase-strip">
      <h3 className="text-xs font-bold uppercase text-muted-foreground" data-testid="phase-heading">Your training phase</h3>
      <p className="mt-2 text-base font-semibold leading-snug" data-testid="phase-name">{displayLine}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{meaning}</p>
      {ramping && <div className="mt-3"><h4 className="text-xs font-bold text-muted-foreground">Your return to full training</h4>
        <p className="text-xs text-foreground" data-testid="ramp-line">Build up gradually over the coming days, with high-intent work later.</p></div>}
      {(plan.rampWarnings ?? []).length > 0 && <div className="mt-2"><h4 className="text-xs font-bold text-muted-foreground">What to watch today</h4>
        <p className="text-xs text-foreground" data-testid="ramp-warning">Keep today's work easy and controlled. Ask Hammer for the details.</p></div>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <Button type="button" size="sm" variant="secondary" onClick={askHammer} className="min-h-11 gap-1.5" data-testid="phase-ask-hammer">
          <MessageCircle className="h-4 w-4" /> Ask Hammer about your phase
        </Button>
        <Button type="button" variant="link" aria-expanded={open} onClick={onToggle} className="min-h-11 h-auto px-0 text-xs text-muted-foreground underline underline-offset-2" data-testid="phase-why-toggle">
          Why you're training this way
        </Button>
      </div>
      {open && <p className="mt-1 text-muted-foreground" data-testid="phase-why">{plan.why}</p>}
    </div>
  );
}
