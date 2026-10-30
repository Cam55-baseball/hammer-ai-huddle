/**
 * Game pitch load — pitches the athlete threw in logged games (gp_pitches
 * with perspective "pitcher" in their own gp_games), grouped by game date.
 *
 * These feed the arm ledger ADDITIVELY alongside bullpen/outing logs
 * (useRecentPitchingLoad): game pitches are real throws and must count
 * toward the arm total. Nothing here invents a dose — it only counts.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { gamePitchLoads } from '../../supabase/functions/_shared/wic/pitching/gamePitchLoad';

export interface GamePitchLoad {
  /** game_date -> pitches thrown that day */
  byDate: Record<string, number>;
  total: number;
}

export function useGamePitchLoad(days = 7, planDate?:string): { data: GamePitchLoad | null; loading: boolean; isError: boolean } {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["game-pitch-load", user?.id, days, planDate],
    queryFn: async (): Promise<GamePitchLoad> => {
      if (!user) return { byDate: {}, total: 0 };
      const until=planDate??new Date().toISOString().slice(0,10);
      const from = new Date(`${until}T12:00:00Z`);
      from.setDate(from.getDate() - days + 1);
      const fromIso = from.toISOString().slice(0, 10);
      const context=await supabase.from('athlete_context').select('sport_primary').eq('user_id',user.id).single();
      if(context.error)throw context.error;
      const sport=context.data.sport_primary;
      const { data: games, error: gErr } = await (supabase as any)
        .from("gp_games")
        .select("id,user_id,game_date,sport,pitch_count,status,deleted_at,ignored_for_training,is_starting_pitcher")
        .eq("user_id", user.id)
        .eq('sport',sport).in('status',['final','completed']).or('ignored_for_training.is.null,ignored_for_training.eq.false')
        .is("deleted_at", null)
        .gte("game_date", fromIso).lte('game_date',until).limit(1000);
      if (gErr) throw gErr;
      if((games??[]).length>=1000)throw new Error('Complete game history unavailable');
      const ids = (games ?? []).map((g: any) => g.id);
      if (ids.length === 0) return { byDate: {}, total: 0 };
      const { data: pitches, error: pErr } = await (supabase as any)
        .from("gp_pitches")
        .select("game_id")
        .in("game_id", ids)
        .eq('user_id',user.id).eq("perspective", "pitcher").limit(5000);
      if (pErr) throw pErr;
      if((pitches??[]).length>=5000)throw new Error('Complete game pitch history unavailable');
      const byDate: Record<string, number> = {};
      for (const g of gamePitchLoads(games??[],pitches??[],user.id,String(sport))) byDate[g.date]=(byDate[g.date]??0)+g.count;
      const total = Object.values(byDate).reduce((s, n) => s + n, 0);
      return { byDate, total };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  return { data: q.data ?? null, loading: q.isLoading, isError: q.isError };
}
