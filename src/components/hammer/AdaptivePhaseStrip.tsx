import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";
import {
  stripText, type AthletePhasePlan,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";


/** §6 + v1.1 — one plain-words strip. Renders nothing unless adaptive_phases is on for this athlete. */
export function AdaptivePhaseStrip() {
  const { user } = useOptionalAuth();
  const [open, setOpen] = useState(false);
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
  if (!on || !p || !p.disciplines || !p.phase) return null;
  return <PhaseStripView plan={p} open={open} onToggle={() => setOpen((o) => !o)} />;
}

/** Pure view (tested): the top line, then ONE collapsed "Why this phase matters" line. Nothing else. */
export function PhaseStripView({ plan, open, onToggle }: { plan: AthletePhasePlan; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" data-testid="phase-strip">
      <div className="font-medium">{stripText(plan)}</div>
      <button type="button" aria-expanded={open} onClick={onToggle} className="mt-1 text-xs text-muted-foreground underline underline-offset-2" data-testid="phase-why-toggle">
        Why this phase matters
      </button>
      {open && <p className="mt-1 text-muted-foreground" data-testid="phase-why">{plan.why}</p>}
    </div>
  );
}
