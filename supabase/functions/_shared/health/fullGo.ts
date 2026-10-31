/**
 * Healed / full go rules (owner Oct 31, Fix 7/8). Pure and shared by the app and
 * the injury-full-go function. Only explicit, structured injury entries count.
 * A note is never a diagnosis and never a clearance.
 */
export const ACTIVE_INJURY_STATUSES = ['active', 'pain', 'managing', 'moderate', 'acute', 'severe', 'light', 'significant'];

type Entry = Record<string, unknown>;
const obj = (v: unknown): v is Entry => !!v && typeof v === 'object' && !Array.isArray(v);
const regionOf = (e: Entry) => typeof e.region === 'string' ? e.region.trim().toLowerCase() : null;

/** An entered injury that has not been marked healed. */
export function isActiveInjuryEntry(e: unknown, area?: string): boolean {
  if (!obj(e)) return false;
  const region = regionOf(e);
  if (!region || (area && region !== area)) return false;
  if (e.recovery_status === 'healed') return false;
  const status = String(e.recovery_status ?? e.severity ?? '').toLowerCase();
  return ACTIVE_INJURY_STATUSES.includes(status);
}

export function activeInjuryAreas(history: unknown): string[] {
  return Array.isArray(history) ? [...new Set(history.filter(e => isActiveInjuryEntry(e)).map(e => regionOf(e as Entry)!))] : [];
}

/** Marks EXISTING active entries for the area healed; never adds a row. */
export function markAreaHealed(history: unknown, area: string, by: 'self' | 'parent', at: string, rebuildPending = false): { next: unknown[]; changed: number } {
  const list = Array.isArray(history) ? history : [];
  let changed = 0;
  const next = list.map(e => {
    if (!isActiveInjuryEntry(e, area)) return e;
    changed++;
    const { full_go_request: _r, ...rest } = e as Entry;
    return { ...rest, recovery_status: 'healed', healed_at: at, healed_by: by, ...(rebuildPending ? { rebuild_pending: true } : {}) };
  });
  return { next, changed };
}

/** Pending parent request on the area's active entries, if any. */
export function pendingFullGoRequest(history: unknown, area: string): { requested_at: string } | null {
  const list = Array.isArray(history) ? history : [];
  for (const e of list) if (isActiveInjuryEntry(e, area) && obj((e as Entry).full_go_request)) {
    const r = (e as Entry).full_go_request as Entry;
    if (typeof r.requested_at === 'string') return { requested_at: r.requested_at };
  }
  return null;
}

export type InjuryCheck = { date: string; pain: number; function: number };
const valid = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;

/** Saves today's pain/function answer onto the area's newest active entry (one per date, last 30 kept). */
export function addInjuryCheck(history: unknown, area: string, check: InjuryCheck): unknown[] {
  if (!valid(check.pain) || !valid(check.function) || !/^\d{4}-\d{2}-\d{2}$/.test(check.date)) throw new Error('Pick a number from 0 to 10.');
  const list = Array.isArray(history) ? [...history] : [];
  let idx = -1;
  list.forEach((e, i) => { if (isActiveInjuryEntry(e, area)) idx = i; });
  if (idx < 0) throw new Error('That injury is not active.');
  const e = list[idx] as Entry;
  const prior = Array.isArray(e.checks) ? (e.checks as InjuryCheck[]).filter(c => c?.date !== check.date) : [];
  list[idx] = { ...e, checks: [...prior, check].sort((a, b) => a.date.localeCompare(b.date)).slice(-30) };
  return list;
}

export function injuryChecks(history: unknown, area: string): InjuryCheck[] {
  const list = Array.isArray(history) ? history : [];
  return list.filter(e => isActiveInjuryEntry(e, area)).flatMap(e => Array.isArray((e as Entry).checks) ? (e as Entry).checks as InjuryCheck[] : [])
    .filter(c => c && valid(c.pain) && valid(c.function) && typeof c.date === 'string').sort((a, b) => a.date.localeCompare(b.date));
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
const label = (area: string) => area.charAt(0).toUpperCase() + area.slice(1);

/** "Ankle: pain 2/10, trending down over 7 days" — only from the player's own answers. */
export function injuryProgressLine(history: unknown, area: string, today: string): string | null {
  const recent = injuryChecks(history, area).filter(c => { const d = dayDiff(today, c.date); return d >= 0 && d < 7; });
  if (!recent.length) return null;
  const last = recent[recent.length - 1];
  if (recent.length < 2) return `${label(area)}: pain ${last.pain}/10 today. Check in again to see a trend.`;
  const span = dayDiff(last.date, recent[0].date) + 1;
  const diff = last.pain - recent[0].pain;
  const trend = diff < 0 ? 'trending down' : diff > 0 ? 'trending up' : 'holding steady';
  return `${label(area)}: pain ${last.pain}/10, ${trend} over ${span} days.`;
}

/** Highest injury-check pain per date, for readiness. */
export function injuryCheckPainByDate(history: unknown): Map<string, number> {
  const out = new Map<string, number>();
  for (const area of activeInjuryAreas(history)) for (const c of injuryChecks(history, area)) out.set(c.date, Math.max(out.get(c.date) ?? 0, c.pain));
  return out;
}

const PAIN_REGIONS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'back'];
/** Body-map pain ids ("left_ankle_inside", "lower_back") → plain regions. */
export function painRegionsFromLocations(locations: unknown): string[] {
  return Array.isArray(locations) ? [...new Set(locations.flatMap(l => typeof l === 'string' ? PAIN_REGIONS.filter(r => l.toLowerCase().includes(r)) : []))] : [];
}

const FULL_GO_RE = /\b(healed|fully\s+(?:rehabbed|recovered|healthy|cleared)|full\s*go|100\s*%|cleared\s+(?:to\s+play|by\s+(?:my\s+)?(?:doctor|pt|trainer))|back\s+to\s+full)\b/i;
const NEGATED_RE = /\b(not|isn'?t|aren'?t|never|no longer|almost|nearly)\s+(?:\w+\s+){0,2}(healed|full\s*go|100|fully|cleared)/i;
/** True when the words say the player is healed or full go (never when negated). */
export function detectFullGoPhrasing(text: string): { matched: boolean; region: string | null } {
  if (!text || !FULL_GO_RE.test(text) || NEGATED_RE.test(text)) return { matched: false, region: null };
  const lower = text.toLowerCase();
  const region = ['shoulder', 'elbow', 'forearm', 'wrist', 'hand', 'hip', 'knee', 'ankle', 'foot', 'back', 'hamstring', 'quad', 'groin', 'calf', 'achilles', 'neck'].find(r => lower.includes(r)) ?? null;
  return { matched: true, region };
}

/** Occasional cool-down care for healed areas: every third calendar day. */
export function cooldownCareDue(dateIso: string): boolean {
  const t = Date.parse(`${dateIso}T00:00:00Z`);
  return Number.isFinite(t) && Math.floor(t / 86400000) % 3 === 0;
}
