import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { computePitchingBests, type PitchLogRow } from "@/lib/pitching/pitchingBests";

const SLUGS = ["start_pitch", "bullpen_pen", "long_toss"];

export function PitchingBests({ today }: { today: string }) {
  const { user } = useOptionalAuth();
  const q = useQuery({
    queryKey: ["pitching-bests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wk_session_logs" as any)
        .select("plan_date, movement_slug, metrics")
        .eq("user_id", user!.id).in("movement_slug", SLUGS)
        .order("plan_date", { ascending: false }).limit(300);
      return (data ?? []) as unknown as PitchLogRow[];
    },
  });
  if (!user || !q.data || q.data.length === 0) return null;
  const b = computePitchingBests(q.data, today);
  return (
    <div data-pitching-bests className="rounded-md border border-border p-2 text-xs space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Your pitching bests</div>
      <div>Top speed: <span className="font-medium">{b.topVelo ? `${b.topVelo.mph} mph (${b.topVelo.date})` : "log a speed to see it"}</span></div>
      {b.latestVelo && <div>Latest speed: <span className="font-medium">{b.latestVelo.mph} mph ({b.latestVelo.date})</span></div>}
      <div>Best strike rate (15+ pitches): <span className="font-medium">{b.bestStrikePct ? `${b.bestStrikePct.pct}% of ${b.bestStrikePct.pitches} pitches` : "log strikes to see it"}</span></div>
      <div>Pitches logged, last 28 days: <span className="font-medium">{b.pitches28}</span></div>
    </div>
  );
}
