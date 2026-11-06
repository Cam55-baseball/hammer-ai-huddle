// Locked by owner Nov 6 — pitchers' throwing chain, no drift:
//   no full throwing warm-up → no pull-downs; no pull-downs → not ready for the mound.
// Runs on the final day (after the arm guard and card placement). Removal/replacement only:
// it never adds throws beyond the arm room that is left, and never raises a pitch count.
import { armBudget, throwUnits, type ThrowEvent, type ThrowRole } from '../../../../supabase/functions/_shared/wic/phases/armLedger';
import { equivalentsByDay } from '../../../../supabase/functions/_shared/wic/phases/nextThrowDate';
import { pitcherIntervalWarmup } from '../../../../supabase/functions/_shared/wic/throwing/catchPlay';
import type { PlanningArmHistory } from './pitchingDay';

export const REDUCED_CATCH_REASON = "Your arm budget only fits a short catch play today, so no pull-downs or mound work.";
const REASON_BY: Record<string, string> = {
  low_readiness: "Low readiness today means only a short catch play, so no pull-downs or mound work.",
  arm_protected: "Your arm is being protected today, so only a short catch play — no pull-downs or mound work.",
  build_up: "You're building your arm back up, so only a short catch play — no pull-downs or mound work.",
  budget: REDUCED_CATCH_REASON,
};

type Row = { name?: string; stage?: string; armCard?: string; eassCategory?: string; armEvent?: ThrowEvent; pitchTags?: { moundType?: string }; fullPitcherWarmup?: boolean; dosage?: string };
type Block = { status: string; modality?: string; drills: readonly Row[]; because?: readonly string[] };

const MOUND = /bullpen|mound|circle|side session|shortbox|short box|live|outing prep/i;
const PULL = /pull[-_ ]?downs?/i;
const CATCH = /catch play|extension toss|catch|partner toss|flat-ground toss|long-toss|long toss|warm-up toss|warm-up throws/i;

/** Mound/circle/shortbox work: a counted pitch row off flat ground, or a counted row named for the mound. */
export function isMoundWork(d: Row): boolean {
  if (!d.armEvent) return false;
  if (d.armEvent.kind === 'pitch' && d.pitchTags?.moundType) return d.pitchTags.moundType !== 'flat_ground';
  return MOUND.test(d.name ?? '') && !/flat[- ]ground/i.test(d.name ?? '');
}
export const isPullDown = (d: Row) => d.eassCategory === 'pulldown' || PULL.test(d.name ?? '');
/** Counted catch play (not a pitch, not a pull-down, not mound work). */
export const isCatchPlay = (d: Row) => !!d.armEvent && d.armEvent.kind !== 'pitch' && !isPullDown(d) && !isMoundWork(d) && d.stage !== 'full_go' && CATCH.test(d.name ?? '');

/** The published full pitcher catch-play warm-up as plan rows (Throwing card). */
export function fullPitcherWarmupRows(sport: 'baseball' | 'softball'): Row[] {
  return pitcherIntervalWarmup(sport).map((r) => ({
    name: r.name, dosage: `${r.throws} throws at ${r.distanceFt} ft`, stage: 'prep', armCard: 'throwing', eassCategory: r.part === 'pull_down' ? 'pulldown' : 'catch_play',
    armEvent: { kind: r.part === 'pull_down' ? 'long_toss' : 'warmup', count: r.throws, intent: r.intent, estimated: false }, fullPitcherWarmup: true,
  }));
}

export interface MoundGateInput {
  sport: 'baseball' | 'softball'; role: ThrowRole; age: number | null; date: string; history?: PlanningArmHistory;
  lowReadiness: boolean; armProtected: boolean; buildUp: boolean;
}

/** Arm units still free today after every counted row already on the day. */
export function armRoomLeft(blocks: readonly Block[], i: Pick<MoundGateInput, 'role' | 'age' | 'date' | 'history' | 'sport'>): number {
  if (!i.history || i.history.unavailable || i.age === null) return 0;
  const budget = armBudget(i as Parameters<typeof armBudget>[0]);
  const by = equivalentsByDay((i.history.rows ?? []).filter((r) => r.entry_date <= i.date));
  const since = new Date(Date.parse(i.date) - 6 * 86400000).toISOString().slice(0, 10);
  const room = Math.max(0, Math.min(budget.daily - (by.get(i.date) ?? 0), budget.weekly - [...by].filter(([d]) => d >= since).reduce((n, [, v]) => n + v, 0)));
  const used = blocks.filter((b) => b.status === 'ready').flatMap((b) => b.drills).reduce((n, d) => n + (d.armEvent ? throwUnits([d.armEvent]) : 0), 0);
  return room - used;
}

export function pitcherMoundGate<T extends Block>(blocks: readonly T[], i: MoundGateInput): T[] {
  const arm = (b: T) => b.status === 'ready' && (b.modality === 'pitching' || b.modality === 'throwing');
  const rows = blocks.filter(arm).flatMap((b) => b.drills);
  const wantsMound = rows.some(isMoundWork);
  const hasPull = rows.some(isPullDown);
  if (!wantsMound && !hasPull) return [...blocks];

  const ladder = fullPitcherWarmupRows(i.sport);
  const ladderCost = throwUnits(ladder.map((d) => d.armEvent!));
  const replacedCost = rows.filter((d) => isCatchPlay(d) || (i.sport === 'baseball' && isPullDown(d))).reduce((n, d) => n + throwUnits([d.armEvent!]), 0);
  const why = i.armProtected ? 'arm_protected' : i.lowReadiness ? 'low_readiness' : i.buildUp ? 'build_up' : null;
  const fits = !why && ladderCost <= armRoomLeft(blocks, i) + replacedCost;

  if (fits && wantsMound) {
    // Full warm-up: the published ladder replaces the short catch play; the ladder carries the pull-downs
    // (baseball) and softball keeps its overhand pull-downs right after it.
    let placed = false;
    const out = blocks.map((b) => {
      if (!arm(b)) return b;
      const kept = b.drills.filter((d) => !isCatchPlay(d) && !(i.sport === 'baseball' && isPullDown(d) && !d.fullPitcherWarmup));
      if (b.modality === 'throwing' && !placed) { placed = true; return { ...b, drills: [...ladder, ...kept] as unknown as T['drills'] }; }
      return { ...b, drills: kept as T['drills'] };
    });
    if (!placed) {
      const pi = out.findIndex((b) => arm(b));
      out[pi] = { ...out[pi], drills: [...ladder, ...out[pi].drills] as unknown as T['drills'] };
    }
    return out;
  }

  // Reduced catch play (or no mound work but stray pull-downs): no pull-downs, no mound work.
  const reason = REASON_BY[why ?? 'budget'];
  const dry: Row = { name: 'Dry mechanics — no-ball deliveries on flat ground', dosage: '2 x 8 slow deliveries', stage: 'drills', armCard: 'pitching', eassCategory: 'dry_mechanics' };
  return blocks.map((b) => {
    if (!arm(b)) return b;
    const kept = b.drills.filter((d) => !isPullDown(d) && !isMoundWork(d));
    if (kept.length === b.drills.length) return b;
    const drills = b.modality === 'pitching' && !kept.some((d) => d.eassCategory === 'dry_mechanics') ? [...kept, dry] : kept;
    return { ...b, drills: drills as T['drills'], because: [...(b.because ?? []).filter((x) => x !== reason), reason] };
  });
}
