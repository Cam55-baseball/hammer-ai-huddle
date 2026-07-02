/**
 * useCanonicalPhaseDisplay — single source of truth for the "phase" label
 * that appears on every WK card (Speed / Bat Speed / Lifts / Conditioning).
 *
 * The server generator stamps a phase into `why_payload.phase_display`, but
 * when an athlete has no explicit season windows the generator would drift to
 * "Offseason Q1" while the profile / plan header (client-resolved) correctly
 * showed "In Season". This hook resolves the phase on the client using the
 * SAME rules as the server (mirrored resolveWkPhase) and prefers the stored
 * `season_status` over any default fallback — so every card, the header, and
 * the profile agree in the same paint.
 */
import { useMemo } from 'react';
import { useSeasonStatus } from '@/hooks/useSeasonStatus';
import { resolveWkPhase, type WkPhase } from '@/lib/hammer/workout/phaseQuarter';

export interface CanonicalPhaseDisplay {
  phase: WkPhase;
  display: string;
}

/**
 * @param serverDisplay optional label the generator emitted for this snapshot;
 *   used only when the client resolves to the same phase (avoids losing extra
 *   detail the server appended).
 */
export function useCanonicalPhaseDisplay(
  serverDisplay?: string | null,
  serverPhase?: string | null,
): CanonicalPhaseDisplay {
  const {
    seasonStatus,
    preseasonStartDate,
    preseasonEndDate,
    inSeasonStartDate,
    inSeasonEndDate,
    postSeasonStartDate,
    postSeasonEndDate,
  } = useSeasonStatus();

  return useMemo(() => {
    const resolution = resolveWkPhase({
      season_status: seasonStatus,
      preseason_start_date: preseasonStartDate,
      preseason_end_date: preseasonEndDate,
      in_season_start_date: inSeasonStartDate,
      in_season_end_date: inSeasonEndDate,
      post_season_start_date: postSeasonStartDate,
      post_season_end_date: postSeasonEndDate,
    });
    // If the server already resolved to the same canonical phase, keep the
    // richer server-stamped label (may include daysIntoPhase copy etc.).
    if (serverDisplay && serverPhase && serverPhase === resolution.phase) {
      return { phase: resolution.phase, display: serverDisplay };
    }
    return { phase: resolution.phase, display: resolution.displayName };
  }, [
    seasonStatus,
    preseasonStartDate,
    preseasonEndDate,
    inSeasonStartDate,
    inSeasonEndDate,
    postSeasonStartDate,
    postSeasonEndDate,
    serverDisplay,
    serverPhase,
  ]);
}
