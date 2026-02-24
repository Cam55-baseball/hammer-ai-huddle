import { useProfessionalStatus } from '@/hooks/useProfessionalStatus';
import { useMPIScores } from '@/hooks/useMPIScores';
import { hofRequirements } from '@/data/hofRequirements';

export function useHoFEligibility() {
  const { data: proStatus } = useProfessionalStatus();
  const { data: mpi } = useMPIScores();

  const proProbability = mpi?.pro_probability ?? 0;
  const mlbSeasons = proStatus?.mlb_seasons_completed ?? 0;
  const auslSeasons = proStatus?.ausl_seasons_completed ?? 0;
  const totalProSeasons = mlbSeasons + auslSeasons;

  const isProVerified = proProbability >= 100;
  const meetsSeasonRequirement = totalProSeasons >= hofRequirements.minConsecutiveSeasons;
  const isEligible = isProVerified && meetsSeasonRequirement;
  const seasonsRemaining = Math.max(0, hofRequirements.minConsecutiveSeasons - totalProSeasons);
  const hofActivated = proStatus?.hof_eligible ?? false;

  return {
    isEligible,
    hofActivated,
    proProbability,
    totalProSeasons,
    seasonsRemaining,
    mlbSeasons,
    auslSeasons,
    isProVerified,
  };
}
