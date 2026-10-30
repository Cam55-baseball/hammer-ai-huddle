import type { HowSure } from '@/lib/intelligence/howSure';
import type { PillarSeries } from './pillarTrends';

export interface TrendInsight {
  title: string;
  weSee: string;
  because: string;
  howSure: HowSure;
  samples: number;
  doThis: string;
  checkBack: string;
  /** A graph only helps with two or more real points. */
  showChart: boolean;
  direction: 'better' | 'worse' | 'same' | null;
}

const NUM: Record<string, string> = { ten: '10', twenty: '20', thirty: '30', sixty: '60', forty: '40' };
const words = (raw: string) => raw.replace(/_/g, ' ').replace(/\b(ten|twenty|thirty|forty|sixty) (yard)\b/gi, (_, n: string, y: string) => `${NUM[n.toLowerCase()]}-${y}`).replace(/\s+/g, ' ').trim();

/** "Speed · Entered performance test · hitting · ten_yard_dash" → "Speed · 10-yard dash". */
export function plainSeriesTitle(title: string): string {
  const parts = title.split(' · ');
  if (parts[0] === 'Speed' && parts.length >= 3) return `Speed · ${words(parts[parts.length - 1])}`;
  return parts.map(words).join(' · ');
}

/** "Entered performance test · throwing · ten_yard_dash" → "your Vault test: 10-yard dash". */
export const plainSource = (src: string) => words(src.replace(/^Entered performance test · [^·]+ · /, 'your Vault test: '));

const lowerIsBetter = (s: PillarSeries) => /pop time/i.test(s.title);
const fmt = (v: number, unit: string) => unit === 'batting average' ? v.toFixed(3).replace(/^0/, '') : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '');
const day = (d: string) => (d.match(/\d{4}-\d{2}-\d{2}/g)?.pop() ?? d);
const kind = (id: string) => id.split('-')[0];

const DO: Record<string, string> = {
  contact: 'Keep doing your Hammers Today hitting work and log every at-bat.',
  power: 'Keep your hitting and lifting work going and log every at-bat.',
  defense: 'Log every chance in your games, good or bad.',
  speed: 'Retest the same sprint, same setup, in 4–6 weeks.',
  arm: 'Retest the same throw from the same position in 4–6 weeks.',
  pitching: 'Log batters faced and what happened after every outing.',
};
const BACK: Record<string, string> = {
  contact: 'After your next 10 at-bats.', power: 'After your next 10 at-bats.', defense: 'After your next 10 chances.',
  speed: 'After your next sprint test.', arm: 'After your next arm test.', pitching: 'After your next 10 batters faced.',
};

/** One Hammers Card per pillar series; null when there is nothing recorded. */
export function trendInsight(s: PillarSeries, title = plainSeriesTitle(s.title)): TrendInsight | null {
  const pts = s.points.filter((p): p is typeof p & { value: number } => p.value !== null && Number.isFinite(p.value));
  if (!pts.length) return null;
  const k = kind(s.id);
  const first = pts[0], last = pts[pts.length - 1];
  const unit = s.unit;
  const because = `${pts.length} recorded result${pts.length === 1 ? '' : 's'} (${plainSource(last.source)}), ${day(first.date)}${pts.length > 1 ? ` to ${day(last.date)}` : ''}.`;
  if (pts.length === 1) {
    return { title, weSee: `${fmt(last.value, unit)} ${unit} on ${day(last.date)}. Only one record — no trend yet.`, because, howSure: 'need_more_data', samples: 1,
      doThis: DO[k] ?? 'Record this again so we can see a trend.', checkBack: BACK[k] ?? 'After your next record.', showChart: false, direction: null };
  }
  const change = last.value - first.value;
  const same = Math.abs(change) <= Math.max(Math.abs(first.value) * 0.01, 1e-9);
  const better = lowerIsBetter(s) ? change < 0 : change > 0;
  const direction = same ? 'same' : better ? 'better' : 'worse';
  const word = direction === 'same' ? 'about the same' : `${change > 0 ? 'up' : 'down'} — ${direction}`;
  const doThis = direction === 'worse' ? `It's slipping. ${DO[k] ?? ''}`.trim() : direction === 'better' ? `It's working — keep it up. ${DO[k] ?? ''}`.trim() : DO[k] ?? 'Keep recording.';
  return {
    title,
    weSee: `${fmt(first.value, unit)} → ${fmt(last.value, unit)} ${unit} (${word}).`,
    because,
    howSure: pts.length >= 3 ? 'measured' : 'hunch',
    samples: pts.length,
    doThis,
    checkBack: BACK[k] ?? 'After your next record.',
    showChart: true,
    direction,
  };
}

/** Pillars with nothing recorded, gathered into one "Need more data" line. */
export function emptyPillars(series: PillarSeries[]): string[] {
  return [...new Set(series.filter(s => !s.points.some(p => p.value !== null && Number.isFinite(p.value))).map(s => s.title.split(' · ')[0]))];
}
