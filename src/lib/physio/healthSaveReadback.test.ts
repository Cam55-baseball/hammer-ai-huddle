import { describe, expect, it } from 'vitest';
import { healthSaveConfirmed } from './healthSaveReadback';

// Exact payload shapes the guided health setup sends (PhysioHealthIntakeDialog.save)
const sentAt = '2026-11-06T13:58:12.345Z';
const dbAt = '2026-11-06T13:58:12.345+00:00';

describe('guided health setup save readback', () => {
  it('adult with all optional answers confirms when the database rewrites the timestamp format', () => {
    const sent = { allergies: ['peanuts'], food_intolerances: ['dairy'], medications: ['albuterol'], meals_per_day: 4, setup_completed: true,
      current_pain_answer: true, current_pain_area: 'knee', current_pain_reviewed_at: sentAt, injury_history: ['ankle: sprain last year'] };
    expect(healthSaveConfirmed(sent, { ...sent, current_pain_reviewed_at: dbAt, id: 'x' })).toBe(true);
  });
  it('under-18 with no optional answers confirms', () => {
    const sent = { allergies: [], food_intolerances: [], medications: [], meals_per_day: null, setup_completed: true,
      current_pain_answer: false, current_pain_area: null, current_pain_reviewed_at: sentAt };
    expect(healthSaveConfirmed(sent, { ...sent, current_pain_reviewed_at: dbAt })).toBe(true);
  });
  it('re-save without changing the pain answer confirms', () => {
    const sent = { allergies: [], food_intolerances: [], medications: [], meals_per_day: 3, setup_completed: true };
    expect(healthSaveConfirmed(sent, { ...sent, current_pain_answer: false })).toBe(true);
  });
  it('still refuses a real mismatch or missing row', () => {
    expect(healthSaveConfirmed({ meals_per_day: 3 }, { meals_per_day: 2 })).toBe(false);
    expect(healthSaveConfirmed({ current_pain_reviewed_at: sentAt }, { current_pain_reviewed_at: '2026-11-06T13:59:00+00:00' })).toBe(false);
    expect(healthSaveConfirmed({ setup_completed: true }, null)).toBe(false);
  });
});
