import { describe, expect, it, vi } from 'vitest';
import { planSnapshotPayload } from './planSnapshot';
import { buildHammerDailyPlan } from './prescription/dailyPlan';
import { NORMAL_SIGNAL } from './prescription/scheduleContext';
import type { ContextVariable, HammerAthleteContext } from './context/athleteContext';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const values = { sport_primary: 'softball', position_primary: 'SS', lifecycle_band: 'adult', season_phase: 'off',
  lifting_age_years: 2, weekly_availability_days: 6, equipment_effective: ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball'], injury_history: [] };
const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key, domain: 'identity',
  source: 'test', confidence: 'high', missing: false, lastUpdated: null, lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
const ctx: HammerAthleteContext = { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
  get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };

describe('final athlete plan snapshot', () => {
  it('preserves final skill stages, dose, cue and exact Because after overlays without reconstructing a plan', () => {
    const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 9, 19));
    const hitting = plan.blocks.find(block => block.modality === 'hitting');
    expect(hitting?.status).toBe('ready');
    if (!hitting) throw new Error('Expected actual builder hitting block');
    const because = ['TEST entered practice is the source'];
    const final = { ...plan, blocks: [{ ...hitting, because }] };
    const saved = planSnapshotPayload(final, 'softball', '2026-10-19');
    expect(saved.sport).toBe('softball');
    expect(saved.plan_date).toBe('2026-10-19');
    expect(saved.blocks).toHaveLength(1);
    expect(saved.blocks[0].because).toEqual(because);
    expect(saved.blocks[0].roadmapReason).toBe(hitting.roadmapReason);
    expect(saved.blocks[0].durationMin).toBe(hitting.durationMin);
    expect(saved.blocks[0].drills.map(drill => [drill.name, drill.dosage, drill.stage, drill.cue])).toEqual(
      hitting.drills.map(drill => [drill.name, drill.dosage, drill.stage ?? null, drill.cue ?? null]));
    expect(saved.blocks[0].drills.some(drill => drill.stage === 'full_go')).toBe(true);
    expect(saved.blocks[0].drills.some(drill => drill.stage === 'log')).toBe(true);
  });
  it('does not invent work when the final plan has no blocks', () => {
    const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 9, 19));
    expect(planSnapshotPayload({ ...plan, blocks: [] }, 'softball', '2026-10-19').blocks).toEqual([]);
  });
  it('round-trips the saved speed mix without changing the original seven-rep slot', () => {
    const plan = buildHammerDailyPlan(ctx, NORMAL_SIGNAL, null, null, undefined, new Date(2026, 9, 19));
    const block = plan.blocks[0];
    if (!block) throw new Error('Expected a builder block');
    const mix = [{ slug: 'swap_short_acceleration', name: 'Short-space accelerations', category: 'speed' as const, intent: 'acceleration' as const, reps: 4, distanceYards: 15, restSeconds: 120 },
      { slug: 'swap_hill_acceleration', name: 'Hill accelerations', category: 'speed' as const, intent: 'acceleration' as const, reps: 3, distanceYards: 15, restSeconds: 120 }];
    const saved = planSnapshotPayload({ ...plan, blocks: [{ ...block, modality: 'speed', drills: [{ name: 'Acceleration mix', slug: 'swap_acceleration_mix', dosage: '7 x 10 yards @ 100%', speedMix: mix }] }] }, 'softball', '2026-10-19');
    const roundTrip = JSON.parse(JSON.stringify(saved));
    expect(roundTrip.blocks[0].drills[0].speedMix).toEqual(mix);
    expect(roundTrip.blocks[0].drills[0].dosage).toBe('7 x 10 yards @ 100%');
  });
});