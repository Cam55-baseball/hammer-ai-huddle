import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import {
  computeDrillRecommendations,
  type DrillInput,
  type WeaknessInput,
  type RecommendationOutput,
  type DrillUsageStats,
} from '@/utils/drillRecommendationEngine';

interface UseDrillRecommendationsOptions {
  sport: string;
  weaknesses?: WeaknessInput[];
  position?: string;
  detectedIssues?: string[];
  excludeDrillIds?: string[];
  enabled?: boolean;
}

export function useDrillRecommendations(options: UseDrillRecommendationsOptions) {
  const { user } = useAuth();
  const { modules: subscribedModules } = useSubscription();
  const userHasPremium = subscribedModules.length > 0;

  const { sport, weaknesses = [], position, detectedIssues = [], excludeDrillIds = [], enabled = true } = options;

  // Fetch all active drills with tags and positions
  const drillsQuery = useQuery({
    queryKey: ['drills-with-tags', sport],
    queryFn: async () => {
      // Fetch drills
      const { data: drills, error: drillsError } = await supabase
        .from('drills')
        .select('*')
        .eq('sport', sport)
        .eq('is_active', true)
        .eq('is_published', true);

      if (drillsError) throw drillsError;
      if (!drills) return [];

      // Fetch tag mappings with tag names
      const drillIds = drills.map(d => d.id);
      const { data: tagMaps } = await supabase
        .from('drill_tag_map')
        .select('drill_id, tag_id, weight, drill_tags(name, category)')
        .in('drill_id', drillIds);

      // Fetch positions
      const { data: positions } = await supabase
        .from('drill_positions')
        .select('drill_id, position')
        .in('drill_id', drillIds);

      // Build DrillInput[]
      const tagsByDrill = new Map<string, { tags: string[]; tagWeights: Record<string, number> }>();
      for (const tm of tagMaps || []) {
        const tagInfo = tm.drill_tags as any;
        if (!tagInfo) continue;
        if (!tagsByDrill.has(tm.drill_id)) {
          tagsByDrill.set(tm.drill_id, { tags: [], tagWeights: {} });
        }
        const entry = tagsByDrill.get(tm.drill_id)!;
        entry.tags.push(tagInfo.name);
        if (tm.weight > 1) {
          entry.tagWeights[tagInfo.name] = tm.weight;
        }
      }

      const posByDrill = new Map<string, string[]>();
      for (const p of positions || []) {
        if (!posByDrill.has(p.drill_id)) posByDrill.set(p.drill_id, []);
        posByDrill.get(p.drill_id)!.push(p.position);
      }

      return drills.map((d): DrillInput => {
        const tagData = tagsByDrill.get(d.id);
        return {
          id: d.id,
          name: d.name,
          module: d.module,
          sport: d.sport,
          skill_target: d.skill_target,
          premium: d.premium,
          is_active: d.is_active,
          tags: tagData?.tags ?? [],
          tagWeights: tagData?.tagWeights ?? {},
          ai_context: d.ai_context,
          difficulty_levels: d.difficulty_levels ?? [],
          positions: posByDrill.get(d.id) ?? [],
          video_url: d.video_url,
          description: d.description,
          is_published: d.is_published,
          subscription_tier_required: d.subscription_tier_required,
          progression_level: (d as any).progression_level ?? 4,
          sport_modifier: Number((d as any).sport_modifier) || 1.0,
        };
      });
    },
    enabled,
  });

  // Fetch usage stats
  const usageQuery = useQuery({
    queryKey: ['drill-usage-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('drill_usage_tracking')
        .select('drill_id, success_rating')
        .eq('user_id', user.id);

      if (!data) return [];

      // Aggregate
      const map = new Map<string, { count: number; totalRating: number; ratedCount: number }>();
      for (const row of data) {
        if (!map.has(row.drill_id)) {
          map.set(row.drill_id, { count: 0, totalRating: 0, ratedCount: 0 });
        }
        const entry = map.get(row.drill_id)!;
        entry.count++;
        if (row.success_rating != null) {
          entry.totalRating += row.success_rating;
          entry.ratedCount++;
        }
      }

      return Array.from(map.entries()).map(([drillId, stats]): DrillUsageStats => ({
        drillId,
        useCount: stats.count,
        avgSuccessRating: stats.ratedCount > 0 ? stats.totalRating / stats.ratedCount : 0,
      }));
    },
    enabled: enabled && !!user?.id,
  });

  // Compute recommendations
  const recommendations: RecommendationOutput | null = drillsQuery.data
    ? computeDrillRecommendations({
        drills: drillsQuery.data,
        weaknesses,
        sport,
        userHasPremium,
        excludeDrillIds,
        position,
        detectedIssues,
        usageStats: usageQuery.data ?? [],
      })
    : null;

  // Strip video_url from locked drills
  const safeRecommendations = recommendations
    ? {
        ...recommendations,
        recommended: recommendations.recommended.map((r) =>
          r.locked
            ? { ...r, drill: { ...r.drill, video_url: null } }
            : r,
        ),
      }
    : null;

  return {
    recommendations: safeRecommendations,
    isLoading: drillsQuery.isLoading || usageQuery.isLoading,
    error: drillsQuery.error || usageQuery.error,
    allDrills: drillsQuery.data ?? [],
    refetch: drillsQuery.refetch,
  };
}
