import { describe, expect, it } from 'vitest';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import { accessiblePlanFaults } from '../planAnalysisAccess';
import { priorityAccess } from '../priorityAccess';
import { planFaultContext } from '@/lib/prescription/planFaultContext';
import { applyFaultPlanInfluence } from '@/lib/prescription/applyFaultPlanInfluence';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';
import type { RankedFault } from '@/lib/wic/faultLedger/ranking';
import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';

const gear = ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball'];
function context(sport: string, position: string, phase: string, extra: Record<string, unknown> = {}): HammerAthleteContext {
  const values = { sport_primary: sport, position_primary: position, lifecycle_band: 'u18', season_phase: phase,
    lifting_age_years: 2, weekly_availability_days: 6, development_priorities: ['hitting', 'defense'],
    injury_history: [], equipment_effective: gear, ...extra };
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}

describe('AR4: six subscription-qualified eight-week actual-builder cohorts (not hosted phone acceptance)', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const tier of ['pitcher', '5tool', 'golden2way'] as const) {
    const other = sport === 'baseball' ? 'softball' : 'baseball';
    const modules = [`${sport}_${tier}`];
    const expected = { hasPitching: tier !== '5tool', hasHitting: tier !== 'pitcher', hasThrowing: tier !== 'pitcher' };
    const position = tier === 'pitcher' ? 'P' : 'SS';
    it(`${sport}/${tier}: exact access, actual changes, clean resolution, schedule, pain and lifting invariance`, () => {
      expect(priorityAccess(modules, sport)).toEqual(expected);
      expect(priorityAccess([`${other}_golden2way`], sport)).toEqual({ hasPitching: false, hasHitting: false, hasThrowing: false });
      let swaps = 0, practiceDays = 0, protectedDays = 0, scheduledProtectedDays = 0;
      for (let n = 0; n < 56; n++) {
        const date = new Date(2026, 5, 1 + n);
        const phase = n < 28 ? 'off' : 'in';
        const make = (extra = {}) => context(sport, position, phase, extra);
        const base = buildHammerDailyPlan(make(), NORMAL_SIGNAL, null, null, undefined, date);
        const observed = date.toISOString();
        const signal = { id: 'signal', user_id: 'test', source: 'video_analysis' as const, fault_key: 'front_shoulder_opens_early',
          root_pattern_id: 'trunk_rotates_before_front_foot_plant', discipline: 'hitting' as const, confidence: 0.7,
          sample_size: 1, severity: 0.46, evidence: 'Fixture finding', observed_at: observed };
        const finding = { id: 'finding', user_id: 'test', sport, skill_domain: 'hitting', fault_key: signal.fault_key,
          root_pattern_key: signal.root_pattern_id, created_at: observed, video_id: 'video' };
        const clip = { video_id: 'video', user_id: 'test', sport, module: 'hitting', created_at: observed, violations: null };
        const scoped = planFaultContext([signal], [finding], [clip], 'test', sport, date.getTime());
        const drill: EliteDrill = { id: 'fixture-hit', name: 'Fixture hitting fix', category: 'hitting', sports: [sport],
          subSkill: 'Sequence', level: 'feel', fixes: 'Fixture finding', setup: 'Open space', steps: ['Move'], cues: ['Reset'],
          dosage: '999 swings', equipment: [], violationKeys: [signal.fault_key], pieV2Signals: [], movementPatterns: [] };
        const apply = (ranked: readonly RankedFault[]) => applyFaultPlanInfluence({ blocks: base.blocks,
          rankedFaults: accessiblePlanFaults(ranked, modules, sport), signalScopes: scoped.signalScopes, sport,
          ownedEquipment: new Set(gear), catalog: [drill], circulation: { servedToUser: {}, usage: {} }, now: date });
        const next = apply(scoped.rankedFaults);
        expect(next).toHaveLength(base.blocks.length);
        next.forEach((block, index) => {
          const before = base.blocks[index];
          expect(block.durationMin).toBe(before.durationMin);
          expect(block.status).toBe(before.status);
          expect(block.drills.map(row => row.dosage)).toEqual(before.drills.map(row => row.dosage));
          if (block.modality !== 'hitting' || !expected.hasHitting) expect(block).toEqual(before);
          const changes = block.drills.filter((row, i) => row.name !== before.drills[i]?.name);
          expect(changes.length).toBeLessThanOrEqual(1);
          swaps += changes.length;
          before.drills.forEach((row, i) => { if (row.stage === 'prep' || row.stage === 'full_go' || row.stage === 'log' || row.prescriptionOrigin === 'owner') expect(block.drills[i]).toEqual(row); });
        });
        const clean = [1, 2].map(i => ({ ...clip, video_id: `clean-${i}`,
          created_at: new Date(date.getTime() + i * 86400000).toISOString(), violations: { [signal.fault_key]: false } }));
        const resolved = planFaultContext([signal], [finding], [clip, ...clean], 'test', sport, date.getTime() + 2 * 86400000);
        expect(apply(resolved.rankedFaults).map(block => block.drills)).toEqual(base.blocks.map(block => block.drills));
        const records = [1, 2, 3].map(i => ({ id: `practice-${i}`, date: new Date(date.getTime() - i * 86400000).toISOString().slice(0, 10), sport, category: 'hitting', minutes: 60, intensity: 8 }));
        const practiced = buildHammerDailyPlan(make(), NORMAL_SIGNAL, null, null, undefined, date, { practiceRecords: records });
        const wrongSport = buildHammerDailyPlan(make(), NORMAL_SIGNAL, null, null, undefined, date, { practiceRecords: records.map(row => ({ ...row, sport: other })) });
        expect(wrongSport.blocks).toEqual(base.blocks);
        practiced.blocks.forEach((block, i) => {
          expect(block.drills).toEqual(base.blocks[i].drills);
          expect(block.durationMin).toBe(base.blocks[i].durationMin);
          if (block.modality !== 'hitting') expect(block).toEqual(base.blocks[i]);
          if (block.because?.some(line => line.includes('3 hitting practice days'))) practiceDays++;
        });
        const protectedPlan = buildHammerDailyPlan(make({ injury_history: ['knee'], readiness: 0.3 }), NORMAL_SIGNAL, null, null, undefined, date);
        const run = protectedPlan.blocks.find(block => block.modality === 'baserunning');
        expect(run?.drills.some(row => row.stage === 'full_go')).toBe(false);
        expect(run).toBeDefined();
        if (run?.status === 'ready') {
          expect(run.drills.map(row => row.dosage)).toEqual(['10 min', '10 reps']);
          scheduledProtectedDays++;
        }
        protectedDays++;
        const tapered = buildHammerDailyPlan(make(), { ...NORMAL_SIGNAL, postureToday: 'taper', isGameTomorrow: true }, null, null, undefined, date);
        tapered.blocks.filter(block => block.modality === 'defense' || block.modality === 'baserunning')
          .forEach(block => expect(block.drills.some(row => row.stage === 'full_go')).toBe(false));
      }
      if (expected.hasHitting) expect(swaps).toBeGreaterThan(0);
      else expect(swaps).toBe(0);
      expect(practiceDays).toBeGreaterThan(0);
      expect(protectedDays).toBe(56);
      expect(scheduledProtectedDays).toBeGreaterThan(0);
    });
    it(`${sport}/${tier}: unentitled priorities and fades cannot crowd out eligible analysis slots`, () => {
      const ranked = (discipline: RankedFault['signals'][number]['discipline']): RankedFault => ({ rootPatternId: discipline,
        family: null, score: 1, sources: ['video_analysis'], disciplines: [discipline], totalSampleSize: 1,
        latestObservedAt: '2026-06-01', says: 'Fixture', fades: [], clearedByCleanClips: false,
        signals: [{ id: discipline, user_id: 'test', source: 'video_analysis', discipline, fault_key: discipline,
          root_pattern_id: discipline, confidence: 0.7, sample_size: 1, severity: 0.46, evidence: '', observed_at: '2026-06-01' }] });
      const input = (['hitting', 'pitching', 'throwing', 'fielding', 'running'] as const).map(ranked);
      const allowed = tier === 'pitcher' ? ['pitching'] : tier === '5tool' ? ['hitting', 'throwing', 'fielding', 'running'] : ['hitting', 'pitching', 'throwing', 'fielding', 'running'];
      expect(accessiblePlanFaults(input, modules, sport).flatMap(row => row.signals.map(s => s.discipline)).sort()).toEqual([...allowed].sort());
      expect(accessiblePlanFaults(input, [`${other}_golden2way`], sport)).toEqual([]);
    });
  }
});

