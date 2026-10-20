// Coach "What worked" rows: map the coach_athlete_outcomes RPC answer into
// display rows judged under the owner rules (never trusting the server's
// fixed-band verdict). Denied viewers get nothing; unverifiable rows are
// "Need more data", never a guess.
import { COMPARABLE_OUTCOME_LABEL, judgedOutcomeFromRecheck, type ComparableOutcome } from "./comparableOutcome";

export interface CoachOutcomeRow {
  area: string;
  doThis: string;
  label: string;
  outcome: ComparableOutcome;
  checkedAt: string | null;
}

export type CoachOutcomesResult =
  | { state: "ok"; rows: CoachOutcomeRow[] }
  | { state: "denied" }
  | { state: "unavailable" };

export function mapCoachOutcomes(data: unknown): CoachOutcomesResult {
  if (!data || typeof data !== "object") return { state: "unavailable" };
  const state = (data as { state?: unknown }).state;
  if (state === "denied") return { state: "denied" };
  if (state !== "ok") return { state: "unavailable" };
  const raw = (data as { outcomes?: unknown }).outcomes;
  if (!Array.isArray(raw)) return { state: "ok", rows: [] };
  const rows: CoachOutcomeRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.area !== "string" || typeof r.do_this !== "string") continue;
    const outcome = judgedOutcomeFromRecheck({
      baseline_value: typeof r.baseline_value === "number" ? r.baseline_value : null,
      recheck_value: typeof r.recheck_value === "number" ? r.recheck_value : null,
      followed_at: typeof r.followed_at === "string" ? r.followed_at : null,
      checked_at: typeof r.checked_at === "string" ? r.checked_at : null,
    });
    rows.push({
      area: r.area,
      doThis: r.do_this,
      outcome,
      label: COMPARABLE_OUTCOME_LABEL[outcome],
      checkedAt: typeof r.checked_at === "string" ? r.checked_at : null,
    });
  }
  return { state: "ok", rows };
}
