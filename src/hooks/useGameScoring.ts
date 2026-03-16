import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GameSetup {
  sport: 'baseball' | 'softball';
  team_name: string;
  opponent_name: string;
  game_type: 'regular_season' | 'intrasquad' | 'scrimmage' | 'showcase_tournament';
  league_level: string;
  base_distance_ft: number;
  mound_distance_ft: number;
  game_date: string;
  venue: string;
  total_innings: number;
  lineup: LineupPlayer[];
  starting_pitcher_id: string;
  game_mode?: 'team' | 'single_player';
  is_practice_game?: boolean;
  home_or_away?: 'home' | 'away';
  batter_hand?: 'right' | 'left' | 'switch';
  video_mode?: boolean;
}

export interface LineupPlayer {
  id: string;
  name: string;
  position: string;
  batting_order: number;
  player_user_id?: string;
  substituted_at_inning?: number;
  replaced_by?: string;
}

export interface Substitution {
  slot: number;
  outPlayer: LineupPlayer;
  inPlayer: LineupPlayer;
  inning: number;
  half: string;
}

export interface GamePlay {
  id?: string;
  game_id: string;
  inning: number;
  half: 'top' | 'bottom';
  batter_order?: number;
  batter_name?: string;
  pitcher_name?: string;
  pitch_number?: number;
  pitch_type?: string;
  pitch_velocity_mph?: number;
  velocity_band?: string;
  pitch_location?: { row: number; col: number };
  pitch_result: string;
  exit_velocity_mph?: number;
  launch_angle?: number;
  spray_direction?: string;
  contact_quality?: string;
  batted_ball_type?: string;
  at_bat_outcome?: string;
  rbi?: number;
  situational_data?: Record<string, any>;
  defensive_data?: Record<string, any>;
  catcher_data?: Record<string, any>;
  baserunning_data?: Record<string, any>;
  video_id?: string;
  video_start_sec?: number;
  video_end_sec?: number;
}

