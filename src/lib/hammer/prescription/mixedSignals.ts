/**
 * Link d — cross-reference. Sources only INFORM one category's priority and
 * Because line; they never author work, and another category's signal is ignored.
 */
export type SignalSource = 'video' | 'games' | 'practice';
export type SignalDirection = 'needs-work' | 'looks-good';

export interface CategorySignal {
  readonly category: string;
  readonly source: SignalSource;
  readonly direction: SignalDirection;
  /** Plain words, e.g. "late swing". */
  readonly says: string;
}

export type CrossReference =
  | { kind: 'none' }
  | { kind: 'single'; source: SignalSource; because: string }
  | { kind: 'agree'; sources: SignalSource[]; because: string; raisePriority: true }
  | { kind: 'mixed'; because: string; keepSafer: true };

const NAMES: Record<SignalSource, string> = { video: 'your video', games: 'your games', practice: 'your practice logs' };

const list = (s: SignalSource[]) =>
  s.length <= 1 ? NAMES[s[0]] : `${s.slice(0, -1).map(x => NAMES[x]).join(', ')} and ${NAMES[s[s.length - 1]]}`;

export function crossReference(category: string, signals: ReadonlyArray<CategorySignal>): CrossReference {
  const own = signals.filter(s => s.category === category && s.says.trim());
  if (!own.length) return { kind: 'none' };
  const bad = own.filter(s => s.direction === 'needs-work');
  const good = own.filter(s => s.direction === 'looks-good');
  if (bad.length && good.length) {
    return {
      kind: 'mixed',
      keepSafer: true,
      because: `Mixed signals: ${list([...new Set(bad.map(s => s.source))])} show ${bad[0].says}, but ${list([...new Set(good.map(s => s.source))])} look good. We're keeping the safer plan.`,
    };
  }
  const sources = [...new Set(own.map(s => s.source))];
  if (bad.length && sources.length >= 2) {
    return { kind: 'agree', sources, raisePriority: true, because: `Because ${list(sources)} both show ${bad[0].says}.` };
  }
  if (!bad.length) return { kind: 'none' };
  return { kind: 'single', source: bad[0].source, because: `Because ${NAMES[bad[0].source]} showed ${bad[0].says}.` };
}
