import { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { getDataDensityForTier } from '@/data/dataDensityLevels';
import { getActiveTier } from '@/utils/tierAccess';

export function useDataDensityLevel() {
  const { modules } = useSubscription();
  const { sport } = useSportTheme();

  const level = useMemo(() => {
    const tier = getActiveTier(modules, sport);
    return getDataDensityForTier(tier || 'free');
  }, [modules, sport]);

  return { level, isBasic: level === 1, isEnhanced: level >= 2, isAdvanced: level >= 3, isElite: level >= 4 };
}
