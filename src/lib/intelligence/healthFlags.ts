// Health flags: only real, repeated pain the player reported. No predictions, no diagnoses.
export const REPEAT_MIN = 3;
export const WINDOW_DAYS = 14;

export interface PainEntry { created_at: string; pain_location: string[] | null; pain_scale: number | null }
export interface HealthFlag { area: string; times: number; lastAt: string }

export function repeatedPain(entries: PainEntry[], now = new Date()): HealthFlag[] {
  const since = now.getTime() - WINDOW_DAYS * 86400000;
  const byArea = new Map<string, HealthFlag>();
  for (const e of entries) {
    const t = Date.parse(e.created_at);
    if (!Number.isFinite(t) || t < since || !e.pain_scale || e.pain_scale <= 0) continue;
    for (const raw of e.pain_location ?? []) {
      const area = String(raw).trim().toLowerCase();
      if (!area) continue;
      const f = byArea.get(area) ?? { area, times: 0, lastAt: e.created_at };
      f.times += 1;
      if (t > Date.parse(f.lastAt)) f.lastAt = e.created_at;
      byArea.set(area, f);
    }
  }
  return [...byArea.values()].filter((f) => f.times >= REPEAT_MIN).sort((a, b) => b.times - a.times);
}
