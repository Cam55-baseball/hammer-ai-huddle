/**
 * Owner Nov 1 (Option C): a bullpen the day before a start is only logged and tracked.
 * This turns the tracked starts and the player's other starts into one honest Hammers Card.
 * Observation only: it compares what was logged and never names a cause.
 */
import { howSureFor, type HowSure } from "./howSure";
import { pitchingCounts, type PitcherGameRow } from "../../../supabase/functions/_shared/wic/pitchingCounts";

export interface StartFollowup {
  start_date: string; bullpen_date?: string; start_thrown: boolean;
  start_pitch_count: number | null; ledger_pitches: number | null;
  days_completed_next3: number; conditioning_reps_next3: number; conditioning_avg_effort_next3: number | null;
  health: { checkins: number; avg_physical_readiness: number | null; avg_perceived_recovery: number | null; max_pain_scale: number | null; soreness_reports: number; pain_reps: number } | null;
}
export interface Followups { health_shared: boolean; tracked: StartFollowup[]; other_starts: StartFollowup[] }

/** Both groups need at least this many logged starts before any comparison is shown. */
export const MIN_STARTS_EACH = 2;

const avg = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === "number"); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
const pct = (n: number | null, d: number | null) => (n == null || !d) ? null : Math.round((n / d) * 100);

interface GroupSummary { starts: number; pitches: number | null; fpsPct: number | null; walkPct: number | null; readiness: number | null; painOrSoreDays: number | null; workDays: number | null; effort: number | null }

function summarize(rows: StartFollowup[], games: readonly (PitcherGameRow & { game_date?: string })[], health: boolean): GroupSummary {
  const thrown = rows.filter(r => r.start_thrown);
  const dates = new Set(thrown.map(r => r.start_date));
  const lines = games.filter(g => g.game_date && dates.has(String(g.game_date)));
  const c = lines.length ? pitchingCounts(lines) : null;
  return {
    starts: thrown.length,
    pitches: avg(thrown.map(r => r.start_pitch_count ?? r.ledger_pitches)),
    fpsPct: c ? pct(c.firstPitchStrikes, c.battersFaced) : null,
    walkPct: c ? pct(c.walks, c.battersFaced) : null,
    readiness: health ? avg(thrown.map(r => r.health?.avg_physical_readiness)) : null,
    painOrSoreDays: health ? thrown.filter(r => (r.health?.soreness_reports ?? 0) > 0 || (r.health?.pain_reps ?? 0) > 0 || (r.health?.max_pain_scale ?? 0) > 0).length : null,
    workDays: avg(thrown.map(r => r.days_completed_next3)),
    effort: avg(thrown.map(r => r.conditioning_avg_effort_next3)),
  };
}

function line(label: string, g: GroupSummary): string {
  const parts = [
    g.pitches != null ? `about ${g.pitches} pitches` : null,
    g.fpsPct != null ? `first-pitch strikes ${g.fpsPct}%` : null,
    g.walkPct != null ? `walks ${g.walkPct}% of batters` : null,
    g.readiness != null ? `body readiness ${g.readiness} the next days` : null,
    g.painOrSoreDays != null ? `pain or soreness after ${g.painOrSoreDays} of ${g.starts}` : null,
    g.workDays != null ? `${g.workDays} of the next 3 days with work done` : null,
    g.effort != null ? `conditioning effort ${g.effort}/10` : null,
  ].filter(Boolean);
  return `${label} (${g.starts} start${g.starts === 1 ? "" : "s"}): ${parts.length ? parts.join(", ") : "nothing logged yet"}.`;
}

export interface BullpenCard { show: boolean; weSee: string; because: string; howSure: HowSure; samples: number; doThis: string; checkBack: string }

export function bullpenBeforeStartCard(f: Followups | null, games: readonly (PitcherGameRow & { game_date?: string })[], who: "player" | "coach"): BullpenCard {
  const tracked = f?.tracked ?? [];
  const you = who === "player" ? "You" : "This player";
  const base = { doThis: who === "player" ? "Keep logging your starts, check-ins and the next few days of work." : "Keep the logs coming: starts, check-ins and the next few days of work.", checkBack: "After the next start." };
  if (!f || tracked.length === 0) return { show: false, weSee: "", because: "", howSure: "need_more_data", samples: 0, ...base };
  const a = summarize(tracked, games, f.health_shared);
  const b = summarize(f.other_starts, games, f.health_shared);
  const enough = a.starts >= MIN_STARTS_EACH && b.starts >= MIN_STARTS_EACH;
  if (!enough) return {
    show: true, samples: a.starts, howSure: "need_more_data",
    weSee: `${you} threw a bullpen the day before a start ${tracked.length} time${tracked.length === 1 ? "" : "s"}. We're watching what happens next.`,
    because: "", ...base,
  };
  return {
    show: true, samples: a.starts,
    howSure: howSureFor({ samples: a.starts }),
    weSee: `${line("After a bullpen the day before", a)} ${line("Other starts", b)}`,
    because: `This only compares what was logged. It doesn't show what caused any difference.${f.health_shared ? "" : " Health answers aren't shared, so they're left out."}`,
    ...base,
  };
}
