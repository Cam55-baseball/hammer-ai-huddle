/**
 * Owner Nov 2 #10: the coach's one place for periodization tuning — inside
 * "Hammers' plan for this player" → Advanced. Phase blocks are shared by every
 * player, so coaches read them here; only the owner changes them (Coaching Console).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = { phase: string; display_name?: string | null; compound_min_sets?: number | null; compound_max_sets?: number | null; compound_min_reps?: number | null; compound_max_reps?: number | null; speed_cadence_hours?: number | null };

export function CoachPeriodizationAdvanced() {
  const q = useQuery({ queryKey: ["coach-periodization-blocks"], queryFn: async () => {
    const { data, error } = await supabase.from("wk_periodization_blocks" as never).select("phase,display_name,compound_min_sets,compound_max_sets,compound_min_reps,compound_max_reps,speed_cadence_hours");
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  } });
  const range = (a?: number | null, b?: number | null) => a == null && b == null ? "not set" : a === b || b == null ? `${a}` : `${a ?? "?"}–${b}`;
  return <details className="border-t border-border pt-3">
    <summary className="cursor-pointer text-sm font-medium">Advanced · Periodization tuning</summary>
    <p className="mt-2 text-xs text-muted-foreground">How Hammers doses each season phase for every player. Only the owner changes these; safety limits always win.</p>
    {q.isLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
      : q.error ? <p role="alert" className="text-xs text-destructive">Couldn't load the phase settings.</p>
      : !q.data?.length ? <p className="text-xs text-muted-foreground">Using Hammers' standard phase settings.</p>
      : <ul className="mt-2 space-y-1">{q.data.map(r => <li key={r.phase} className="text-xs"><span className="font-medium">{r.display_name || r.phase}</span>: main lift sets {range(r.compound_min_sets, r.compound_max_sets)}, reps {range(r.compound_min_reps, r.compound_max_reps)}{r.speed_cadence_hours != null ? `, top-speed work every ${r.speed_cadence_hours} h` : ""}</li>)}</ul>}
  </details>;
}
