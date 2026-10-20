import { describe, expect, it } from 'vitest';
import { rankFaults, type FaultSignal } from '@/lib/wic/faultLedger/ranking';
import { accessiblePlanFaults } from './planAnalysisAccess';

const now = Date.parse('2026-10-20T12:00:00Z');
const hit: FaultSignal = { id: 'hit', user_id: 'u', source: 'video_analysis', discipline: 'hitting',
  fault_key: 'front_shoulder_opens_early', root_pattern_id: 'shared', confidence: .2, severity: .2,
  sample_size: 1, evidence: 'Hitting finding', observed_at: '2026-10-19T12:00:00Z' };
const pitch: FaultSignal = { ...hit, id: 'pitch', discipline: 'pitching', confidence: 1, severity: 1,
  sample_size: 20, evidence: 'Pitching finding', observed_at: '2026-10-20T12:00:00Z' };

describe('subscription-qualified canonical ranking', () => {
  for (const sport of ['baseball', 'softball'] as const) {
    it(`${sport}: removed pitching evidence cannot inflate hitting score, sample or wording`, () => {
      const input = rankFaults([hit, pitch], now);
      const result = accessiblePlanFaults(input, [`${sport}_5tool`], sport, { now, clips: [] });
      expect(result).toEqual(rankFaults([hit], now));
      expect(result[0].totalSampleSize).toBe(1);
      expect(result[0].signals).toEqual([hit]);
    });
    it(`${sport}: ranking reorders after forbidden evidence is removed`, () => {
      const other = { ...hit, id: 'other', root_pattern_id: 'other', confidence: .7, severity: .7 };
      const result = accessiblePlanFaults(rankFaults([hit, pitch, other], now), [`${sport}_5tool`], sport, { now, clips: [] });
      expect(result.map(r => r.rootPatternId)).toEqual(['other', 'shared']);
    });
    it(`${sport}: eligible clean evidence controls clear state independently of pitching`, () => {
      const clips = [1, 2].map(i => ({ video_id: `clean-${i}`, module: 'hitting',
        created_at: `2026-10-20T0${i}:00:00Z`, violations: { [hit.fault_key]: false } }));
      const input = rankFaults([hit, pitch], now, clips);
      expect(input[0].clearedByCleanClips).toBe(false);
      expect(accessiblePlanFaults(input, [`${sport}_5tool`], sport, { now, clips })[0].clearedByCleanClips).toBe(true);
      expect(accessiblePlanFaults(input, [`${sport}_5tool`], sport)).toEqual([]);
    });
    it(`${sport}: Complete Pitcher keeps only pitching evidence and opposite-sport access grants nothing`, () => {
      const input = rankFaults([hit, pitch], now);
      expect(accessiblePlanFaults(input, [`${sport}_pitcher`], sport, { now, clips: [] })).toEqual(rankFaults([pitch], now));
      expect(accessiblePlanFaults(input, [`${sport === 'baseball' ? 'softball' : 'baseball'}_golden2way`], sport)).toEqual([]);
    });
  }
});