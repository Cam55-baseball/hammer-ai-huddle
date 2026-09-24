import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { isSwitchOnFor } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";
import {
  PHASE_NAME, WHY_PHASE, GAME_READY_FLOOR, stripText, type AthletePhasePlan,
} from "../../../supabase/functions/_shared/wic/phases/adaptivePhases";

const DISC_LABEL: Record<string, string> = { lifting: "Lifting", throwing: "Throwing", speed: "Speed", bat_speed: "Bat speed" };

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
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-foreground"
    >
      <div className="font-medium">{stripText(p)}</div>
      {open && (
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p>{p.why}</p>
          {p.disciplines.map((d) => (
            <p key={d.discipline}>
              <span className="font-medium text-foreground">{DISC_LABEL[d.discipline]}:</span> {d.why}
              {d.hold && <span className="text-foreground"> On hold — {d.hold.reason}.</span>}
            </p>
          ))}
          {p.next && p.next !== p.phase && <p>Next, {PHASE_NAME[p.next]}: {WHY_PHASE[p.next]}</p>}
          {p.gameReadyFloor && <p>Every week you might play: {GAME_READY_FLOOR.join(", ").toLowerCase()}.</p>}
          {p.shortened.map((s) => (
            <p key={s.phase}>{PHASE_NAME[s.phase]} is shorter this time. {s.reason}</p>
          ))}
        </div>
      )}
    </button>
  );
}
