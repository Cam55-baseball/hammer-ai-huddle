import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { timingStudy, type TimingStudyRole } from "@/lib/hammer/timingStudy";
import { useQuery } from "@tanstack/react-query";
import { useOptionalAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
export function TimingStudyMoments({ sport, position, flags = [], goals = [], roles }: { sport: "baseball" | "softball"; position: string | null; flags?: string[]; goals?: string[]; roles: TimingStudyRole[] }) {
  const navigate = useNavigate();
  const { user } = useOptionalAuth();
  const steals = useQuery({ queryKey: ["timing-study-steals", user?.id, sport], enabled: !!user, staleTime: 60000, queryFn: async () => {
    if (!user) return false;
    const { data: games, error: gameError } = await gp("gp_games").select("id").eq("user_id", user.id).eq("sport", sport).eq("status", "completed").is("deleted_at", null).gte("game_date", new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10));
    if (gameError) throw gameError;
    if (!games?.length) return false;
    const { data, error } = await gp("gp_baserun_events").select("id").eq("user_id", user.id).in("game_id", games.map((game: { id: string }) => game.id)).eq("event_type", "steal").eq("success", false).limit(1);
    if (error) throw error;
    return !!data?.length;
  }});
  const applicable = [...new Set<TimingStudyRole>([...(position === "P" || /pitch/i.test(position ?? "") ? ["pitcher" as const] : position ? ["defender" as const] : []), ...roles])];
  if (!applicable.length) return null;
  return <section className="space-y-3 border-b border-border py-3" aria-label="Royal timing study">
    <h3 className="text-sm font-semibold">Royal timing study</h3>
    {applicable.map(role => {
      const study = timingStudy({ role, sport, flags, goals, caughtStealing: steals.data === true });
      return <div key={role} className="space-y-1"><p className="text-xs font-semibold capitalize">{role}</p><p className="text-xs text-muted-foreground">{study.reason}</p><ul className="list-disc space-y-1 pl-4 text-sm">{study.examples.map(example => <li key={example}>{example}</li>)}</ul></div>;
    })}
    {steals.isError && <p role="alert" className="text-xs text-destructive">Couldn't check your recent games. These are position examples, not game findings.</p>}
    <Button size="sm" variant="outline" onClick={() => navigate("/royal-timing")}>Open Royal timing</Button>
  </section>;
}