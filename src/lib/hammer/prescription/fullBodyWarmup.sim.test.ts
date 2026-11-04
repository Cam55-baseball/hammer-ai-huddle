import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import { WARMUP_LIBRARY, warmupCoverageIssues, type WarmupRole } from './warmupLibrary';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

const roleOf = new Map(WARMUP_LIBRARY.map(d => [d.slug, d.role as WarmupRole]));
function context(sport: string, position: string, phase: string, extra: Record<string, unknown> = {}): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: position, lifecycle_band: 'u18', season_phase: phase,
    lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['hitting', 'defense'],
    injury_history: [], equipment_effective: ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball'], ...extra };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}

describe('Dominant full-body warm-up — 8-week simulations (owner Nov 4 r2 #5)', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const tier of ['pitcher', '5tool', 'golden2way'] as const) {
    for (const injured of [false, true]) {
      it(`${sport}/${tier}${injured ? ' (shoulder injury)' : ''}: every training-day warm-up covers the whole body`, () => {
        let checked = 0;
        for (let n = 0; n < 56; n++) {
          const date = new Date(2026, 5, 1 + n);
          const extra = injured ? { injury_history: [{ region: 'shoulder', severity: 'moderate', participation: 'limited' }] } : {};
          const plan = buildHammerDailyPlan(context(sport, tier === 'pitcher' ? 'P' : 'SS', n < 28 ? 'off' : 'in', extra), NORMAL_SIGNAL, null, null, undefined, date);
          const wu = plan.blocks.find(b => b.modality === 'warmup');
          if (!wu || /recovery/i.test(wu.title ?? '')) continue;
          const roles = wu.drills.map(d => (d.slug?.startsWith('wu_tissue_prep') ? 'tissue_prep' : roleOf.get(d.slug ?? ''))).filter(Boolean).map(role => ({ role: role as WarmupRole }));
          expect({ date: date.toDateString(), issues: warmupCoverageIssues(roles) }).toEqual({ date: date.toDateString(), issues: [] });
          checked++;
        }
        expect(checked).toBeGreaterThan(30);
      });
    }
  }
});
