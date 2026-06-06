import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emitObservability } from '@/hooks/useEmitObservability';

export interface DrillAssignment {
  id: string;
  drill_id: string;
  coach_id: string;
  player_id: string;
  assigned_at: string;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  drill_name?: string;
  drill_description?: string;
  coach_name?: string;
}

export function usePlayerAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['drill-assignments-player', user?.id],
    queryFn: async (): Promise<DrillAssignment[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('drill_assignments')
        .select('*')
        .eq('player_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch drill names
      const drillIds = [...new Set(data.map(a => a.drill_id))];
      const { data: drills } = await supabase
        .from('drills')
        .select('id, name, description')
        .in('id', drillIds);
      const drillMap = new Map((drills || []).map(d => [d.id, d]));

      // Fetch coach names
      const coachIds = [...new Set(data.map(a => a.coach_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', coachIds);
      const coachMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return data.map(a => ({
        ...a,
        drill_name: drillMap.get(a.drill_id)?.name ?? 'Unknown Drill',
        drill_description: drillMap.get(a.drill_id)?.description ?? null,
        coach_name: coachMap.get(a.coach_id) ?? 'Coach',
      }));
    },
    enabled: !!user,
  });
}

export function useCoachAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['drill-assignments-coach', user?.id],
    queryFn: async (): Promise<DrillAssignment[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('drill_assignments')
        .select('*')
        .eq('coach_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      const drillIds = [...new Set(data.map(a => a.drill_id))];
      const { data: drills } = await supabase
        .from('drills')
        .select('id, name, description')
        .in('id', drillIds);
      const drillMap = new Map((drills || []).map(d => [d.id, d]));

      const playerIds = [...new Set(data.map(a => a.player_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', playerIds);
      const playerMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return data.map(a => ({
        ...a,
        drill_name: drillMap.get(a.drill_id)?.name ?? 'Unknown Drill',
        drill_description: drillMap.get(a.drill_id)?.description ?? null,
        coach_name: playerMap.get(a.player_id) ?? 'Player',
      }));
    },
    enabled: !!user,
  });
}

export function useAssignDrill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ drillId, playerId, notes }: { drillId: string; playerId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('drill_assignments').insert({
        drill_id: drillId,
        coach_id: user.id,
        player_id: playerId,
        notes: notes || null,
      });
      if (error) throw error;

      // RFL-008 — canonical foundation.drill.assigned (coach actor, athlete subject).
      void emitObservability({
        topic: 'foundation.drill.assigned',
        athleteId: playerId,
        actorId: user.id,
        actorRole: 'coach',
        payload: { drill_id: drillId, recommendation_id: drillId, has_notes: !!notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drill-assignments-coach'] });
    },
  });
}

export function useCompleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      // Fetch assignment context for canonical lineage (drill_id + player_id).
      const { data: assignment } = await supabase
        .from('drill_assignments')
        .select('drill_id, player_id')
        .eq('id', assignmentId)
        .maybeSingle();

      // RFL-008 — coarse foundation.drill.started signal at first-touch of completion mutation.
      // Granularity is bounded by available UI surface (single-tap complete); documented as such.
      if (assignment) {
        void emitObservability({
          topic: 'foundation.drill.started',
          athleteId: assignment.player_id,
          actorId: assignment.player_id,
          actorRole: 'athlete',
          payload: {
            drill_id: assignment.drill_id,
            recommendation_id: assignment.drill_id,
            assignment_id: assignmentId,
          },
        });
      }

      const { error } = await supabase
        .from('drill_assignments')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;

      // RFL-008 — canonical foundation.drill.completed.
      // RFL-009 — also emits foundation.recommendation.completed (drill sub-channel).
      if (assignment) {
        void emitObservability({
          topic: 'foundation.drill.completed',
          athleteId: assignment.player_id,
          actorId: assignment.player_id,
          actorRole: 'athlete',
          payload: {
            drill_id: assignment.drill_id,
            recommendation_id: assignment.drill_id,
            assignment_id: assignmentId,
          },
        });
        void emitObservability({
          topic: 'foundation.recommendation.completed',
          athleteId: assignment.player_id,
          actorId: assignment.player_id,
          actorRole: 'athlete',
          payload: {
            recommendation_id: assignment.drill_id,
            source: 'drill_assignment',
            assignment_id: assignmentId,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drill-assignments-player'] });
    },
  });
}
