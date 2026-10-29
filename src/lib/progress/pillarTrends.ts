import type { projectMasterySources } from '@/lib/intelligence/masteryProjection';
import type { EvidencePoint } from '@/components/progress/EvidenceTrendChart';
type Identity = ReturnType<typeof projectMasterySources>;
export interface PillarSeries { id: string; title: string; unit: string; points: EvidencePoint[] }
const shortDate = (date: string) => date.slice(5, 10);
export function pillarTrends(d: Identity): PillarSeries[] {
  return [
    { id: 'contact', title: 'Contact', unit: 'batting average', points: d.batting.completed.map(w => ({ label: `AB ${w.end}`, value: w.hits / w.atBats, date: `${w.from}–${w.through}`, sample: w.atBats, source: 'Completed game at-bat window' })) },
    { id: 'power', title: 'Power', unit: 'HR per at-bat', points: d.batting.completed.map(w => ({ label: `AB ${w.end}`, value: w.homeRuns / w.atBats, date: `${w.from}–${w.through}`, sample: w.atBats, source: 'Completed game at-bat window' })) },
    { id: 'defense', title: 'Defense', unit: 'successful chances %', points: d.defense.completed.map(w => ({ label: `Chance ${w.end}`, value: w.successful / w.chances * 100, date: `${w.from}–${w.through}`, sample: w.chances, source: 'Scored game-chance window; supporting results, not a human grade' })) },
    { id: 'speed', title: 'Speed', unit: 'grade', points: [...d.speed.evidence].sort((a,b) => a.date.localeCompare(b.date)).map(e => ({ label: shortDate(e.date), value: e.grade, date: e.date, sample: e.sample, source: `${e.source} · ${e.measure}` })) },
    { id: 'arm', title: 'Arm', unit: 'grade', points: d.arm.grade !== null && d.arm.source ? [{ label: 'Latest', value: d.arm.grade, date: d.arm.source, source: 'Position-matching measurement and human accuracy grade' }] : [] },
    { id: 'pitching', title: 'Pitching', unit: 'strikeouts / BF %', points: d.pitching.completed.map(w => ({ label: `BF ${w.end}`, value: w.k === null ? null : w.k * 100, date: `${w.from}–${w.through}`, sample: w.sample, source: 'Completed batters-faced window with recorded outcomes' })) },
  ];
}
/** Weekly display averages only within one metric; missing records never become zero. */
export function weeklyPoints(points: EvidencePoint[]): EvidencePoint[] {
  const groups = new Map<string, EvidencePoint[]>();
  for (const p of points) {
    if (p.value === null || !Number.isFinite(p.value)) continue;
    const date = p.date.slice(0, 10); const time = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(time)) continue;
    const day = new Date(time); day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    const key = day.toISOString().slice(0,10); groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date, rows]) => ({ label: shortDate(date), date: `Week of ${date}`, value: rows.reduce((sum,p) => sum + Number(p.value),0) / rows.length, sample: rows.length, source: 'Weekly mean of recorded points for this metric; not a new grade' }));
}