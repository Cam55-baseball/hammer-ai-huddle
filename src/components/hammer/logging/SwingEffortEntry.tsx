import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { EFFORTS, EFFORT_LABEL, type SwingEffort } from "../../../../supabase/functions/_shared/wic/hitting/returningHitter";

const db = supabase as any;

/** Owner Nov 1 round 6: swing effort on hitting logs — what the plan asked for vs what you did. */
export function SwingEffortEntry({ planDate, taskId, drillName, prescribed }: { planDate: string; taskId: string; drillName: string; prescribed: SwingEffort | null }) {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const key = ["swing-effort", user?.id, planDate, taskId];
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: key, enabled: !!user?.id, queryFn: async () => {
    const r = await db.from("hitting_swing_efforts").select("actual").eq("user_id", user!.id).eq("plan_date", planDate).eq("task_id", taskId).maybeSingle();
    if (r.error) throw r.error;
    return (r.data?.actual ?? null) as SwingEffort | null;
  } });
  async function save(actual: SwingEffort) {
    if (!user?.id) return;
    const r = await db.from("hitting_swing_efforts").upsert({ user_id: user.id, plan_date: planDate, task_id: taskId, drill_name: drillName, prescribed, actual, updated_at: new Date().toISOString() }, { onConflict: "user_id,plan_date,task_id" });
    if (r.error) { setMsg("Couldn't save your swing effort. Tap it again."); return; }
    setMsg(prescribed && EFFORTS.indexOf(actual) > EFFORTS.indexOf(prescribed) ? `Saved. That's harder than today's ${EFFORT_LABEL[prescribed].toLowerCase()} effort — try to stay at it next time.` : "Saved.");
    await qc.invalidateQueries({ queryKey: key });
  }
  return <div className="mt-2 space-y-1" aria-label="Swing effort">
    <p className="text-xs font-medium">{prescribed ? `Swing effort today: ${EFFORT_LABEL[prescribed]}. How hard did you actually swing?` : "How hard did you swing?"}</p>
    <div className="flex flex-wrap gap-1">{EFFORTS.map((e) => <Button key={e} type="button" size="sm" variant={q.data === e ? "default" : "outline"} aria-pressed={q.data === e} onClick={() => void save(e)}>{EFFORT_LABEL[e]}</Button>)}</div>
    {q.isError && <p role="alert" className="text-xs text-destructive">Couldn't load your swing effort.</p>}
    {msg && <p role="status" className="text-xs">{msg}</p>}
  </div>;
}
