import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  WorkoutBlock, 
  WorkoutBlockDB,
  WorkoutPreset,
  WorkoutPresetDB,
  EnhancedExercise,
  ViewMode,
  createEmptyBlock
} from '@/types/eliteWorkout';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// =====================================================
// BLOCKS HOOK
// =====================================================

export function useWorkoutBlocks(templateId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const blocksQuery = useQuery({
    queryKey: ['workout-blocks', templateId],
    queryFn: async () => {
      if (!templateId || !user) return [];
      
      const { data, error } = await supabase
        .from('workout_blocks')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(mapDBToBlock);
    },
    enabled: !!templateId && !!user,
  });
  
  const saveBlocksMutation = useMutation({
    mutationFn: async (blocks: WorkoutBlock[]) => {
      if (!templateId || !user) throw new Error('No template or user');
      
      // Delete existing blocks
      await supabase
        .from('workout_blocks')
        .delete()
        .eq('template_id', templateId)
        .eq('user_id', user.id);
      
      // Insert new blocks
      if (blocks.length > 0) {
        const blocksToInsert = blocks.map((block, index) => ({
          user_id: user.id,
          template_id: templateId,
          name: block.name,
          intent: block.intent,
          order_index: index,
          block_type: block.blockType,
          is_custom: block.isCustom,
          exercises: block.exercises as unknown as Json,
          metadata: block.metadata as unknown as Json,
        })
        );
        
        const { error } = await supabase
          .from('workout_blocks')
          .insert(blocksToInsert);
        
        if (error) throw error;
      }
      
      return blocks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-blocks', templateId] });
    },
    onError: (error) => {
      console.error('Failed to save blocks:', error);
      toast.error('Failed to save workout blocks');
    },
  });
  
  return {
    blocks: blocksQuery.data || [],
    loading: blocksQuery.isLoading,
    error: blocksQuery.error,
    saveBlocks: saveBlocksMutation.mutateAsync,
    isSaving: saveBlocksMutation.isPending,
  };
}

// =====================================================
// PRESETS HOOK
// =====================================================

export function useWorkoutPresets(sport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const presetsQuery = useQuery({
    queryKey: ['workout-presets', sport, user?.id],
    queryFn: async () => {
      // Fetch system presets + user presets
      const { data, error } = await supabase
        .from('workout_presets')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${user?.id}`)
        .or(`sport.eq.${sport},sport.eq.both`)
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(mapDBToPreset);
    },
    enabled: !!user,
  });
  
  const createPresetMutation = useMutation({
    mutationFn: async (preset: Omit<WorkoutPreset, 'id' | 'isSystem' | 'isLocked'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('workout_presets')
        .insert({
          user_id: user.id,
          name: preset.name,
          description: preset.description,
          category: preset.category,
          difficulty: preset.difficulty,
          sport: preset.sport,
          preset_data: preset.presetData as any,
          estimated_duration_minutes: preset.estimatedDurationMinutes,
          cns_load_estimate: preset.cnsLoadEstimate,
          fascial_bias: preset.fascialBias as any,
          is_system: false,
          is_locked: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return mapDBToPreset(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-presets'] });
      toast.success('Preset saved!');
    },
    onError: (error) => {
      console.error('Failed to save preset:', error);
      toast.error('Failed to save preset');
    },
  });
  
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const { error } = await supabase
        .from('workout_presets')
        .delete()
        .eq('id', presetId)
        .eq('user_id', user?.id)
        .eq('is_system', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-presets'] });
      toast.success('Preset deleted');
    },
  });
  
  return {
    presets: presetsQuery.data || [],
    systemPresets: (presetsQuery.data || []).filter(p => p.isSystem),
    userPresets: (presetsQuery.data || []).filter(p => !p.isSystem),
    loading: presetsQuery.isLoading,
    createPreset: createPresetMutation.mutateAsync,
    deletePreset: deletePresetMutation.mutateAsync,
    isCreating: createPresetMutation.isPending,
  };
}

// =====================================================
// ELITE WORKOUT STATE HOOK
// =====================================================

export function useEliteWorkoutState() {
  const [viewMode, setViewMode] = useState<ViewMode>('execute');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const handleBlocksChange = useCallback((newBlocks: WorkoutBlock[]) => {
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  }, []);
  
  const loadFromPreset = useCallback((preset: WorkoutPreset) => {
    if (preset.presetData?.blocks) {
      // Clone blocks with new IDs
      const newBlocks = preset.presetData.blocks.map((block, index) => ({
        ...block,
        id: `block-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        exercises: block.exercises.map((ex, exIndex) => ({
          ...ex,
          id: `exercise-${Date.now()}-${exIndex}-${Math.random().toString(36).substr(2, 9)}`,
        })),
      }));
      setBlocks(newBlocks);
      setHasUnsavedChanges(true);
    }
  }, []);
  
  const clearBlocks = useCallback(() => {
    setBlocks([]);
    setHasUnsavedChanges(true);
  }, []);
  
  return {
    viewMode,
    setViewMode,
    blocks,
    setBlocks: handleBlocksChange,
    loadFromPreset,
    clearBlocks,
    hasUnsavedChanges,
    markSaved: () => setHasUnsavedChanges(false),
  };
}

// =====================================================
// MAPPER FUNCTIONS
// =====================================================

function mapDBToBlock(db: any): WorkoutBlock {
  return {
    id: db.id,
    name: db.name,
    blockType: db.block_type as WorkoutBlock['blockType'],
    intent: db.intent as WorkoutBlock['intent'],
    orderIndex: db.order_index,
    isCustom: db.is_custom,
    exercises: (db.exercises || []) as EnhancedExercise[],
    metadata: db.metadata || {},
  };
}

function mapBlockToDB(
  block: WorkoutBlock, 
  userId: string, 
  templateId: string,
  orderIndex: number
): Omit<WorkoutBlockDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    template_id: templateId,
    name: block.name,
    intent: block.intent,
    order_index: orderIndex,
    block_type: block.blockType,
    is_custom: block.isCustom,
    exercises: block.exercises as any,
    metadata: block.metadata as any,
  };
}

function mapDBToPreset(db: any): WorkoutPreset {
  return {
    id: db.id,
    user_id: db.user_id,
    name: db.name,
    description: db.description,
    category: db.category,
    difficulty: db.difficulty || 'intermediate',
    sport: db.sport || 'both',
    presetData: db.preset_data || { blocks: [] },
    estimatedDurationMinutes: db.estimated_duration_minutes,
    cnsLoadEstimate: db.cns_load_estimate,
    fascialBias: db.fascial_bias,
    isSystem: db.is_system,
    isLocked: db.is_locked,
  };
}
