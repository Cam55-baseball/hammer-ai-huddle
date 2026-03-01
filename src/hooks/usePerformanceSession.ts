import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface DrillBlock {
  id: string;
  drill_type: string;
  intent: string;
  volume: number;
  execution_grade: number; // 20-80 scale
  outcome_tags: string[];
  notes?: string;
  batter_side?: string;
  pitcher_hand?: string;
  // Hitting micro fields
  bp_distance_ft?: number;
  machine_velocity_band?: string; // '40-50' | '50-60' | '60-70' | '70-80' | '80+'
  batted_ball_type?: 'ground' | 'line' | 'fly' | 'barrel';
  spin_direction?: 'topspin' | 'backspin' | 'sidespin';
  swing_intent?: 'mechanical' | 'game_intent' | 'situational' | 'hr_derby';
  goal_of_rep?: string;
  actual_outcome?: string;
  execution_score?: number; // 1-10 per rep
  hard_contact_pct?: number;
  whiff_pct?: number;
  chase_pct?: number;
  in_zone_contact_pct?: number;
  // Fielding micro fields
  throw_included?: boolean;
  footwork_grade?: number; // 20-80
  exchange_time_band?: 'fast' | 'average' | 'slow';
  throw_accuracy?: number; // 20-80
  throw_spin_quality?: 'carry' | 'tail' | 'cut' | 'neutral';
  clean_field_pct?: number;
  // Pitching micro fields
  velocity_band?: string;
  spin_rate_band?: string;
  spin_efficiency_pct?: number;
  pitch_command_grade?: number; // 20-80
  zone_pct?: number;
  pitch_whiff_pct?: number;
  pitch_chase_pct?: number;
}

export function usePerformanceSession() {
  const { user, session: authSession } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const createSession = async (data: {
    sport: string;
    session_type: string;
    session_date: string;
    season_context?: string;
    drill_blocks: DrillBlock[];
    player_grade?: number;
    notes?: string;
    opponent_name?: string;
    opponent_level?: string;
    batting_side_used?: string;
    throwing_hand_used?: string;
    module?: string;
    coach_id?: string;
    fatigue_state?: any;
    micro_layer_data?: any;
  }) => {
    if (!user) throw new Error('Not authenticated');
    setSaving(true);
    try {
      const { data: session, error } = await supabase
        .from('performance_sessions')
        .insert({
          user_id: user.id,
          sport: data.sport,
          session_type: data.session_type,
          session_date: data.session_date,
          season_context: data.season_context || 'in_season',
          drill_blocks: data.drill_blocks as any,
          player_grade: data.player_grade,
          notes: data.notes,
          opponent_name: data.opponent_name,
          opponent_level: data.opponent_level,
          batting_side_used: data.batting_side_used,
          throwing_hand_used: data.throwing_hand_used,
          module: data.module,
          coach_id: data.coach_id,
          fatigue_state_at_session: data.fatigue_state as any,
          micro_layer_data: data.micro_layer_data as any,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-write daily log entry with CNS load
      const cnsLoad = data.drill_blocks.reduce((sum: number, db: DrillBlock) => {
        const baseLoad = db.volume * (db.execution_grade / 80) * 2;
        return sum + baseLoad;
      }, 0);
      await supabase.from('athlete_daily_log').upsert({
        user_id: user.id,
        entry_date: data.session_date,
        day_status: ['game', 'live_scrimmage'].includes(data.session_type) ? 'game_only' : 'full_training',
        game_logged: ['game', 'live_scrimmage'].includes(data.session_type),
        cns_load_actual: Math.round(cnsLoad),
      }, { onConflict: 'user_id,entry_date' } as any);

      // Overload detection
      const { data: todaySessions } = await supabase
        .from('performance_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', data.session_date)
        .is('deleted_at', null);
      if (todaySessions && todaySessions.length >= 5) {
        toast({ title: '⚠️ Volume Spike', description: '5+ sessions today. Consider recovery.', variant: 'destructive' });
      }

      // Check 14-day overload
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
      const { data: recentLogs } = await supabase
        .from('athlete_daily_log')
        .select('day_status')
        .eq('user_id', user.id)
        .gte('entry_date', fourteenDaysAgo);
      if (recentLogs && recentLogs.length >= 14) {
        const allHeavy = recentLogs.every(l => ['full_training', 'game_only'].includes(l.day_status));
        if (allHeavy) {
          toast({ title: '⚠️ Overload Risk', description: '14 consecutive heavy days. Schedule recovery.', variant: 'destructive' });
        }
      }

      // Retroactive recalculation
      const today = new Date().toISOString().split('T')[0];
      if (data.session_date < today) {
        await supabase.functions.invoke('calculate-session', {
          headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {},
          body: { retroactive: true, date: data.session_date },
        });
      }

      // Trigger calculate-session edge function
      if (authSession?.access_token) {
        await supabase.functions.invoke('calculate-session', {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
          body: { session_id: session.id },
        });
      }

      // Invalidate recent sessions
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });

      toast({ title: 'Session saved', description: 'Your practice session has been recorded.' });
      return session;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('performance_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user?.id);
    if (error) throw error;
  };

  return { createSession, deleteSession, saving };
}
