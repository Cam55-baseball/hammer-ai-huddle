import { useMemo } from 'react';
import { useReadinessState } from './useReadinessState';
import { useHammerState } from './useHammerState';

export interface NextAction {
  moduleHint: string;
  label: string;
  route: string;
  ctaLabel: string;
}

/**
 * Derives the next-best action for the athlete from time-of-day,
 * Hammer State, and current readiness signals.
 */
export function useNextAction(): NextAction {
  const readiness = useReadinessState();
  const { overallState } = useHammerState();

  return useMemo(() => {
    const hour = new Date().getHours();

    if (overallState === 'recover' || readiness.state === 'red') {
      return {
        moduleHint: 'recovery',
        label: 'Recover today — protect tomorrow',
        route: '/bounce-back-bay',
        ctaLabel: 'Open Recovery',
      };
    }

    if (hour < 10) {
      return {
        moduleHint: 'physio',
        label: 'Prime your nervous system',
        route: '/tex-vision',
        ctaLabel: 'Start Tex Vision',
      };
    }
    if (hour < 16) {
      return {
        moduleHint: 'practice',
        label: 'Hit your practice window',
        route: '/practice',
        ctaLabel: 'Open Practice Hub',
      };
    }
    if (hour < 21) {
      return {
        moduleHint: 'reflect',
        label: 'Lock in today’s session',
        route: '/vault',
        ctaLabel: 'Log to Vault',
      };
    }
    return {
      moduleHint: 'wind-down',
      label: 'Wind down — quality sleep wins',
      route: '/nutrition-hub',
      ctaLabel: 'Plan Tomorrow',
    };
  }, [overallState, readiness.state]);
}
