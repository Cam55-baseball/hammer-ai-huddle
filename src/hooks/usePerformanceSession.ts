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
