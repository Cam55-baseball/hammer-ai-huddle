import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyTag, VideoTagRule, SkillDomain, TagLayer } from '@/lib/videoRecommendationEngine';

export function useVideoTaxonomy(skillDomain?: SkillDomain) {
  return useQuery({
    queryKey: ['video-taxonomy', skillDomain ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any).from('video_tag_taxonomy').select('*').eq('active', true);
      if (skillDomain) q = q.eq('skill_domain', skillDomain);
      const { data, error } = await q.order('layer').order('label');
      if (error) throw error;
      return (data || []) as TaxonomyTag[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVideoTagRules(skillDomain?: SkillDomain) {
  return useQuery({
    queryKey: ['video-tag-rules', skillDomain ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any).from('video_tag_rules').select('*').eq('active', true);
      if (skillDomain) q = q.eq('skill_domain', skillDomain);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as VideoTagRule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function groupTaxonomyByLayer(tags: TaxonomyTag[]): Record<TagLayer, TaxonomyTag[]> {
  const out: Record<TagLayer, TaxonomyTag[]> = {
    movement_pattern: [], result: [], context: [], correction: [],
  };
  for (const t of tags) out[t.layer].push(t);
  return out;
}
