/**
 * Self-graded goals — athlete-private targets per self-grade metric.
 *
 * Privacy rule (unchanged from self-grades themselves): these rows are visible
 * to the athlete only. RLS scopes every read and write to `auth.uid()`, and no
 * coach / scout / follower surface reads this hook.
 *
 * History rule: resetting a goal never overwrites. The previous row is
 * deactivated and kept, and the new row carries `reset_count + 1`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SelfGradeGoal {
  id: string;
  user_id: string;
  metric: string;
  current_self_grade: number | null;
  goal_grade: number;
  set_at: string;
  reached_at: string | null;
  reset_count: number;
  is_active: boolean;
}

/** The generated Supabase types have not caught up with this table yet. */
type LooseTable = {
  from: (table: string) => {
    select: (cols: string) => any;
    insert: (row: Record<string, unknown>) => any;
    update: (row: Record<string, unknown>) => any;
  };
};

const table = () => (supabase as unknown as LooseTable).from("self_grade_goals");

export function useSelfGradeGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SelfGradeGoal[]>([]);
  const [history, setHistory] = useState<SelfGradeGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await table()
      .select("*")
      .eq("user_id", user.id)
      .order("set_at", { ascending: false });
    const rows = ((data ?? []) as SelfGradeGoal[]).map((r) => ({
      ...r,
      goal_grade: Number(r.goal_grade),
      current_self_grade:
        r.current_self_grade == null ? null : Number(r.current_self_grade),
    }));
    setGoals(rows.filter((r) => r.is_active));
    setHistory(rows.filter((r) => !r.is_active));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Set (or reset) the goal for one metric.
   * An existing active goal is retired, not edited — `reset_count` carries over
   * incremented so the athlete keeps the full attempt history.
   */
  const setGoal = useCallback(
    async (metric: string, goalGrade: number, currentSelfGrade: number | null) => {
      if (!user) return { success: false };

      const existing = goals.find((g) => g.metric === metric);
      let resetCount = 0;

      if (existing) {
        resetCount = existing.reset_count + 1;
        const { error: deactivateError } = await table()
          .update({ is_active: false })
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (deactivateError) return { success: false };
      }

      const reached =
        currentSelfGrade != null && currentSelfGrade >= goalGrade
          ? new Date().toISOString()
          : null;

      const { error } = await table().insert({
        user_id: user.id,
        metric,
        goal_grade: goalGrade,
        current_self_grade: currentSelfGrade,
        reached_at: reached,
        reset_count: resetCount,
      });

      if (!error) await refresh();
      return { success: !error };
    },
    [user, goals, refresh],
  );

  const clearGoal = useCallback(
    async (metric: string) => {
      if (!user) return { success: false };
      const existing = goals.find((g) => g.metric === metric);
      if (!existing) return { success: true };
      const { error } = await table()
        .update({ is_active: false })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (!error) await refresh();
      return { success: !error };
    },
    [user, goals, refresh],
  );

  /**
   * Fold newly-saved self-grades into the active goals: keeps
   * `current_self_grade` current and stamps `reached_at` the first time the
   * athlete's own grade meets the target. Never un-reaches a reached goal.
   */
  const syncCurrentGrades = useCallback(
    async (current: Record<string, number | null>) => {
      if (!user || goals.length === 0) return;
      const now = new Date().toISOString();
      let touched = false;

      for (const goal of goals) {
        const value = current[goal.metric];
        if (value == null || value === goal.current_self_grade) continue;
        const patch: Record<string, unknown> = { current_self_grade: value };
        if (goal.reached_at == null && value >= goal.goal_grade) {
          patch.reached_at = now;
        }
        const { error } = await table()
          .update(patch)
          .eq("id", goal.id)
          .eq("user_id", user.id);
        if (!error) touched = true;
      }

      if (touched) await refresh();
    },
    [user, goals, refresh],
  );

  return { goals, history, loading, refresh, setGoal, clearGoal, syncCurrentGrades };
}