describe('AT1: ranked weekly skill blocks through the actual builder, both sports over eight weeks', () => {
  for (const sport of ['baseball', 'softball']) {
    it(`${sport}: changing top goal changes scheduled blocks and second-goal slots without changing lifting`, () => {
      const ranked = (order: string[]) => ({ version: 1, updatedAt: '2026-10-20',
        goals: order.map((category, i) => ({ category, rank: i + 1, intent: null })) });
      let baselineHitting = 0, goalHitting = 0, sharedFieldingFirst = 0;
      for (let n = 0; n < 56; n++) {
        const today = new Date(2026, 5, 7 + n);
        const make = (goals?: unknown) => context(sport, 'SS', 'off', {
          lifecycle_band: 'adult', ...(goals ? { category_goals: goals } : {}),
        });
        const base = buildHammerDailyPlan(make(), NORMAL_SIGNAL, null, null, undefined, today);
        const next = buildHammerDailyPlan(make(ranked(['hitting', 'fielding', 'throwing', 'speed', 'power'])), NORMAL_SIGNAL, null, null, undefined, today);
        baselineHitting += Number(base.microcycle.perModality.hitting.scheduled);
        goalHitting += Number(next.microcycle.perModality.hitting.scheduled);
        for (const modality of ['hitting', 'throwing', 'defense', 'baserunning'] as const) {
          if (base.microcycle.perModality[modality].scheduled) expect(next.microcycle.perModality[modality].scheduled).toBe(true);
        }
        const beforeLift = base.blocks.find(b => b.modality === 'strength');
        const afterLift = next.blocks.find(b => b.modality === 'strength');
        expect(afterLift?.drills).toEqual(beforeLift?.drills);
        expect(afterLift?.durationMin).toBe(beforeLift?.durationMin);
        expect(afterLift?.status).toBe(beforeLift?.status);
        expect(afterLift?.stopRules).toEqual(beforeLift?.stopRules);
        expect(next.microcycle.perModality.strength).toEqual(base.microcycle.perModality.strength);
        const skills = next.blocks.filter(b => b.status === 'ready' && ['hitting', 'defense', 'throwing', 'baserunning'].includes(b.modality));
        if (skills.some(b => b.modality === 'defense') && skills.length > 1) {
          expect(skills[0].modality).toBe('defense'); sharedFieldingFirst++;
        }
      }
      expect(goalHitting - baselineHitting).toBe(8);
      expect(sharedFieldingFirst).toBeGreaterThan(0);
    });
  }
});

