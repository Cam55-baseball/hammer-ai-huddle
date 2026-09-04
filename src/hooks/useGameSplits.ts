/**
 * useGameSplits — react-query wrappers over the deterministic gp_v_* views.
 *
 * These hooks never compute a number. They hand back exactly what the
 * database returned, sample size included.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  GP_VIEWS,
  fetchView,
  fetchGameRepCounts,
  type HittingSplitRow,
  type PlateDisciplineRow,
  type DefenseRow,
  type BaserunRow,
  type HomeToFirstRow,
} from "@/lib/games/reader";

function useSplit<T>(key: string, view: any, sport?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gp-split", key, user?.id, sport ?? "all"],
    enabled: !!user,
    queryFn: () => fetchView<T>(view, user!.id, sport),
    staleTime: 30_000,
  });
}

export const useHittingByPitchType = (sport?: string | null) =>
  useSplit<HittingSplitRow>("pitch-type", GP_VIEWS.byPitchType, sport);

export const useHittingByCount = (sport?: string | null) =>
  useSplit<HittingSplitRow>("count", GP_VIEWS.byCount, sport);

export const useHittingByZone = (sport?: string | null) =>
  useSplit<HittingSplitRow>("zone", GP_VIEWS.byZone, sport);

export const useHittingByPitcherHand = (sport?: string | null) =>
  useSplit<HittingSplitRow>("pitcher-hand", GP_VIEWS.byPitcherHand, sport);

export const useHittingByVeloBand = (sport?: string | null) =>
  useSplit<HittingSplitRow>("velo-band", GP_VIEWS.byVeloBand, sport);

export const useContactQuality = (sport?: string | null) =>
  useSplit<HittingSplitRow>("contact-quality", GP_VIEWS.contactQuality, sport);

export const useHittingRisp = (sport?: string | null) =>
  useSplit<HittingSplitRow>("risp", GP_VIEWS.risp, sport);

export const useHomeToFirst = (sport?: string | null) =>
  useSplit<HomeToFirstRow>("home-to-first", GP_VIEWS.homeToFirst, sport);

export const usePlateDiscipline = (sport?: string | null) =>
  useSplit<PlateDisciplineRow>("plate-discipline", GP_VIEWS.plateDiscipline, sport);

export const useDefenseByPosition = (sport?: string | null) =>
  useSplit<DefenseRow>("defense-position", GP_VIEWS.defenseByPosition, sport);

export const useBaserunningSplits = (sport?: string | null) =>
  useSplit<BaserunRow>("baserunning", GP_VIEWS.baserunning, sport);

/** Real counted game reps — no estimate, no default. */
export function useGameRepCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gp-rep-counts", user?.id],
    enabled: !!user,
    queryFn: () => fetchGameRepCounts(user!.id),
    staleTime: 60_000,
  });
}
