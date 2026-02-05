import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  DailyLoadTracking, 
  LoadMetrics, 
  OverlapWarning,
  FascialBias
} from '@/types/eliteWorkout';
import { format, subDays } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

export function useLoadTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch today's load
  const todayQuery = useQuery({
    queryKey: ['load-tracking', 'today', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('athlete_load_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data ? mapDBToTracking(data) : null;
    },
    enabled: !!user,
  });
  
  // Fetch weekly average (last 7 days)
  const weeklyQuery = useQuery({
    queryKey: ['load-tracking', 'weekly', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const today = new Date();
      const weekAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('athlete_load_tracking')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', weekAgo)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      // Calculate averages
      const count = data.length;
      const totals = data.reduce(
        (acc, row) => ({
          cnsLoad: acc.cnsLoad + (row.cns_load_total || 0),
          volumeLoad: acc.volumeLoad + (row.volume_load || 0),
          fascialLoad: {
            compression: acc.fascialLoad.compression + ((row.fascial_load as any)?.compression || 0),
            elastic: acc.fascialLoad.elastic + ((row.fascial_load as any)?.elastic || 0),
            glide: acc.fascialLoad.glide + ((row.fascial_load as any)?.glide || 0),
          },
          recoveryDebt: acc.recoveryDebt + (row.recovery_debt || 0),
        }),
        { 
          cnsLoad: 0, 
          volumeLoad: 0, 
          fascialLoad: { compression: 0, elastic: 0, glide: 0 },
          recoveryDebt: 0 
        }
      );
      
      return {
        cnsLoad: Math.round(totals.cnsLoad / count),
        volumeLoad: Math.round(totals.volumeLoad / count),
        fascialLoad: {
          compression: Math.round(totals.fascialLoad.compression / count),
          elastic: Math.round(totals.fascialLoad.elastic / count),
          glide: Math.round(totals.fascialLoad.glide / count),
        },
        recoveryDebt: Math.round(totals.recoveryDebt / count),
        daysRecorded: count,
      } as LoadMetrics & { daysRecorded: number };
    },
    enabled: !!user,
  });
  
  // Update today's load
  const updateLoadMutation = useMutation({
    mutationFn: async (metrics: Partial<LoadMetrics> & { 
      workoutId?: string; 
      runningId?: string 
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if entry exists
      const { data: existing } = await supabase
        .from('athlete_load_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();
      
      if (existing) {
        // Update existing entry
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        
        if (metrics.cnsLoad !== undefined) {
          updates.cns_load_total = ((existing.cns_load_total as number) || 0) + metrics.cnsLoad;
        }
        if (metrics.volumeLoad !== undefined) {
          updates.volume_load = ((existing.volume_load as number) || 0) + metrics.volumeLoad;
        }
        if (metrics.fascialLoad) {
          const existingFascia = (existing.fascial_load as Record<string, number>) || { compression: 0, elastic: 0, glide: 0 };
          updates.fascial_load = {
            compression: existingFascia.compression + metrics.fascialLoad.compression,
            elastic: existingFascia.elastic + metrics.fascialLoad.elastic,
            glide: existingFascia.glide + metrics.fascialLoad.glide,
          };
        }
        if (metrics.workoutId) {
          updates.workout_ids = [...((existing.workout_ids as string[]) || []), metrics.workoutId];
        }
        if (metrics.runningId) {
          updates.running_ids = [...((existing.running_ids as string[]) || []), metrics.runningId];
        }
        
        const { error } = await supabase
          .from('athlete_load_tracking')
          .update(updates as any)
          .eq('id', existing.id as string);
        
        if (error) throw error;
      } else {
        // Insert new entry
        const insertData = {
          user_id: user.id,
          entry_date: today,
          cns_load_total: metrics.cnsLoad || 0,
          volume_load: metrics.volumeLoad || 0,
          fascial_load: (metrics.fascialLoad || { compression: 0, elastic: 0, glide: 0 }) as unknown as Json,
          workout_ids: metrics.workoutId ? [metrics.workoutId] : [],
          running_ids: metrics.runningId ? [metrics.runningId] : [],
        };
        
        const { error } = await supabase
          .from('athlete_load_tracking')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-tracking'] });
    },
  });
  
  // Add overlap warning
  const addWarningMutation = useMutation({
    mutationFn: async (warning: OverlapWarning) => {
      if (!user) throw new Error('Not authenticated');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: existing } = await supabase
        .from('athlete_load_tracking')
        .select('id, overlap_warnings')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();
      
      if (existing) {
        const existingWarnings = Array.isArray(existing.overlap_warnings) 
          ? existing.overlap_warnings as unknown as OverlapWarning[] 
          : [];
        const warnings = [...existingWarnings, warning];
        
        const { error } = await supabase
          .from('athlete_load_tracking')
          .update({ 
            overlap_warnings: warnings as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id as string);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-tracking'] });
    },
  });
  
  return {
    todayLoad: todayQuery.data,
    weeklyAverage: weeklyQuery.data,
    loading: todayQuery.isLoading || weeklyQuery.isLoading,
    updateLoad: updateLoadMutation.mutateAsync,
    addWarning: addWarningMutation.mutateAsync,
    isUpdating: updateLoadMutation.isPending,
  };
}

function mapDBToTracking(db: any): DailyLoadTracking {
  return {
    id: db.id,
    user_id: db.user_id,
    entry_date: db.entry_date,
    cns_load_total: db.cns_load_total || 0,
    fascial_load: db.fascial_load || { compression: 0, elastic: 0, glide: 0 },
    volume_load: db.volume_load || 0,
    intensity_avg: db.intensity_avg,
    recovery_debt: db.recovery_debt || 0,
    workout_ids: db.workout_ids || [],
    running_ids: db.running_ids || [],
    overlap_warnings: db.overlap_warnings || [],
  };
}
