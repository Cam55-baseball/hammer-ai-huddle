import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutBlock } from '@/types/eliteWorkout';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface WorkoutPreset {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty: string | null;
  sport: string | null;
  isSystem: boolean;
  isLocked: boolean;
  cnsLoadEstimate: number | null;
  estimatedDurationMinutes: number | null;
  fascialBias: { compression: number; elastic: number; glide: number } | null;
  blocks: WorkoutBlock[];
  createdAt: string;
}

interface UseWorkoutPresetsReturn {
  presets: WorkoutPreset[];
  systemPresets: WorkoutPreset[];
  userPresets: WorkoutPreset[];
  loading: boolean;
  error: Error | null;
  fetchPresets: () => Promise<void>;
  createPreset: (preset: Omit<WorkoutPreset, 'id' | 'createdAt' | 'isSystem' | 'isLocked'>) => Promise<WorkoutPreset | null>;
  deletePreset: (id: string) => Promise<boolean>;
}

export function useWorkoutPresets(sport?: 'baseball' | 'softball' | 'both'): UseWorkoutPresetsReturn {
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const parsePresetData = (row: any): WorkoutPreset => {
    const presetData = row.preset_data as { blocks?: WorkoutBlock[] } | null;
    const fascialBias = row.fascial_bias as { compression: number; elastic: number; glide: number } | null;
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      sport: row.sport,
      isSystem: row.is_system || false,
      isLocked: row.is_locked || false,
      cnsLoadEstimate: row.cns_load_estimate,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      fascialBias: fascialBias,
      blocks: presetData?.blocks || [],
      createdAt: row.created_at,
    };
  };

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('workout_presets')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (sport && sport !== 'both') {
        query = query.or(`sport.eq.${sport},sport.eq.both,sport.is.null`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const parsedPresets = (data || []).map(parsePresetData);
      setPresets(parsedPresets);
    } catch (err) {
      console.error('[useWorkoutPresets] Error fetching presets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch presets'));
    } finally {
      setLoading(false);
    }
  }, [sport]);

  const createPreset = useCallback(async (
    preset: Omit<WorkoutPreset, 'id' | 'createdAt' | 'isSystem' | 'isLocked'>
  ): Promise<WorkoutPreset | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create presets');
        return null;
      }

      const presetData: Json = { blocks: preset.blocks as unknown as Json };
      const fascialBias: Json = preset.fascialBias as unknown as Json;

      const { data, error: insertError } = await supabase
        .from('workout_presets')
        .insert({
          user_id: user.id,
          name: preset.name,
          description: preset.description,
          category: preset.category,
          difficulty: preset.difficulty,
          sport: preset.sport,
          is_system: false,
          is_locked: false,
          cns_load_estimate: preset.cnsLoadEstimate,
          estimated_duration_minutes: preset.estimatedDurationMinutes,
          fascial_bias: fascialBias,
          preset_data: presetData,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newPreset = parsePresetData(data);
      setPresets(prev => [...prev, newPreset]);
      toast.success('Preset saved successfully!');
      return newPreset;
    } catch (err) {
      console.error('[useWorkoutPresets] Error creating preset:', err);
      toast.error('Failed to save preset');
      return null;
    }
  }, []);

  const deletePreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const preset = presets.find(p => p.id === id);
      if (preset?.isSystem || preset?.isLocked) {
        toast.error('Cannot delete system presets');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('workout_presets')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setPresets(prev => prev.filter(p => p.id !== id));
      toast.success('Preset deleted');
      return true;
    } catch (err) {
      console.error('[useWorkoutPresets] Error deleting preset:', err);
      toast.error('Failed to delete preset');
      return false;
    }
  }, [presets]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const systemPresets = presets.filter(p => p.isSystem);
  const userPresets = presets.filter(p => !p.isSystem);

  return {
    presets,
    systemPresets,
    userPresets,
    loading,
    error,
    fetchPresets,
    createPreset,
    deletePreset,
  };
}
