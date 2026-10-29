/**
 * Scheduling certification — every program, both sports, four age levels,
 * eight weeks (four off-season, four in-season) through the real shared daily
 * builder. Writes a plain summary to /tmp/scheduling-cert.json for the owner
 * certification sheet. Physical-plan rules (lifting, Power Primer numbers,
 * conditioning routes, arm ledger) live in the server builder and are not
 * exercised here.
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildHammerDailyPlan } from './dailyPlan';
import { NORMAL_SIGNAL } from './scheduleContext';
import { dailyMindItem } from '../week/weeklyVolume';
import type { ContextVariable, HammerAthleteContext } from '@/lib/hammer/context/athleteContext';

const gear = ['tee', 'gamer_bat', 'net', 'field', 'glove', 'ball', 'open_space'];
const LEVELS = {
  youth: { lifecycle_band: 'u12', age_years: 11, lifting_age_years: 0 },
  high_school: { lifecycle_band: 'u18', age_years: 16, lifting_age_years: 2 },
  college: { lifecycle_band: 'adult', age_years: 20, lifting_age_years: 4 },
  pro: { lifecycle_band: 'adult', age_years: 26, lifting_age_years: 8 },
} as const;
const SKILLS = ['hitting', 'defense', 'baserunning', 'throwing', 'pitching'] as const;

function context(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: 'identity', source: 'test', confidence: 'high', missing: false, lastUpdated: null,
    lineage: { owner: 'test', source: 'test', rawConfidence: 'high' } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find(row => row.key === key) as ContextVariable<T> | undefined; } };
}
const ready = (b: { status: string; drills: readonly unknown[] }) => b.status === 'ready' && b.drills.length > 0;

const report: Record<string, unknown> = {};

describe('Scheduling certification: 6 programs × 4 levels × 8 weeks', () => {
  for (const sport of ['baseball', 'softball'] as const) for (const tier of ['pitcher', '5tool', 'golden2way'] as const) for (const [level, lv] of Object.entries(LEVELS)) {
    it(`${sport}/${tier}/${level}`, () => {
      const modules = [`${sport}_${tier}`];
      const position = tier === 'pitcher' ? 'P' : 'SS';
      const weeks: Array<Record<string, number>> = [];
      const sample: string[] = [];
      const problems: string[] = [];
      for (let w = 0; w < 8; w++) {
        const counts: Record<string, number> = { trainingDays: 0, restDays: 0 };
        for (let d = 0; d < 7; d++) {
          const date = new Date(2026, 5, 1 + w * 7 + d); // Mon Jun 1 2026
          const phase = w < 4 ? 'off' : 'in';
          const make = (extra: Record<string, unknown> = {}) => context({ sport_primary: sport, position_primary: position,
            season_phase: phase, weekly_availability_days: 6, injury_history: [], equipment_effective: gear,
            development_priorities: ['hitting', 'defense'], ...lv, ...extra });
          const plan = buildHammerDailyPlan(make(), NORMAL_SIGNAL, null, null, undefined, date, { subscriptionModules: modules, resolvedSeasonPhase: phase });
          const blocks = plan.blocks;
          const skillReady = blocks.filter(b => (SKILLS as readonly string[]).includes(b.modality) && ready(b));
          const sunday = date.getDay() === 0;
          if (sunday) {
            counts.restDays++;
            if (skillReady.length) problems.push(`week ${w + 1} Sunday has ${skillReady.map(b => b.modality).join(', ')}`);
          } else if (skillReady.length) counts.trainingDays++;
          else problems.push(`week ${w + 1} ${date.toDateString()} is thin (no skill work)`);
          for (const b of skillReady) counts[b.modality] = (counts[b.modality] ?? 0) + 1;
          // Spill-over: skills not bought never appear as training.
          // Complete Pitcher still receives the generic hitting card today; recorded
          // for the owner's decision, not silently changed for every pitcher customer.
          if (tier === 'pitcher' && skillReady.some(b => b.modality === 'hitting')) counts.pitcherHittingCards = (counts.pitcherHittingCards ?? 0) + 1;
          if (tier === '5tool' && skillReady.some(b => b.modality === 'pitching')) problems.push(`5Tool got pitching ${date.toDateString()}`);
          // Order of the day: warm-up first, recovery last.
          const ordered = blocks.filter(ready).map(b => b.modality);
          if (ordered.length && ordered[0] !== 'warmup') problems.push(`${date.toDateString()} starts with ${ordered[0]}`);
          const recIdx = ordered.indexOf('recovery');
          if (recIdx >= 0 && recIdx !== ordered.length - 1 && ordered.slice(recIdx + 1).some(m => (SKILLS as readonly string[]).includes(m))) problems.push(`${date.toDateString()} has skill work after recovery`);
          // Readiness: a low check-in removes full-speed (full-go) work.
          const low = buildHammerDailyPlan(make({ readiness: 0.2 }), NORMAL_SIGNAL, null, null, undefined, date, { subscriptionModules: modules, resolvedSeasonPhase: phase });
          if (low.blocks.some(b => ['defense', 'baserunning'].includes(b.modality) && b.drills.some(r => r.stage === 'full_go'))) problems.push(`${date.toDateString()} low readiness kept full-speed work`);
          // Mind item every day.
          const mind = dailyMindItem(w * 7 + d, false);
          if (!mind?.kind) problems.push(`${date.toDateString()} has no Mind item`);
          if (w === 0 || w === 4) sample.push(`${date.toDateString().slice(0, 3)}: ${sunday ? 'Rest — gentle recovery' : skillReady.map(b => b.modality).join(', ')} · Mind: ${mind.kind}`);
        }
        weeks.push(counts);
        if (counts.trainingDays !== 6) problems.push(`week ${w + 1} has ${counts.trainingDays} training days`);
        if (tier !== 'pitcher') {
          if ((counts.hitting ?? 0) < 3) problems.push(`week ${w + 1} hitting ${counts.hitting ?? 0}/3`);
          if ((counts.defense ?? 0) < 4) problems.push(`week ${w + 1} defense ${counts.defense ?? 0}/4`);
          if ((counts.baserunning ?? 0) < 1) problems.push(`week ${w + 1} baserunning ${counts.baserunning ?? 0}/1`);
        }
      }
      report[`${sport}/${tier}/${level}`] = { weeks, sample, problems };
      writeFileSync('/tmp/scheduling-cert.json', JSON.stringify(report, null, 1));
      expect(problems).toEqual([]);
    });
  }
});
