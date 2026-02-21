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
import { toast } from '@/hooks/use-toast';
import { Exercise } from '@/types/customActivity';
import { calculateCustomActivityLoad } from '@/utils/customActivityLoadCalculation';

// Safe number extraction with validation
function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

// Safe fascia extraction
function safeFascialLoad(value: unknown): FascialBias {
  const defaultBias = { compression: 0, elastic: 0, glide: 0 };
  if (!value || typeof value !== 'object') return defaultBias;
  
  const obj = value as Record<string, unknown>;
  return {
    compression: safeNumber(obj.compression),
    elastic: safeNumber(obj.elastic),
    glide: safeNumber(obj.glide),
  };
}

export function useLoadTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch today's load with error handling
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
      
      if (error) {
        console.error('[useLoadTracking] Error fetching today:', error);
        throw error;
      }
      
      return data ? mapDBToTracking(data) : null;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
  
  // Fetch weekly average (last 7 days) with improved error handling
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
      
      if (error) {
        console.error('[useLoadTracking] Error fetching weekly:', error);
        throw error;
      }
      
      if (!data || data.length === 0) return null;
      
      // Calculate averages with safe number extraction
      const count = data.length;
      const totals = data.reduce(
        (acc, row) => {
          const fascialLoad = safeFascialLoad(row.fascial_load);
          return {
            cnsLoad: acc.cnsLoad + safeNumber(row.cns_load_total),
            volumeLoad: acc.volumeLoad + safeNumber(row.volume_load),
            fascialLoad: {
              compression: acc.fascialLoad.compression + fascialLoad.compression,
              elastic: acc.fascialLoad.elastic + fascialLoad.elastic,
              glide: acc.fascialLoad.glide + fascialLoad.glide,
            },
            recoveryDebt: acc.recoveryDebt + safeNumber(row.recovery_debt),
          };
        },
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
    staleTime: 60000, // 1 minute
    retry: 2,
  });
  
  // Update today's load with optimistic updates and error recovery
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
        // Update existing entry with safe number extraction
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        
        if (metrics.cnsLoad !== undefined) {
          updates.cns_load_total = safeNumber(existing.cns_load_total) + metrics.cnsLoad;
        }
        if (metrics.volumeLoad !== undefined) {
          updates.volume_load = safeNumber(existing.volume_load) + metrics.volumeLoad;
        }
        if (metrics.fascialLoad) {
          const existingFascia = safeFascialLoad(existing.fascial_load);
          updates.fascial_load = {
            compression: existingFascia.compression + metrics.fascialLoad.compression,
            elastic: existingFascia.elastic + metrics.fascialLoad.elastic,
            glide: existingFascia.glide + metrics.fascialLoad.glide,
          };
        }
        if (metrics.workoutId) {
          const existingIds = Array.isArray(existing.workout_ids) ? existing.workout_ids : [];
          updates.workout_ids = [...existingIds, metrics.workoutId];
        }
        if (metrics.runningId) {
          const existingIds = Array.isArray(existing.running_ids) ? existing.running_ids : [];
          updates.running_ids = [...existingIds, metrics.runningId];
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
    onError: (error) => {
      console.error('[useLoadTracking] Update error:', error);
      toast({
        title: 'Failed to update load tracking',
        description: 'Your changes may not be saved. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Add overlap warning with error handling
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
        const warnings = [...existingWarnings, { ...warning, timestamp: new Date().toISOString() }];
        
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
    onError: (error) => {
      console.error('[useLoadTracking] Warning add error:', error);
      // Silent fail for warnings - not critical
    },
  });
  
  // Add load from a completed custom activity's exercises
  const addCustomActivityLoad = async (exercises: Exercise[], activityTitle?: string) => {
    const loadMetrics = calculateCustomActivityLoad(exercises);
    if (!loadMetrics) return; // No exercises = no load to add
    
    try {
      await updateLoadMutation.mutateAsync({
        cnsLoad: loadMetrics.cnsLoad,
        fascialLoad: loadMetrics.fascialLoad,
        volumeLoad: loadMetrics.volumeLoad,
      });
      console.log(`[useLoadTracking] Added custom activity load: CNS=${loadMetrics.cnsLoad}, Vol=${loadMetrics.volumeLoad}${activityTitle ? ` (${activityTitle})` : ''}`);
    } catch (error) {
      console.error('[useLoadTracking] Failed to add custom activity load:', error);
    }
  };

  return {
    todayLoad: todayQuery.data,
    weeklyAverage: weeklyQuery.data,
    loading: todayQuery.isLoading || weeklyQuery.isLoading,
    error: todayQuery.error || weeklyQuery.error,
    updateLoad: updateLoadMutation.mutateAsync,
    addWarning: addWarningMutation.mutateAsync,
    addCustomActivityLoad,
    isUpdating: updateLoadMutation.isPending,
    refetch: () => {
      todayQuery.refetch();
      weeklyQuery.refetch();
    },
  };
}

function mapDBToTracking(db: any): DailyLoadTracking {
  return {
    id: db.id,
    user_id: db.user_id,
    entry_date: db.entry_date,
    cns_load_total: safeNumber(db.cns_load_total),
    fascial_load: safeFascialLoad(db.fascial_load),
    volume_load: safeNumber(db.volume_load),
    intensity_avg: db.intensity_avg != null ? safeNumber(db.intensity_avg) : null,
    recovery_debt: safeNumber(db.recovery_debt),
    workout_ids: Array.isArray(db.workout_ids) ? db.workout_ids : [],
    running_ids: Array.isArray(db.running_ids) ? db.running_ids : [],
    overlap_warnings: Array.isArray(db.overlap_warnings) ? db.overlap_warnings : [],
  };
}
