/**
 * Owner Nov 10 ("the entire app must work together"): ONE rule for combining a day's
 * check-ins (morning, pre_lift, night, and any other row saved for that entry_date).
 *
 * - Rows are read in a fixed order: entry_date, then created_at (ties: quiz type, then id),
 *   so the input order never changes the answer.
 * - Every single-answer question (hours slept, sleep quality, physical readiness, perceived
 *   recovery, reaction time, notes, …) comes from the most recent REAL answer that day.
 *   A blank (null, missing, empty text, empty list) never overwrites a real answer, and a
 *   question nobody answered stays missing (unknown) — never a default.
 * - Pain and soreness come from ANY row that day: area lists are unioned, per-area scales
 *   and the single pain_scale keep the higher number.
 *
 * Pure and dependency-free so edge functions and the app share it
 * (`src/lib/checkIns/mergeCheckInDay.ts` re-exports it).
 */

export type CheckInRow = Record<string, unknown> & {
  entry_date?: string | null;
  created_at?: string | null;
  quiz_type?: string | null;
  id?: string | null;
};

/** Area lists unioned across the day. */
export const DAY_AREA_LIST_FIELDS = ["pain_location", "soreness_locations", "stiffness_locations"] as const;
/** Per-area number maps: higher number wins for a repeated area. */
export const DAY_AREA_SCALE_FIELDS = ["pain_scales", "soreness_scales", "stiffness_scales"] as const;
/** Single pain numbers: the highest real number that day. */
export const DAY_MAX_NUMBER_FIELDS = ["pain_scale"] as const;

const LIST = new Set<string>(DAY_AREA_LIST_FIELDS);
const SCALES = new Set<string>(DAY_AREA_SCALE_FIELDS);
const MAXN = new Set<string>(DAY_MAX_NUMBER_FIELDS);
const QUIZ_RANK: Record<string, number> = { morning: 0, pre_lift: 1, night: 2 };

function isReal(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function realNumber(v: unknown): number | null {
  if (!isReal(v) || typeof v === "boolean" || typeof v === "object") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function timeOf(v: unknown): number {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
}

/** Fixed reading order: entry_date, created_at, quiz type, id. Returns a new array. */
export function orderCheckIns<T extends CheckInRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = String(a.entry_date ?? ""), db = String(b.entry_date ?? "");
    if (da !== db) return da < db ? -1 : 1;
    const ta = timeOf(a.created_at), tb = timeOf(b.created_at);
    if (ta !== tb) return ta < tb ? -1 : 1;
    const qa = QUIZ_RANK[String(a.quiz_type ?? "")] ?? 9, qb = QUIZ_RANK[String(b.quiz_type ?? "")] ?? 9;
    if (qa !== qb) return qa - qb;
    const ia = String(a.id ?? ""), ib = String(b.id ?? "");
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

/** The most recent entry_date among the rows (YYYY-MM-DD), or null when there is none. */
export function latestCheckInDate(rows: readonly CheckInRow[]): string | null {
  let best: string | null = null;
  for (const r of rows) {
    const d = typeof r.entry_date === "string" ? r.entry_date.slice(0, 10) : null;
    if (d && (best === null || d > best)) best = d;
  }
  return best;
}

/** Combine rows that belong to ONE day. Returns null for no rows. */
export function mergeCheckInDay<T extends CheckInRow>(rows: readonly T[]): T | null {
  if (!rows.length) return null;
  const ordered = orderCheckIns(rows);
  const out: Record<string, unknown> = {};
  const lists: Record<string, string[]> = {};
  const scales: Record<string, Record<string, number>> = {};
  for (const r of ordered) {
    for (const [k, v] of Object.entries(r)) {
      if (LIST.has(k)) {
        const acc = (lists[k] ??= []);
        for (const a of Array.isArray(v) ? v : []) {
          if (typeof a === "string" && a && !acc.includes(a)) acc.push(a);
        }
      } else if (SCALES.has(k)) {
        const acc = (scales[k] ??= {});
        if (v && typeof v === "object" && !Array.isArray(v)) {
          for (const [area, s] of Object.entries(v as Record<string, unknown>)) {
            const n = realNumber(s);
            if (n === null) continue;
            acc[area] = area in acc ? Math.max(acc[area], n) : n;
          }
        }
      } else if (MAXN.has(k)) {
        const n = realNumber(v);
        const had = realNumber(out[k]);
        if (n !== null) out[k] = had === null ? n : Math.max(had, n);
        else if (!(k in out)) out[k] = null;
      } else if (isReal(v)) {
        out[k] = v; // later rows are more recent: the latest real answer wins
      } else if (!(k in out)) {
        out[k] = v ?? null; // keep the key, still unknown
      }
    }
  }
  for (const [k, acc] of Object.entries(lists)) out[k] = acc;
  for (const [k, acc] of Object.entries(scales)) out[k] = Object.keys(acc).length ? acc : null;
  return out as T;
}

/** Combine every row of the most recent check-in day among `rows`. */
export function mergeLatestCheckInDay<T extends CheckInRow>(rows: readonly T[] | null | undefined): T | null {
  const list = rows ?? [];
  const day = latestCheckInDate(list);
  if (!day) return null;
  return mergeCheckInDay(list.filter((r) => typeof r.entry_date === "string" && r.entry_date.slice(0, 10) === day));
}
