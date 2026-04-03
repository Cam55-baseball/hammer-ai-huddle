import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSchedulingService } from '@/hooks/useSchedulingService';

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
  const schedulingService = useSchedulingService();
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
      const result = await schedulingService.scheduleSession(input);
      if (!result.success) throw new Error('Failed to schedule session');
      toast({ title: 'Session scheduled', description: input.title });
      return result.data as unknown as ScheduledPracticeSession;
    } catch (error: any) {
      toast({ title: 'Error scheduling session', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast, schedulingService]);

  const updateStatus = useCallback(async (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    if (!user) return;
    await schedulingService.updateSessionStatus(id, status);
  }, [user, schedulingService]);

  const deleteSession = useCallback(async (id: string) => {
    if (!user) return;
    const success = await schedulingService.deleteSession(id);
    if (!success) {
      toast({ title: 'Error deleting session', variant: 'destructive' });
    }
  }, [user, toast, schedulingService]);

  const createBulkSessions = useCallback(async (
    playerIds: string[],
    baseSession: Omit<CreateScheduledSession, 'user_id'>
  ): Promise<boolean> => {
    if (!user || playerIds.length === 0) return false;
    setLoading(true);

    try {
      const success = await schedulingService.scheduleBulkSessions(playerIds, baseSession, 'coach');
      if (!success) throw new Error('Failed to schedule bulk sessions');
      toast({ title: 'Sessions scheduled', description: `${playerIds.length} player(s) assigned` });
      return true;
    } catch (error: any) {
      toast({ title: 'Error scheduling sessions', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, schedulingService]);

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
