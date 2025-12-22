import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DrillResult {
  drillType: string;
  tier: string;
  accuracyPercent?: number;
  reactionTimeMs?: number;
  difficultyLevel?: number;
  falsePositives?: number;
  fatigueScore?: number;
  drillMetrics?: Record<string, unknown>;
}

export function useTexVisionSession(sport: string) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getOrCreateTodaySession = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check for existing session today
      const { data: existingSession } = await supabase
        .from('tex_vision_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .eq('session_date', today)
        .maybeSingle();

      if (existingSession) {
        setSessionId(existingSession.id);
        return existingSession.id;
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from('tex_vision_sessions')
        .insert({
          user_id: user.id,
          sport,
          session_date: today,
          duration_minutes: 0,
          drills_completed: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      setSessionId(newSession.id);
      return newSession.id;
    } finally {
      setLoading(false);
    }
  }, [user, sport]);

  const saveDrillResult = useCallback(async (
    currentSessionId: string,
    result: DrillResult
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tex_vision_drill_results')
        .insert([{
          user_id: user.id,
          session_id: currentSessionId,
          drill_type: result.drillType,
          tier: result.tier,
          accuracy_percent: result.accuracyPercent,
          reaction_time_ms: result.reactionTimeMs,
          difficulty_level: result.difficultyLevel,
          false_positives: result.falsePositives,
          fatigue_score: result.fatigueScore,
          drill_metrics: result.drillMetrics ? JSON.parse(JSON.stringify(result.drillMetrics)) : null,
          completed_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Error saving drill result:', error);
        return false;
      }

      // Update session drill count - fetch current and increment
      const { data: sessionData } = await supabase
        .from('tex_vision_sessions')
        .select('drills_completed')
        .eq('id', currentSessionId)
        .single();

      if (sessionData) {
        await supabase
          .from('tex_vision_sessions')
          .update({ drills_completed: (sessionData.drills_completed || 0) + 1 })
          .eq('id', currentSessionId);
      }

      return true;
    } catch (err) {
      console.error('Error in saveDrillResult:', err);
      return false;
    }
  }, [user]);

  const completeSession = useCallback(async (
    currentSessionId: string,
    durationMinutes: number,
    reflection?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('tex_vision_sessions')
        .update({
          duration_minutes: durationMinutes,
          reflection_text: reflection,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentSessionId);

      if (error) {
        console.error('Error completing session:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in completeSession:', err);
      return false;
    }
  }, [user]);

  return {
    sessionId,
    loading,
    getOrCreateTodaySession,
    saveDrillResult,
    completeSession,
  };
}
