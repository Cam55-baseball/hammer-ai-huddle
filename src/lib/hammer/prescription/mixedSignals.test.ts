import { describe, it, expect } from 'vitest';
import { crossReference, type CategorySignal } from './mixedSignals';

const v = (category: string, direction: CategorySignal['direction'], says = 'a late swing'): CategorySignal => ({ category, source: 'video', direction, says });
const g = (category: string, direction: CategorySignal['direction'], says = 'a late swing'): CategorySignal => ({ category, source: 'games', direction, says });

describe('crossReference', () => {
  it('same limitation from two sources raises priority', () => {
    const r = crossReference('hitting', [v('hitting', 'needs-work'), g('hitting', 'needs-work')]);
    expect(r).toEqual({ kind: 'agree', sources: ['video', 'games'], raisePriority: true, because: 'Because your video and your games both show a late swing.' });
  });
  it('conflict says mixed signals and keeps the safer plan', () => {
    const r = crossReference('hitting', [v('hitting', 'needs-work'), g('hitting', 'looks-good')]);
    expect(r.kind).toBe('mixed');
    if (r.kind === 'mixed') { expect(r.keepSafer).toBe(true); expect(r.because).toMatch(/^Mixed signals:/); }
  });
  it('another category never counts (no spill-over)', () => {
    expect(crossReference('hitting', [v('pitching', 'needs-work'), g('fielding', 'looks-good')])).toEqual({ kind: 'none' });
    expect(crossReference('pitching', [v('pitching', 'needs-work'), g('hitting', 'looks-good')]).kind).toBe('single');
  });
  it('only good news or empty text changes nothing', () => {
    expect(crossReference('hitting', [g('hitting', 'looks-good')])).toEqual({ kind: 'none' });
    expect(crossReference('hitting', [v('hitting', 'needs-work', '  ')])).toEqual({ kind: 'none' });
  });
});