describe('AT4: subscription-qualified ranked goals through actual daily plans', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const tier of ['pitcher', '5tool', 'golden2way'] as const) {
    it(`${sport}/${tier}: eight weeks of actual slots preserve baselines and lifting; only included goals add eight slots`, () => {
      const modules = [`${sport}_${tier}`];
      const other = sport === 'baseball' ? 'softball' : 'baseball';
      const totals = { baseHit: 0, hit: 0, baseField: 0, field: 0, wrongHit: 0, emptyHit: 0 };
      let shared = 0;
      const ranked = (order: string[]) => ({ version: 1, updatedAt: '2026-10-20',
        goals: order.map((category, index) => ({ category, rank: index + 1, intent: null })) });
      for (let n = 0; n < 56; n++) {
        const today = new Date(2026, 5, 7 + n);
        const make = (order?: string[]) => context(sport, tier === 'pitcher' ? 'P' : 'SS', 'off', {
          lifecycle_band: 'adult', ...(order ? { category_goals: ranked(order) } : {}),
        });
        const build = (order?: string[], subscriptionModules = modules) => buildHammerDailyPlan(
          make(order), NORMAL_SIGNAL, null, null, undefined, today, { subscriptionModules });
        const hitOrder = ['hitting', 'fielding', 'throwing', 'speed', 'power'];
        const base = build();
        const hit = build(hitOrder);
        const field = build(['fielding', 'hitting', 'throwing', 'speed', 'power']);
        const wrong = build(hitOrder, [`${other}_golden2way`]);
        const empty = build(hitOrder, []);
        totals.baseHit += Number(base.microcycle.perModality.hitting.scheduled);
        totals.hit += Number(hit.microcycle.perModality.hitting.scheduled);
        totals.baseField += Number(base.microcycle.perModality.defense.scheduled);
        totals.field += Number(field.microcycle.perModality.defense.scheduled);
        totals.wrongHit += Number(wrong.microcycle.perModality.hitting.scheduled);
        totals.emptyHit += Number(empty.microcycle.perModality.hitting.scheduled);
        for (const next of [hit, field, wrong, empty]) {
          for (const modality of ['hitting', 'throwing', 'defense', 'baserunning'] as const) {
            if (base.microcycle.perModality[modality].scheduled) expect(next.microcycle.perModality[modality].scheduled).toBe(true);
          }
          expect(next.microcycle.perModality.strength).toEqual(base.microcycle.perModality.strength);
          const beforeLift = base.blocks.find(b => b.modality === 'strength');
          const afterLift = next.blocks.find(b => b.modality === 'strength');
          expect(beforeLift).toBeDefined();
          expect(afterLift?.drills).toEqual(beforeLift?.drills);
          expect(afterLift?.durationMin).toBe(beforeLift?.durationMin);
          expect(afterLift?.status).toBe(beforeLift?.status);
          expect(afterLift?.stopRules).toEqual(beforeLift?.stopRules);
        }
        if (tier !== 'pitcher' && !base.microcycle.perModality.hitting.scheduled && hit.microcycle.perModality.hitting.scheduled) {
          expect(hit.microcycle.perModality.hitting.intensity).toBe('activation');
          expect(hit.blocks.find(b => b.modality === 'hitting')?.status).toBe('ready');
        }
        if (tier !== 'pitcher') {
          const ready = hit.blocks.filter(b => b.status === 'ready' && ['hitting', 'defense', 'throwing', 'baserunning'].includes(b.modality));
          if (ready.length > 1 && ready.some(b => b.modality === 'defense')) {
            expect(ready[0].modality).toBe('defense'); shared++;
          }
        }
      }
      expect(totals.hit - totals.baseHit).toBe(tier === 'pitcher' ? 0 : 8);
      expect(totals.field - totals.baseField).toBe(tier === 'pitcher' ? 0 : 8);
      expect(totals.wrongHit).toBe(totals.baseHit);
      expect(totals.emptyHit).toBe(totals.baseHit);
      if (tier !== 'pitcher') expect(shared).toBeGreaterThan(0);
    });
  }
});