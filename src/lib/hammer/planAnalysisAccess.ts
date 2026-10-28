import { priorityAccess } from './priorityAccess';
import type { Discipline } from '@/lib/wic/faultLedger/ranking';
import type { RankedFault } from '@/lib/wic/faultLedger/ranking';
import { rankFaults } from '@/lib/wic/faultLedger/ranking';
import type { ClipEvidence } from '@/lib/wic/faultLedger/cleanClipFade';

/** Filter before top-three ranking slots are consumed; access never comes from another sport. */
export function accessiblePlanFaults(ranked: readonly RankedFault[], modules: readonly string[], sport: 'baseball' | 'softball', evidence?: { clips: readonly ClipEvidence[]; now?: number }): RankedFault[] {
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
    if (signals.length === priority.signals.length) return [priority];
    // Rebuild score, sample count, wording and clear state from eligible evidence.
    // Existing fades cannot be reconstructed from a cached multiplier or guessed clips.
    if (!evidence && priority.fades.length) return [];
    return rankFaults(signals, evidence?.now ?? Date.now(), evidence?.clips ?? []);
  }).sort((a, b) => b.score - a.score || a.rootPatternId.localeCompare(b.rootPatternId));
}

/** Recurring issues follow the same purchased-category access as ranked faults. */
export function accessibleRecurringIssues<T extends { skill_domain: string; sport: string }>(issues: readonly T[], modules: readonly string[], sport: 'baseball' | 'softball'): T[] {
  const access = priorityAccess(modules, sport);
  const ok = (d: string) => (d === 'hitting' && access.hasHitting) || (d === 'pitching' && access.hasPitching)
    || ((d === 'throwing' || d === 'fielding' || d === 'running') && access.hasThrowing);
  return issues.filter((i) => i.sport === sport && ok(i.skill_domain));
}
