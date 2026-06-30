import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHammerAthleteContext } from '@/lib/hammer/context/athleteContext';
import {
  projectEnvelope,
  orderRoadmapMilestones,
  type RoadmapMilestoneView,
  type OrderedMilestone,
} from '@/lib/hammer/context/decisionFilters';
import { useGpSignal } from '@/hooks/useGpSignal';

export function useRoadmapProgress(sport?: string, module?: string) {
  const { user } = useAuth();
  // P0-3 (RFL-031): spine-driven roadmap ordering.
  const athleteCtx = useHammerAthleteContext();
  const gpSig = useGpSignal();

  const milestones = useQuery({
    queryKey: ['roadmap-milestones', sport, module],
    queryFn: async () => {
      let q = supabase.from('roadmap_milestones').select('*').order('milestone_order', { ascending: true });
      if (sport) q = q.eq('sport', sport);
      if (module) q = q.eq('module', module);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ['roadmap-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('athlete_roadmap_progress')
        .select('*, roadmap_milestones(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Spine-ordered milestones — additive view, original `milestones.data` untouched.
  const orderedMilestones: ReadonlyArray<OrderedMilestone<RoadmapMilestoneView>> = useMemo(() => {
    const proj = projectEnvelope(athleteCtx);
    const items: RoadmapMilestoneView[] = (milestones.data ?? []).map((m: any) => ({
      id: m.id,
      module: m.module ?? null,
      title: m.title ?? m.name ?? null,
      tags: [m.module, m.skill_target, ...(m.tags ?? [])].filter(Boolean) as string[],
      lifecycleBands: m.lifecycle_bands ?? undefined,
      milestoneOrder: m.milestone_order ?? null,
    }));
    return orderRoadmapMilestones(items, proj, {
      chasePct: gpSig.chasePct,
      whiffPct: gpSig.whiffPct,
      miscueClusters: gpSig.miscueClusters,
      atBats: gpSig.atBats,
      defensivePlays: gpSig.defensivePlays,
    });
  }, [milestones.data, athleteCtx, gpSig.chasePct, gpSig.whiffPct, gpSig.miscueClusters, gpSig.atBats, gpSig.defensivePlays]);

  return { milestones, progress, orderedMilestones };
}
