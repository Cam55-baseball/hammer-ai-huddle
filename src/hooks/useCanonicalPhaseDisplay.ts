/**
 * useCanonicalPhaseDisplay — the phase label on every card, header and
 * counter. ONE SYSTEM, ONE PHASE: the label comes from the server's one
 * resolver (phase-state), which returns today's built plan's own answer when
 * a plan exists. The device never works a phase out.
 */
import { usePhaseState } from '@/hooks/usePhaseState';
import type { WkPhase } from '@/lib/hammer/workout/phaseQuarter';

export interface CanonicalPhaseDisplay {
  phase: WkPhase;
  display: string;
}

/** Arguments kept for older callers; the server answer always wins. */
export function useCanonicalPhaseDisplay(
  serverDisplay?: string | null,
  serverPhase?: string | null,
): CanonicalPhaseDisplay {
  const { phaseState } = usePhaseState();
  if (phaseState) return { phase: phaseState.sub_block as WkPhase, display: phaseState.sub_block_label };
  if (serverPhase) return { phase: serverPhase as WkPhase, display: serverDisplay || '' };
  return { phase: 'os_q1', display: '' };
}
