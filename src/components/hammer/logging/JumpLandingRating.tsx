import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { LandingRating } from "../../../../supabase/functions/_shared/wic/jumps/taxonomy";

const db = supabase as any;
const OPTIONS: Array<[LandingRating, string]> = [["solid", "Solid"], ["wobble", "Some wobble"], ["sloppy", "Sloppy"]];

/** Owner Nov 1 round 6: one tap after each jump set — how did your landings look? */
export function JumpLandingRating({ userId, prescriptionId, planDate, slug, sets, onlySet }: { userId?: string; prescriptionId: string; planDate: string; slug: string; sets: number; onlySet?: number | null }) {
  const qc = useQueryClient();
  const key = ["jump-landing", prescriptionId];
  const [msg, setMsg] = useState("");
  const q = useQuery({ queryKey: key, enabled: !!userId, queryFn: async () => {
    const r = await db.from("jump_landing_ratings").select("set_index, rating").eq("prescription_id", prescriptionId);
    if (r.error) throw r.error;
    return new Map<number, LandingRating>((r.data ?? []).map((x: any) => [x.set_index, x.rating]));
  } });
  async function rate(i: number, rating: LandingRating) {
    if (!userId) return;
    const r = await db.from("jump_landing_ratings").upsert({ user_id: userId, prescription_id: prescriptionId, plan_date: planDate, movement_slug: slug, set_index: i, rating, updated_at: new Date().toISOString() }, { onConflict: "prescription_id,set_index" });
    if (r.error) { setMsg("Couldn't save your landing rating. Tap it again."); return; }
    setMsg(rating === "sloppy" ? "Saved. Sloppy landings: stop this set and rest. Your jumps step back until landings are solid again." : "Saved.");
    await qc.invalidateQueries({ queryKey: key });
  }
  const rows = [...Array(Math.max(1, sets)).keys()].filter((i) => onlySet == null || i === onlySet);
  return <div className="space-y-1 rounded-md border border-border p-2" aria-label="Landing rating">
    <p className="text-xs font-medium">After each set: how did your landings look?</p>
    {rows.map((i) => { const cur = q.data?.get(i); return <div key={i} className="flex flex-wrap items-center gap-1">
      <span className="w-12 text-[11px] text-muted-foreground">Set {i + 1}</span>
      {OPTIONS.map(([k, l]) => <Button key={k} type="button" size="sm" variant={cur === k ? "default" : "outline"} aria-pressed={cur === k} aria-label={`Set ${i + 1}: ${l}`} onClick={() => void rate(i, k)}>{l}</Button>)}
    </div>; })}
    {q.isError && <p role="alert" className="text-xs text-destructive">Couldn't load your landing ratings.</p>}
    {msg && <p role="status" className="text-xs">{msg}</p>}
  </div>;
}