export function useGameScoring() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const createGame = useCallback(async (setup: GameSetup) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('games')
        .insert({
          user_id: user.id,
          sport: setup.sport,
          team_name: setup.team_name,
          opponent_name: setup.opponent_name,
          game_type: setup.game_type,
          league_level: setup.league_level,
          base_distance_ft: setup.base_distance_ft,
          mound_distance_ft: setup.mound_distance_ft,
          game_date: setup.game_date,
          venue: setup.venue || null,
          total_innings: setup.total_innings,
          lineup: setup.lineup as any,
          starting_pitcher_id: setup.starting_pitcher_id || null,
          game_mode: setup.game_mode || 'team',
          is_practice_game: setup.is_practice_game || false,
        })
        .select('id')
        .single();

      if (error) throw error;
      setGameId(data.id);
      return data.id;
    } catch (err: any) {
      toast({ title: 'Error creating game', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const addPlay = useCallback(async (play: GamePlay) => {
    try {
      const { error } = await supabase
        .from('game_plays')
        .insert({
          game_id: play.game_id,
          inning: play.inning,
          half: play.half,
          batter_order: play.batter_order ?? null,
          batter_name: play.batter_name ?? null,
          pitcher_name: play.pitcher_name ?? null,
          pitch_number: play.pitch_number ?? null,
          pitch_type: play.pitch_type ?? null,
          pitch_velocity_mph: play.pitch_velocity_mph ?? null,
          velocity_band: play.velocity_band ?? null,
          pitch_location: play.pitch_location as any ?? null,
          pitch_result: play.pitch_result,
          exit_velocity_mph: play.exit_velocity_mph ?? null,
          launch_angle: play.launch_angle ?? null,
          spray_direction: play.spray_direction ?? null,
          contact_quality: play.contact_quality ?? null,
          batted_ball_type: play.batted_ball_type ?? null,
          at_bat_outcome: play.at_bat_outcome ?? null,
          rbi: play.rbi ?? 0,
          situational_data: play.situational_data as any ?? {},
          defensive_data: play.defensive_data as any ?? {},
          catcher_data: play.catcher_data as any ?? {},
          baserunning_data: play.baserunning_data as any ?? {},
          video_id: play.video_id ?? null,
          video_start_sec: play.video_start_sec ?? null,
          video_end_sec: play.video_end_sec ?? null,
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      toast({ title: 'Error saving play', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const getPlays = useCallback(async (gId: string) => {
    const { data, error } = await supabase
      .from('game_plays')
      .select('*')
      .eq('game_id', gId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data as any[];
  }, []);

  const completeGame = useCallback(async (gId: string, summary: Record<string, any>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'completed', game_summary: summary as any, updated_at: new Date().toISOString() })
        .eq('id', gId);
      if (error) throw error;
      toast({ title: 'Game completed', description: 'Game has been finalized.' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const loadGame = useCallback(async (gId: string) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gId)
      .single();
    if (error) return null;
    return data as any;
  }, []);
  const listGames = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('game_date', { ascending: false });
    if (error) return [];
    return data as any[];
  }, []);

  /** Sync game stats into performance_sessions for each player */
  const syncGameToPlayerStats = useCallback(async (gId: string, setup: GameSetup) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const plays = await getPlays(gId);
      if (!plays || plays.length === 0) return;

      // Group hitting stats by batter
      const batterStats: Record<string, { abs: number; hits: number; rbi: number; strikeouts: number; walks: number; }> = {};
      // Group pitching stats by pitcher
      const pitcherStats: Record<string, { pitches: number; strikeouts: number; walks: number; hits_allowed: number; }> = {};

      for (const play of plays) {
        // Batting stats
        if (play.batter_name) {
          if (!batterStats[play.batter_name]) {
            batterStats[play.batter_name] = { abs: 0, hits: 0, rbi: 0, strikeouts: 0, walks: 0 };
          }
          const bs = batterStats[play.batter_name];
          if (play.at_bat_outcome) {
            bs.abs++;
            if (['single', 'double', 'triple', 'home_run'].includes(play.at_bat_outcome)) bs.hits++;
            if (play.at_bat_outcome === 'strikeout') bs.strikeouts++;
            if (play.at_bat_outcome === 'walk' || play.at_bat_outcome === 'hbp') { bs.walks++; bs.abs--; }
          }
          bs.rbi += play.rbi || 0;
        }

        // Pitching stats
        if (play.pitcher_name) {
          if (!pitcherStats[play.pitcher_name]) {
            pitcherStats[play.pitcher_name] = { pitches: 0, strikeouts: 0, walks: 0, hits_allowed: 0 };
          }
          const ps = pitcherStats[play.pitcher_name];
          ps.pitches++;
          if (play.at_bat_outcome === 'strikeout') ps.strikeouts++;
          if (play.at_bat_outcome === 'walk' || play.at_bat_outcome === 'hbp') ps.walks++;
          if (['single', 'double', 'triple', 'home_run'].includes(play.at_bat_outcome || '')) ps.hits_allowed++;
        }
      }

      // Create performance_sessions for the logged-in user's batting stats
      for (const [batterName, stats] of Object.entries(batterStats)) {
        const matchingPlayer = setup.lineup.find(p => p.name === batterName);
        if (!matchingPlayer?.player_user_id && matchingPlayer?.name !== setup.lineup[0]?.name) continue;

        await supabase.from('performance_sessions').insert({
          user_id: matchingPlayer?.player_user_id || user.id,
          sport: setup.sport,
          module: 'hitting',
          session_type: 'game',
          session_date: setup.game_date,
          opponent_name: setup.opponent_name,
          opponent_level: setup.league_level,
          total_reps: stats.abs,
          composite_indexes: {
            game_id: gId,
            hits: stats.hits,
            rbi: stats.rbi,
            strikeouts: stats.strikeouts,
            walks: stats.walks,
            batting_avg: stats.abs > 0 ? (stats.hits / stats.abs).toFixed(3) : '0.000',
          } as any,
        } as any);
      }

      // Create performance_sessions for pitching
      for (const [pitcherName, stats] of Object.entries(pitcherStats)) {
        const matchingPlayer = setup.lineup.find(p => p.name === pitcherName);
        if (!matchingPlayer?.player_user_id && matchingPlayer?.name !== setup.lineup[0]?.name) continue;

        await supabase.from('performance_sessions').insert({
          user_id: matchingPlayer?.player_user_id || user.id,
          sport: setup.sport,
          module: 'pitching',
          session_type: 'game',
          session_date: setup.game_date,
          opponent_name: setup.opponent_name,
          opponent_level: setup.league_level,
          total_reps: stats.pitches,
          composite_indexes: {
            game_id: gId,
            strikeouts: stats.strikeouts,
            walks: stats.walks,
            hits_allowed: stats.hits_allowed,
          } as any,
        } as any);
      }
    } catch (err: any) {
      console.error('[syncGameToPlayerStats] Error:', err.message);
    }
  }, [getPlays]);

  return { gameId, saving, createGame, addPlay, getPlays, completeGame, loadGame, listGames, syncGameToPlayerStats };
}
