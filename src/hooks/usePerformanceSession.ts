import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface DrillBlock {
  id: string;
  drill_type: string;
  intent: string;
  volume: number;
  execution_grade: number;
  outcome_tags: string[];
  notes?: string;
  batter_side?: string;
  pitcher_hand?: string;
  bp_distance_ft?: number;
  machine_velocity_band?: string;
  batted_ball_type?: 'ground' | 'line' | 'fly' | 'barrel' | 'slow_roller' | 'one_hopper' | 'chopper';
  spin_direction?: 'topspin' | 'backspin' | 'sidespin';
  swing_intent?: 'mechanical' | 'game_intent' | 'situational' | 'hr_derby';
  goal_of_rep?: string;
  actual_outcome?: string;
  execution_score?: number;
  hard_contact_pct?: number;
  whiff_pct?: number;
  chase_pct?: number;
  in_zone_contact_pct?: number;
  throw_included?: boolean;
  footwork_grade?: number;
  exchange_time_band?: 'fast' | 'average' | 'slow';
  throw_accuracy?: number;
  throw_spin_quality?: 'carry' | 'tail' | 'cut' | 'neutral';
  clean_field_pct?: number;
  velocity_band?: string;
  spin_rate_band?: string;
  spin_efficiency_pct?: number;
  pitch_command_grade?: number;
  zone_pct?: number;
  pitch_whiff_pct?: number;
  pitch_chase_pct?: number;
}

const SESSION_KEYS = [
  ['recent-sessions'], ['day-sessions'], ['calendar'],
  ['fatigue-state'], ['latest-session-ts'],
];

const ANALYTICS_KEYS = [
  ['hie-snapshot'], ['progressive-gate'], ['delta-analytics'],
  ['split-analytics-composites'],
];

export function usePerformanceSession() {
  const { user, session: authSession } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const pendingCalcRef = useRef<string | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateKeys = (keys: string[][]) => {
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  };

  const createSession = async (data: {
    sport: string;
    session_type: string;
    session_date: string;
    season_context?: string;
    season_context_overridden?: boolean;
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
    link_code?: string;
  }) => {
    setSaving(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const daysDiff = Math.floor((Date.now() - new Date(data.session_date).getTime()) / 86400000);
      if (daysDiff > 7) {
        toast({ title: 'Too far back', description: 'Sessions can only be logged up to 7 days in the past.', variant: 'destructive' });
        throw new Error('Retroactive limit exceeded');
      }

      const idempotencyKey = crypto.randomUUID();
      const { data: session, error } = await supabase
        .from('performance_sessions')
        .insert({
          user_id: user.id,
          idempotency_key: idempotencyKey,
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
          link_code: data.link_code,
        })
        .select()
        .single();

      if (error) throw error;

      // Smart daily log write
      const isGame = ['game', 'live_scrimmage'].includes(data.session_type);
      const cnsLoad = data.drill_blocks.reduce((sum: number, db: DrillBlock) => {
        return sum + db.volume * (db.execution_grade / 80) * 2;
      }, 0);

      const { data: existingLog } = await supabase
        .from('athlete_daily_log')
        .select('id, game_logged')
        .eq('user_id', user.id)
        .eq('entry_date', data.session_date)
        .maybeSingle();

      if (existingLog) {
        await supabase.from('athlete_daily_log').update({
          cns_load_actual: Math.round(cnsLoad),
          game_logged: isGame || existingLog.game_logged,
        }).eq('id', existingLog.id);
      } else {
        await supabase.from('athlete_daily_log').insert({
          user_id: user.id,
          entry_date: data.session_date,
          day_status: isGame ? 'game_only' : 'full_training',
          game_logged: isGame,
          cns_load_actual: Math.round(cnsLoad),
        });
      }

      // Overload detection
      const { data: todaySessions } = await supabase
        .from('performance_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_date', data.session_date)
        .is('deleted_at', null);
      if (todaySessions && todaySessions.length >= 5) {
        toast({ title: '⚠️ Volume Spike', description: '5+ sessions today. Consider recovery.', variant: 'destructive' });
        await supabase.from('governance_flags').insert({
          user_id: user.id,
          flag_type: 'volume_spike',
          severity: 'warning',
          status: 'pending',
          source_session_id: session.id,
          details: { sessions_today: todaySessions.length, date: data.session_date },
        });
      }

      // 14-day overload check
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
          await supabase.from('governance_flags').insert({
            user_id: user.id,
            flag_type: 'overload_risk',
            severity: 'warning',
            status: 'pending',
            source_session_id: session.id,
            details: { consecutive_heavy_days: 14, date: data.session_date },
          });
        }
      }

      // Latest-wins: tag this calculation
      const calcId = crypto.randomUUID();
      pendingCalcRef.current = calcId;

      // Clear any pending recovery timer from a previous call
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }

      // Invoke calculate-session (server owns HIE execution)
      const today = new Date().toISOString().split('T')[0];
      let calcResult: any = null;

      if (data.session_date < today) {
        const { data: r } = await supabase.functions.invoke('calculate-session', {
          headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {},
          body: { retroactive: true, date: data.session_date },
        });
        calcResult = r;
      } else if (authSession?.access_token) {
        const { data: r } = await supabase.functions.invoke('calculate-session', {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
          body: { session_id: session.id },
        });
        calcResult = r;
      }

      // Latest-wins check: if another session superseded this one, skip invalidation
      if (pendingCalcRef.current !== calcId) return session;

      // Always invalidate session-related keys
      invalidateKeys(SESSION_KEYS);

      // Conditional analytics invalidation based on server response
      const hieCompleted = calcResult?.hie_completed === true;

      if (hieCompleted) {
        if (recoveryTimerRef.current) {
          clearTimeout(recoveryTimerRef.current);
          recoveryTimerRef.current = null;
        }
        invalidateKeys(ANALYTICS_KEYS);
      } else {
        // Schedule a single delayed recovery invalidation (15s)
        recoveryTimerRef.current = setTimeout(() => {
          if (pendingCalcRef.current === calcId) {
            invalidateKeys(ANALYTICS_KEYS);
          }
          recoveryTimerRef.current = null;
        }, 15_000);
      }

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
