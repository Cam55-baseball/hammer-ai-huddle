import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
}

export function usePerformanceSession() {
  const { user, session: authSession } = useAuth();
  const { toast } = useToast();
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
