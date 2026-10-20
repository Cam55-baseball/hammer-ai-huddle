import { describe, expect, it } from 'vitest';
import { OWNER_QUESTIONS, currentQuestionAnswer, questionSituation } from './ownerQuestions';
import type { PrincipleVersion } from './principles';
const question = OWNER_QUESTIONS[0];
const version: PrincipleVersion = { id: 'v', principle_id: 'p', version: 1, body: 'Keep current dose',
  sport: question.sport, area: question.area, situation: questionSituation(question.id), applies_when: null,
  not_when: null, connected_work: null, evidence_kind: 'experience', evidence_note: null, created_at: '2026-10-20T00:00:00Z' };
const principle = { id: 'p', active: true, current_version: 1 };
describe('owner question current-version identity', () => {
  it('has six distinct sport/subscription identities', () => {
    expect(OWNER_QUESTIONS).toHaveLength(6);
    expect(new Set(OWNER_QUESTIONS.map(q => questionSituation(q.id))).size).toBe(6);
  });
  it('reads only the declared current version, not the highest unrelated history number', () => {
    expect(currentQuestionAnswer(question, [principle], [version, { ...version, id: 'future', version: 9 }])?.version.id).toBe('v');
  });
  it('does not resurrect a historical answer after its situation changed', () => {
    expect(currentQuestionAnswer(question, [{ ...principle, current_version: 2 }], [version, { ...version, version: 2, situation: 'Other' }])).toBeNull();
  });
  it('preserves explicit off status rather than claiming an answer is in use', () => {
    expect(currentQuestionAnswer(question, [{ ...principle, active: false }], [version])?.principle.active).toBe(false);
  });
  it('rejects duplicate principles, duplicate current versions and wrong sport or area', () => {
    expect(currentQuestionAnswer(question, [principle, { ...principle, id: 'p2' }], [version, { ...version, principle_id: 'p2' }])).toBeNull();
    expect(currentQuestionAnswer(question, [principle], [version, { ...version, id: 'duplicate' }])).toBeNull();
    expect(currentQuestionAnswer(question, [principle], [{ ...version, sport: 'both' }])).toBeNull();
    expect(currentQuestionAnswer(question, [principle], [{ ...version, area: 'mindset' }])).toBeNull();
  });
});