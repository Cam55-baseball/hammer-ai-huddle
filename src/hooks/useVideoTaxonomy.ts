import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  sportMatches,
  positionMatches,
  type TaxonomyTag,
  type VideoTagRule,
  type SkillDomain,
  type TagLayer,
  type TagSport,
} from '@/lib/videoRecommendationEngine';

export interface TaxonomyScope {
  /** baseball | softball | both. Omitted / 'both' = no sport filter. */
  sport?: TagSport | null;
  /** Position groups (catcher, middle_infield, …). Empty = no position filter. */
  positions?: string[] | null;
}

export function useVideoTaxonomy(skillDomain?: SkillDomain, scope?: TaxonomyScope) {
  const sport = scope?.sport ?? null;
  const positions = scope?.positions ?? null;
  return useQuery({
    queryKey: ['video-taxonomy', skillDomain ?? 'all', sport ?? 'all', (positions ?? []).join(',')],
    queryFn: async () => {
      let q = (supabase as any).from('video_tag_taxonomy').select('*').eq('active', true);
      if (skillDomain) q = q.eq('skill_domain', skillDomain);
      const { data, error } = await q.order('layer').order('label');
      if (error) throw error;
      return ((data || []) as TaxonomyTag[]).filter(
        t => sportMatches(t.sport, sport) && positionMatches(t.position_scope, positions),
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVideoTagRules(skillDomain?: SkillDomain, scope?: TaxonomyScope) {
  const sport = scope?.sport ?? null;
  const positions = scope?.positions ?? null;
  return useQuery({
    queryKey: ['video-tag-rules', skillDomain ?? 'all', sport ?? 'all', (positions ?? []).join(',')],
    queryFn: async () => {
      let q = (supabase as any).from('video_tag_rules').select('*').eq('active', true);
      if (skillDomain) q = q.eq('skill_domain', skillDomain);
      const { data, error } = await q;
      if (error) throw error;
      return ((data || []) as VideoTagRule[]).filter(
        r => sportMatches(r.sport, sport) && positionMatches(r.position_scope, positions),
      );
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

