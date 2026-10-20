import { describe, expect, it } from 'vitest';
import { planFaultContext, type PlanFinding, type PlanClip } from './planFaultContext';
import type { FaultSignal } from '@/lib/wic/faultLedger/ranking';
const date = '2026-10-20T00:00:00Z';
const signal: FaultSignal = { id: 's', user_id: 'u', source: 'video_analysis', discipline: 'hitting',
  fault_key: 'front_shoulder_opens_early', root_pattern_id: 'root', confidence: .7, severity: .46,
  sample_size: 1, evidence: 'Front shoulder opened early', observed_at: date };
const finding: PlanFinding = { id: 'f', user_id: 'u', sport: 'baseball', skill_domain: 'hitting',
  fault_key: signal.fault_key, root_pattern_key: 'root', created_at: date, video_id: 'v' };
const clip: PlanClip = { video_id: 'v', user_id: 'u', sport: 'baseball', module: 'hitting', created_at: date, violations: null };
const run = (s: FaultSignal[] = [signal], f: PlanFinding[] = [finding], c: PlanClip[] = [clip]) =>
  planFaultContext(s, f, c, 'u', 'baseball', Date.parse(date));
describe('canonical plan fault provenance', () => {
  it('uses a complete same-sport identity and retains ledger confidence and severity', () => {
    const result = run();
    expect(result.rankedFaults[0]?.signals[0]).toEqual(signal);
    expect(result.signalScopes).toEqual({ s: { sport: 'baseball', module: 'hitting' } });
  });
  it('does not scope a cross-sport aggregate even when its latest report is selected sport', () => {
    expect(run([{ ...signal, sample_size: 2 }], [finding, { ...finding, id: 'f2', video_id: 'v2', sport: 'softball' }]).rankedFaults).toEqual([]);
  });
  it('requires complete ledger sample accounting, not a similar fault text', () => {
    expect(run([{ ...signal, sample_size: 2 }]).rankedFaults).toEqual([]);
    expect(run([signal], [{ ...finding, root_pattern_key: 'other' }]).rankedFaults).toEqual([]);
  });
  it('rejects duplicate analysis runs of one video', () => {
    expect(run([{ ...signal, sample_size: 2 }], [finding, { ...finding, id: 'rerun' }]).rankedFaults).toEqual([]);
  });
  it('requires owned completed same-module clips and exact latest observation', () => {
    for (const bad of [{ ...clip, user_id: 'other' }, { ...clip, module: 'pitching' }, { ...clip, sport: null }]) {
      expect(run([signal], [finding], [bad]).rankedFaults).toEqual([]);
    }
    expect(run([{ ...signal, observed_at: '2026-10-19T00:00:00Z' }]).rankedFaults).toEqual([]);
  });
  it('only explicit same-sport clean clips clear a finding', () => {
    const clean = [21, 22].map(day => ({ ...clip, video_id: `c${day}`, created_at: `2026-10-${day}T00:00:00Z`, violations: { [signal.fault_key]: false } }));
    expect(run([signal], [finding], [clip, ...clean]).rankedFaults[0]?.clearedByCleanClips).toBe(true);
    expect(run([signal], [finding], [clip, ...clean.map(c => ({ ...c, sport: 'softball' }))]).rankedFaults[0]?.clearedByCleanClips).toBe(false);
  });
  it('supports exact own-category fielding and baserunning scope', () => {
    for (const discipline of ['fielding', 'running'] as const) {
      const module = discipline === 'running' ? 'baserunning' : 'fielding';
      expect(run([{ ...signal, discipline }], [{ ...finding, skill_domain: discipline }], [{ ...clip, module }]).signalScopes.s?.module).toBe(module);
    }
  });
});