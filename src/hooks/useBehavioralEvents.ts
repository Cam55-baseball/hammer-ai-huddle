import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type BehavioralEventType =
  | 'nn_miss'
  | 'consistency_drop'
  | 'identity_tier_change'
  | 'consistency_recover';

export interface BehavioralEvent {
  id: string;
  user_id: string;
  event_type: BehavioralEventType;
  event_date: string;
  template_id: string | null;
  magnitude: number | null;
  metadata: Record<string, any>;
  created_at: string;
  acknowledged_at: string | null;
}

const PRIORITY: Record<BehavioralEventType, number> = {
  nn_miss: 4,
  consistency_drop: 3,
  identity_tier_change: 2,
  consistency_recover: 1,
};

export function useBehavioralEvents() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['behavioral-events', user?.id],
    queryFn: async (): Promise<BehavioralEvent[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('behavioral_events')
        .select('*')
        .eq('user_id', user.id)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.warn('[useBehavioralEvents] fetch failed', error);
        return [];
      }
      return (data ?? []) as BehavioralEvent[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`behavioral-events-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'behavioral_events', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['behavioral-events', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const events = query.data ?? [];
  // Highest-priority, then most recent
  const active = [...events].sort((a, b) => {
    const p = (PRIORITY[b.event_type] ?? 0) - (PRIORITY[a.event_type] ?? 0);
    if (p !== 0) return p;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0] ?? null;

  const acknowledge = async (eventId: string) => {
    await (supabase as any)
      .from('behavioral_events')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', eventId);
    qc.invalidateQueries({ queryKey: ['behavioral-events', user?.id] });
  };

  return { active, all: events, loading: query.isLoading, acknowledge };
}
