import { describe, it, expect } from 'vitest';
import { cueChanges } from './philosophySettings';
const cue = { target: 'wk_movement_catalog', id: '03b31613-9eb1-4196-9193-d208c68469ab', field: 'cue', before: 'Comfortable range.', after: 'Stay in a comfortable range.' };
describe('TEST philosophy canonical setting boundary', () => {
  it('retains exact before and after for the existing cue', () => expect(cueChanges([cue])).toEqual([cue]));
  it('cannot change dose through a cue confirmation', () => expect(() => cueChanges([{ ...cue, field: 'default_reps', after: 20 }])).toThrow());
  it('cannot author a parallel rule target', () => expect(() => cueChanges([{ ...cue, target: 'new_rules' }])).toThrow());
  it('refuses a no-op instead of issuing a false receipt', () => expect(() => cueChanges([{ ...cue, after: cue.before }])).toThrow());
  it('refuses missing old values', () => expect(() => cueChanges([{ ...cue, before: null }])).toThrow());
});