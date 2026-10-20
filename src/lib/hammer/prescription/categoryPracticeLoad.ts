/** Actual practice only: never substitute a scheduled duration or guess an intensity. */
export type PracticeCategory = 'hitting' | 'pitching' | 'throwing' | 'fielding' | 'baserunning' | 'speed';
const CATEGORIES: readonly string[] = ['hitting', 'pitching', 'throwing', 'fielding', 'baserunning', 'speed'];
export interface PracticeLoadRecord {
  id: string;
  date: string;
  sport: string;
  category: string | null;
  minutes: number | null;
  intensity: number | null;
  deleted?: boolean;
}
export interface CategoryPracticeLoad {
  category: PracticeCategory;
  sessions: number;
  minutes: number;
  /** Sum of actual minutes × entered 1–10 intensity; missing pairs excluded. */
  intensityMinutes: number;
  missingMinutes: number;
  missingIntensity: number;
  consecutiveDays: number;
  heavyStretch: boolean;
  sourceIds: string[];
}
const dayNumber = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const n = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date ? Math.floor(n / 86400000) : NaN;
};
export function categoryPracticeLoads(records: readonly PracticeLoadRecord[], today: string, sport: string): CategoryPracticeLoad[] {
  const now = dayNumber(today);
  if (!Number.isFinite(now)) return [];
  const unique = new Map<string, PracticeLoadRecord>();
  for (const record of records) {
    const age = now - dayNumber(record.date);
    if (record.deleted || record.sport !== sport || !record.category || !CATEGORIES.includes(record.category) || !(age >= 1 && age <= 7)) continue;
    unique.set(record.id, record);
  }
  return CATEGORIES.flatMap(category => {
    const rows = [...unique.values()].filter(row => row.category === category);
    if (!rows.length) return [];
    const days = new Set(rows.map(row => dayNumber(row.date)));
    let consecutiveDays = 0;
    while (days.has(now - consecutiveDays - 1)) consecutiveDays++;
    let minutes = 0, intensityMinutes = 0, missingMinutes = 0, missingIntensity = 0;
    for (const row of rows) {
      const validMinutes = row.minutes !== null && Number.isFinite(row.minutes) && row.minutes > 0;
      const validIntensity = row.intensity !== null && Number.isFinite(row.intensity) && row.intensity >= 1 && row.intensity <= 10;
      if (validMinutes) minutes += row.minutes ?? 0; else missingMinutes++;
      if (!validIntensity) missingIntensity++;
      if (validMinutes && validIntensity) intensityMinutes += (row.minutes ?? 0) * (row.intensity ?? 0);
    }
    return [{ category: category as PracticeCategory, sessions: rows.length, minutes, intensityMinutes, missingMinutes, missingIntensity, consecutiveDays, heavyStretch: consecutiveDays >= 3, sourceIds: rows.map(row => row.id) }];
  });
}