import { describe, expect, it } from 'vitest';
import { freshPersona } from '../../supabase/functions/create-test-athlete/freshPersona';
describe('owner-authorized pristine TEST identity', () => {
  it('allows the exact fresh unstarted player', () => {
    expect(freshPersona('onboarding18_oct29_1545')).toEqual({ email: 'hammersmodality+onboarding18oct291545@gmail.com', name: 'TEST Onboarding 18 1545' });
  });
  it('cannot accept arbitrary users or emails', () => {
    for (const key of ['owner', 'real@example.com', '', null, { email: 'real@example.com' }]) expect(freshPersona(key)).toBeNull();
  });
});