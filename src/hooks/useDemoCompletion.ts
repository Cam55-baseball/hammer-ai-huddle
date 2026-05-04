import { useMemo } from 'react';
import { useDemoProgress } from './useDemoProgress';
import { computeCompletion } from '@/demo/completionRules';

export function useDemoCompletion() {
  const { progress } = useDemoProgress();
  return useMemo(() => {
    const c = {
      tiers: progress?.viewed_tiers.length ?? 0,
      categories: progress?.viewed_categories?.length ?? 0,
      submodules: progress?.viewed_submodules.length ?? 0,
      interactionCounts: progress?.interaction_counts ?? {},
      dwellMs: progress?.dwell_ms ?? {},
    };
    return { ...computeCompletion(c), counts: c, state: progress?.demo_state ?? 'pending' };
  }, [progress]);
}
