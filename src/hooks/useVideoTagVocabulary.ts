import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxonomyTag { id: string; layer: string; key: string; label: string; skill_domain: string; sport: string }
export interface DimensionValue { id: string; dimension: string; key: string; label: string; sort: number }

/** Owner Nov 2: one shared vocabulary for the Video Manager — the 4-layer taxonomy plus owner-editable dimension values. */
export function useVideoTagVocabulary() {
  return useQuery({
    queryKey: ['video-tag-vocabulary'],
    staleTime: 60_000,
    queryFn: async () => {
      const [tax, dims] = await Promise.all([
        supabase.from('video_tag_taxonomy').select('id,layer,key,label,skill_domain,sport').eq('active', true).order('label').limit(2000),
        supabase.from('video_tag_dimension_values').select('id,dimension,key,label,sort').eq('active', true).order('sort').limit(1000),
      ]);
      if (tax.error) throw tax.error;
      if (dims.error) throw dims.error;
      return { taxonomy: (tax.data ?? []) as TaxonomyTag[], dimensions: (dims.data ?? []) as DimensionValue[] };
    },
  });
}

export const SKILL_AREA_LABEL: Record<string, string> = {
  hitting: 'Hitting', pitching: 'Pitching', throwing: 'Throwing', fielding: 'Fielding', base_running: 'Base running',
  speed_conditioning: 'Speed & conditioning', lifting: 'Lifting', jumps: 'Jumps', bat_speed: 'Bat speed',
  tissue_care: 'Arm & tissue care', mobility: 'Mobility', mind: 'The Mind', vision: 'Vision & Royal timing',
  recovery_education: 'Nutrition, sleep & recovery',
};
export const LAYER_LABEL: Record<string, string> = { movement_pattern: 'Movement', result: 'Result', context: 'Context', correction: 'Correction' };
