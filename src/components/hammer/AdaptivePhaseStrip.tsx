import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";
import {
  PHASE_EXPLAIN, PHASE_NAME, stripText, type AthletePhasePlan,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";

/** §6 — one plain-words strip. Renders nothing unless adaptive_phases is on for this athlete. */
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
  if (!on || !plan.data) return null;
  const lift = plan.data.disciplines.find((d) => d.discipline === "lifting") ?? plan.data.disciplines[0];
  if (!lift) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground"
    >
      <div className="font-medium">{stripText(lift, plan.data.hardDate)}</div>
      {open && (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>{PHASE_EXPLAIN[lift.current]}</p>
          {lift.next && <p>Next, {PHASE_NAME[lift.next]}: {PHASE_EXPLAIN[lift.next]}</p>}
          {lift.shortened.map((s) => (
            <p key={s.phase}>{PHASE_NAME[s.phase]} is shorter this time. {s.reason}</p>
          ))}
        </div>
      )}
    </button>
  );
}
