/** One game, one dose. Details are a floor when an entered total is smaller. */
export interface ArmGame {
  id: string; user_id: string; game_date: string; sport: string;
  pitch_count?: number | null; status: string; deleted_at?: string | null;
  ignored_for_training?: boolean | null; is_starting_pitcher?: boolean | null; pitcher_innings?: number | null;
}
export function gamePitchLoads(games: readonly ArmGame[], pitches: readonly {game_id:string}[], userId:string, sport:string) {
  const seen = new Set<string>();
  return games.flatMap(g => {
    if (seen.has(g.id) || g.user_id !== userId || g.sport !== sport || g.deleted_at || g.ignored_for_training === true || !['final','completed'].includes(g.status)) return [];
    seen.add(g.id);
    const entered = Number.isSafeInteger(g.pitch_count) && Number(g.pitch_count) >= 0 ? Number(g.pitch_count) : 0;
    const count = Math.max(entered, pitches.filter(p => p.game_id === g.id).length);
    const innings = Number.isFinite(Number(g.pitcher_innings)) && Number(g.pitcher_innings) > 0 ? Number(g.pitcher_innings) : 0;
    return count > 0 || innings > 0 ? [{game_id:g.id,date:g.game_date,count,innings,isStart:g.is_starting_pitcher === true}] : [];
  });
}