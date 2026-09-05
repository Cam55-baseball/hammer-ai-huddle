import { describe, it, expect } from 'vitest';
import {
  correlateRootPatterns,
  crossDomainCorrectionKeys,
  domainListSentence,
  type FaultFinding,
} from '../crossDomainFaults';
import { rootPatternForFault } from '../rootPatterns';

function f(over: Partial<FaultFinding>): FaultFinding {
  return {
    video_id: 'v1',
    skill_domain: 'hitting',
    fault_key: 'early_shoulder_rotation',
    movement_key: 'shoulders_turning_early',
    correction_key: 'keep_hands_back',
    root_pattern_key: 'trunk_rotates_before_front_foot_plant',
    evidence: 'your shoulders turned before the front foot landed',
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

describe('root pattern mapping', () => {
  it('maps the same underlying fault from different disciplines to one pattern', () => {
    expect(rootPatternForFault('early_shoulder_rotation')?.key).toBe(
      'trunk_rotates_before_front_foot_plant',
    );
    expect(rootPatternForFault('front_shoulder_opens_early')?.key).toBe(
      'trunk_rotates_before_front_foot_plant',
    );
    expect(rootPatternForFault('unknown_flag')).toBeNull();
  });
});

describe('correlateRootPatterns', () => {
  it('groups a pattern across domains and marks it cross-domain', () => {
    const groups = correlateRootPatterns([
      f({}),
      f({
        video_id: 'v2',
        skill_domain: 'throwing',
        correction_key: 'th_stay_online_finish',
        created_at: '2026-09-02T00:00:00Z',
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].crossDomain).toBe(true);
    expect(groups[0].domains.map((d) => d.domain).sort()).toEqual(['hitting', 'throwing']);
    expect(groups[0].correctionKeys.sort()).toEqual(['keep_hands_back', 'th_stay_online_finish']);
  });

  it('ranks a cross-domain pattern above a single-domain one', () => {
    const groups = correlateRootPatterns([
      f({ fault_key: 'hands_pass_elbow_early', root_pattern_key: 'hands_leak_forward_early' }),
      f({ fault_key: 'hands_pass_elbow_early', root_pattern_key: 'hands_leak_forward_early', video_id: 'v9' }),
      f({}),
      f({ video_id: 'v2', skill_domain: 'pitching', correction_key: 'bb_delay_trunk_rotation' }),
    ]);
    expect(groups[0].pattern.key).toBe('trunk_rotates_before_front_foot_plant');
    expect(groups[0].crossDomain).toBe(true);
  });

  it('never counts a domain as cleared without a newer analysis in that domain', () => {
    const groups = correlateRootPatterns([f({})]);
    expect(groups[0].domains[0].clearedInLatest).toBe(false);
    expect(groups[0].resolvedEverywhere).toBe(false);
  });

  it('marks resolution only when every affected domain has a newer clean analysis', () => {
    const findings = [
      f({}),
      f({ video_id: 'v2', skill_domain: 'throwing', created_at: '2026-09-02T00:00:00Z' }),
    ];
    const partial = correlateRootPatterns(
      findings,
      new Map([
        ['hitting', '2026-09-10T00:00:00Z'],
        ['throwing', '2026-09-02T00:00:00Z'],
      ]),
    );
    expect(partial[0].resolvedEverywhere).toBe(false);

    const full = correlateRootPatterns(
      findings,
      new Map([
        ['hitting', '2026-09-10T00:00:00Z'],
        ['throwing', '2026-09-11T00:00:00Z'],
      ]),
    );
    expect(full[0].resolvedEverywhere).toBe(true);
  });

  it('ignores findings with no root pattern', () => {
    expect(correlateRootPatterns([f({ root_pattern_key: null })])).toHaveLength(0);
  });

  it('only exposes correction keys from unresolved cross-domain patterns', () => {
    const groups = correlateRootPatterns([f({})]);
    expect(crossDomainCorrectionKeys(groups)).toEqual([]);
  });

  it('writes a readable domain list', () => {
    expect(domainListSentence(['hitting', 'throwing'])).toBe('hitting and throwing');
    expect(domainListSentence(['hitting', 'pitching', 'throwing'])).toBe(
      'hitting, pitching and throwing',
    );
  });
});
