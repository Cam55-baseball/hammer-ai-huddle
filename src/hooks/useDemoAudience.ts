import { useMemo } from 'react';
import { useScoutAccess } from './useScoutAccess';

/**
 * Returns 'team' if the current user signed up as a Scout/Coach (or has the
 * scout/coach role on their account); otherwise 'player'. Used to gate the
 * "For Your Team" demo nodes.
 */
export type DemoAudience = 'team' | 'player';

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function useDemoAudience(): DemoAudience {
  const { isScout, isCoach } = useScoutAccess();

  return useMemo<DemoAudience>(() => {
    if (isScout || isCoach) return 'team';
    const userRole = readLocal('userRole');           // 'player' | 'scout'
    const selectedRole = readLocal('selectedRole');   // 'Player' | 'Scout/Coach' | 'Admin'
    if (userRole === 'scout') return 'team';
    if (selectedRole === 'Scout/Coach') return 'team';
    return 'player';
  }, [isScout, isCoach]);
}
