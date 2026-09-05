/**
 * Athlete-authored plan adjustments — swaps, "I don't have this", and the
 * position actually worked today. Rows scoped 'always' apply to every future
 * day so the athlete never has to repeat themselves.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import type { PlanAdjustment } from "@/lib/hammer/prescription/drillSwap";

type Row = PlanAdjustment & { id: string; plan_date: string };

export function usePlanAdjustments(planDate: string) {
  const { user } = useOptionalAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("athlete_plan_adjustments")
      .select("*")
      .eq("user_id", user.id)
      .or(`plan_date.eq.${planDate},scope.eq.always`)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as unknown as Row[]);
    }
    setLoading(false);
  }, [user, planDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (adj: PlanAdjustment) => {
      if (!user) throw new Error("You need to be signed in to change your plan.");
      const { error: err } = await supabase.from("athlete_plan_adjustments").insert({
        user_id: user.id,
        plan_date: planDate,
        modality: adj.modality,
        action: adj.action,
        scope: adj.scope,
        original_key: adj.original_key,
        original_name: adj.original_name,
        replacement_name: adj.replacement_name,
        replacement_dosage: adj.replacement_dosage,
        reason: adj.reason,
        position_code: adj.position_code ?? null,
      });
      if (err) throw new Error(err.message);
      await load();
    },
    [user, planDate, load],
  );

  const undo = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from("athlete_plan_adjustments").delete().eq("id", id);
      if (err) throw new Error(err.message);
      await load();
    },
    [load],
  );

  const positionWorked =
    rows.find((r) => r.action === "position_worked" && r.plan_date === planDate)?.position_code ?? null;

  return { adjustments: rows, loading, error, save, undo, reload: load, positionWorked };
}
