import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ScheduledPracticeSession {
  id: string;
  user_id: string;
  created_by: string;
  session_module: string;
  session_type: string;
  title: string;
  description?: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  recurring_active: boolean;
  recurring_days: number[];
  sport: string;
  organization_id?: string;
  team_id?: string;
  assignment_scope: string;
  coach_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledSession {
  session_module: string;
  session_type: string;
  title: string;
  description?: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  recurring_active?: boolean;
  recurring_days?: number[];
  sport: string;
  // Coach fields
  user_id?: string; // target player (defaults to self)
  organization_id?: string;
  team_id?: string;
  assignment_scope?: string;
  coach_id?: string;
  // Contextual fields
  opponent_name?: string;
  opponent_level?: string;
  team_name?: string;
}

export function useScheduledPracticeSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const fetchForDateRange = useCallback(async (startDate: string, endDate: string): Promise<ScheduledPracticeSession[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .select('*')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching scheduled sessions:', error);
      return [];
    }
    return (data || []) as unknown as ScheduledPracticeSession[];
  }, [user]);

  const fetchForDate = useCallback(async (date: string): Promise<ScheduledPracticeSession[]> => {
    if (!user) return [];

    // Fetch exact date matches + recurring sessions
    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .select('*')
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching scheduled sessions:', error);
      return [];
    }

    const all = (data || []) as unknown as ScheduledPracticeSession[];
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();

    return all.filter(s => {
      if (s.scheduled_date === date) return true;
      if (s.recurring_active && s.recurring_days?.includes(dayOfWeek)) {
        // Only include if scheduled_date <= date (recurring started before or on this date)
        return s.scheduled_date <= date;
      }
      return false;
    });
  }, [user]);

  const createSession = useCallback(async (input: CreateScheduledSession): Promise<ScheduledPracticeSession | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('scheduled_practice_sessions' as any)
        .insert({
          user_id: input.user_id || user.id,
          created_by: user.id,
          session_module: input.session_module,
          session_type: input.session_type,
          title: input.title,
          description: input.description || null,
          scheduled_date: input.scheduled_date,
          start_time: input.start_time || null,
          end_time: input.end_time || null,
          recurring_active: input.recurring_active || false,
          recurring_days: input.recurring_days || [],
          sport: input.sport,
          organization_id: input.organization_id || null,
          team_id: input.team_id || null,
          assignment_scope: input.assignment_scope || 'individual',
          coach_id: input.coach_id || null,
          opponent_name: input.opponent_name || null,
          opponent_level: input.opponent_level || null,
          team_name: input.team_name || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Session scheduled', description: input.title });
      return data as unknown as ScheduledPracticeSession;
    } catch (error: any) {
      toast({ title: 'Error scheduling session', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const updateStatus = useCallback(async (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    if (!user) return;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .update({ status } as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating scheduled session status:', error);
    }
  }, [user]);

  const deleteSession = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting session', description: error.message, variant: 'destructive' });
    }
  }, [user, toast]);

  const createBulkSessions = useCallback(async (
    playerIds: string[],
    baseSession: Omit<CreateScheduledSession, 'user_id'>
  ): Promise<boolean> => {
    if (!user || playerIds.length === 0) return false;
    setLoading(true);

    try {
      const rows = playerIds.map(playerId => ({
        user_id: playerId,
        created_by: user.id,
        session_module: baseSession.session_module,
        session_type: baseSession.session_type,
        title: baseSession.title,
        description: baseSession.description || null,
        scheduled_date: baseSession.scheduled_date,
        start_time: baseSession.start_time || null,
        end_time: baseSession.end_time || null,
        recurring_active: baseSession.recurring_active || false,
        recurring_days: baseSession.recurring_days || [],
        sport: baseSession.sport,
        organization_id: baseSession.organization_id || null,
        team_id: baseSession.team_id || null,
        assignment_scope: baseSession.assignment_scope || 'individual',
        coach_id: baseSession.coach_id || user.id,
      }));

      const { error } = await supabase
        .from('scheduled_practice_sessions' as any)
        .insert(rows as any);

      if (error) throw error;
      toast({ title: 'Sessions scheduled', description: `${playerIds.length} player(s) assigned` });
      return true;
    } catch (error: any) {
      toast({ title: 'Error scheduling sessions', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchPlayerSessions = useCallback(async (): Promise<ScheduledPracticeSession[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching player sessions:', error);
      return [];
    }
    return (data || []) as unknown as ScheduledPracticeSession[];
  }, [user]);

  const fetchCoachSessions = useCallback(async (): Promise<ScheduledPracticeSession[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .select('*')
      .eq('created_by', user.id)
      .order('scheduled_date', { ascending: false });

    if (error) {
      console.error('Error fetching coach sessions:', error);
      return [];
    }
    return (data || []) as unknown as ScheduledPracticeSession[];
  }, [user]);

  const updateSession = useCallback(async (id: string, updates: Partial<Pick<ScheduledPracticeSession, 'scheduled_date' | 'start_time' | 'end_time' | 'description' | 'recurring_active' | 'recurring_days'>>) => {
    if (!user) return;

    const { error } = await supabase
      .from('scheduled_practice_sessions' as any)
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating session', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Session updated' });
    }
  }, [user, toast]);

  return {
    loading,
    fetchForDate,
    fetchForDateRange,
    createSession,
    createBulkSessions,
    updateStatus,
    deleteSession,
    fetchPlayerSessions,
    fetchCoachSessions,
    updateSession,
  };
}
