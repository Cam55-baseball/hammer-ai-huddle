import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatchPlayCheck } from "../../../supabase/functions/_shared/wic/throwing/catchPlay";

const db = supabase as any;
export const catchPlayCheckKey = (uid: string | undefined, date: string) => ["catch-play-check", uid, date];

/** Today's saved catch-play check (self-owned task record). */
export function useCatchPlayCheck(date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: catchPlayCheckKey(user?.id, date), enabled: !!user,
    queryFn: async (): Promise<CatchPlayCheck | null> => {
      const r = await db.from("hammer_daily_task_completions").select("payload").eq("user_id", user!.id).eq("source", "catch_play_check").eq("plan_date", date).maybeSingle();
      if (r.error) throw r.error;
      return (r.data?.payload as CatchPlayCheck) ?? null;
    },
  });
}

const OPTIONS: { outcome: CatchPlayCheck["outcome"]; label: string }[] = [
  { outcome: "full", label: "Full catch play, no pain" },
  { outcome: "short_distance", label: "Didn't reach my distance" },
  { outcome: "cut_short", label: "Cut it short" },
  { outcome: "painful", label: "My arm hurt" },
];

export function CatchPlayCheckPanel({ planDate, positionDistanceFt }: { planDate: string; positionDistanceFt: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const saved = useCatchPlayCheck(planDate);
  const [ft, setFt] = useState("");
  const [msg, setMsg] = useState("");
  async function save(outcome: CatchPlayCheck["outcome"]) {
    if (!user) return;
    const far = outcome === "full" ? positionDistanceFt : Number(ft) || 0;
    const payload: CatchPlayCheck = { outcome, maxDistanceFt: far, positionDistanceFt };
    const taskId = `catch_play_check:${planDate}`;
    const existing = await db.from("hammer_daily_task_completions").select("id").eq("user_id", user.id).eq("source", "catch_play_check").eq("plan_date", planDate).maybeSingle();
    const row = { user_id: user.id, plan_date: planDate, task_id: taskId, source: "catch_play_check", source_ref: taskId, payload, completed: true, completed_at: new Date().toISOString() };
    const r = existing.data ? await db.from("hammer_daily_task_completions").update(row).eq("id", existing.data.id) : await db.from("hammer_daily_task_completions").insert(row);
    if (r.error) { setMsg("Couldn't save. Try again."); return; }
    setMsg("Saved.");
    await qc.invalidateQueries({ queryKey: catchPlayCheckKey(user.id, planDate) });
  }
  const current = saved.data?.outcome;
  return <div className="space-y-2" data-testid="catch-play-check">
    <p className="text-xs font-semibold">How did catch play go? (your distance today: {positionDistanceFt} ft)</p>
    <div className="flex items-center gap-2">
      <label htmlFor="cp-far" className="text-[11px] text-muted-foreground">Farthest you threw (ft), if short</label>
      <Input id="cp-far" inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-9 w-20 px-2 text-sm" />
    </div>
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => <Button key={o.outcome} size="sm" variant={current === o.outcome ? "default" : "outline"} onClick={() => void save(o.outcome)}>{o.label}</Button>)}
    </div>
    {msg && <p role="status" className="text-[11px] text-muted-foreground">{msg}</p>}
  </div>;
}
