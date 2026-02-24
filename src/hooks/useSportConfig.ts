import { useMemo } from 'react';
import { useSportTheme } from '@/contexts/SportThemeContext';

// Baseball data
import { baseballPitchTypes } from '@/data/baseball/pitchTypes';
import { baseballHittingOutcomes, baseballPitchingOutcomes } from '@/data/baseball/outcomeTags';
import { baseballDrills } from '@/data/baseball/drillDefinitions';
import { baseballPositionWeights } from '@/data/baseball/positionWeights';
import { baseballPitchTypeWeights } from '@/data/baseball/pitchTypeWeights';
import { baseballAgeCurves } from '@/data/baseball/ageCurves';
import { baseballTierMultipliers } from '@/data/baseball/tierMultipliers';
import { baseballProBaselines } from '@/data/baseball/probabilityBaselines';

// Softball data
import { softballPitchTypes } from '@/data/softball/pitchTypes';
import { softballHittingOutcomes, softballPitchingOutcomes } from '@/data/softball/outcomeTags';
import { softballDrills } from '@/data/softball/drillDefinitions';
import { softballPositionWeights } from '@/data/softball/positionWeights';
import { softballPitchTypeWeights } from '@/data/softball/pitchTypeWeights';
import { softballAgeCurves } from '@/data/softball/ageCurves';
import { softballTierMultipliers } from '@/data/softball/tierMultipliers';
import { softballProBaselines } from '@/data/softball/probabilityBaselines';

export function useSportConfig() {
  const { sport } = useSportTheme();

  return useMemo(() => {
    const isSoftball = sport === 'softball';
    return {
      sport,
      pitchTypes: isSoftball ? softballPitchTypes : baseballPitchTypes,
      hittingOutcomes: isSoftball ? softballHittingOutcomes : baseballHittingOutcomes,
      pitchingOutcomes: isSoftball ? softballPitchingOutcomes : baseballPitchingOutcomes,
      drills: isSoftball ? softballDrills : baseballDrills,
      positionWeights: isSoftball ? softballPositionWeights : baseballPositionWeights,
      pitchTypeWeights: isSoftball ? softballPitchTypeWeights : baseballPitchTypeWeights,
      ageCurves: isSoftball ? softballAgeCurves : baseballAgeCurves,
      tierMultipliers: isSoftball ? softballTierMultipliers : baseballTierMultipliers,
      probabilityBaselines: isSoftball ? softballProBaselines : baseballProBaselines,
    };
  }, [sport]);
}
