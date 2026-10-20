import { priorityAccess } from './priorityAccess';
import type { Discipline } from '@/lib/wic/faultLedger/ranking';
import type { RankedFault } from '@/lib/wic/faultLedger/ranking';

/** Filter before top-three ranking slots are consumed; access never comes from another sport. */
export function accessiblePlanFaults(ranked: readonly RankedFault[], modules: readonly string[], sport: 'baseball' | 'softball'): RankedFault[] {
  const access = priorityAccess(modules, sport);
  const allowed = new Set<Discipline>();
  if (access.hasHitting) allowed.add('hitting');
  if (access.hasPitching) allowed.add('pitching');
  if (access.hasThrowing) {
    allowed.add('throwing');
    allowed.add('fielding');
    allowed.add('running');
  }
  return ranked.flatMap(priority => {
    const signals = priority.signals.filter(signal => allowed.has(signal.discipline));
    if (!signals.length) return [];
    return [{ ...priority, signals, disciplines: priority.disciplines.filter(discipline => allowed.has(discipline)),
      fades: priority.fades.filter(entry => allowed.has(entry.signal.discipline)) }];
  });
}