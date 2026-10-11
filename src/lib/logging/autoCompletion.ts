/**
 * Completion comes only from what the player entered — never a button.
 *   all prescribed sets met = Done; some = Cut short; more than prescribed
 *   (extra sets, reps, time or distance) = Done + "Did more"; nothing by the
 *   end of the day = Missed. Skip is the only explicit choice.
 */
export type AutoStatus = "done" | "did_more" | "cut_short" | "missed" | "skipped" | null;

export const AUTO_STATUS_LABEL: Record<Exclude<AutoStatus, null>, string> = {
  done: "Done", did_more: "Done · Did more", cut_short: "Cut short", missed: "Missed", skipped: "Skipped",
};

export interface CompletionInput {
  /** Prescribed rows (sets). */
  prescribedRows: number;
  /** Prescribed target per field, e.g. { reps: 5 } or { distance: 90 }. */
  targets: Record<string, number | null | undefined>;
  /** Rows the player actually entered (numbers only). Extra rows = added sets. */
  rows: Array<Record<string, number | null | undefined>>;
  /** Fields where a bigger number is NOT "more work" (stopwatch times). */
  lowerIsBetter?: string[];
  skipped?: boolean;
  /** The plan day has ended. */
  dayOver?: boolean;
}

export function autoStatus(i: CompletionInput): AutoStatus {
  if (i.skipped) return "skipped";
  const logged = i.rows.filter((r) => Object.values(r).some((v) => typeof v === "number" && Number.isFinite(v) && v > 0));
  if (logged.length === 0) return i.dayOver ? "missed" : null;
  const lower = new Set(i.lowerIsBetter ?? []);
  const fields = Object.entries(i.targets).filter(([k, t]) => typeof t === "number" && t > 0 && !lower.has(k)) as [string, number][];
  const meets = (r: Record<string, number | null | undefined>) => fields.every(([k, t]) => typeof r[k] === "number" && (r[k] as number) >= t);
  const exceeds = (r: Record<string, number | null | undefined>) => fields.some(([k, t]) => typeof r[k] === "number" && (r[k] as number) > t);
  const first = logged.slice(0, i.prescribedRows);
  const allMet = logged.length >= i.prescribedRows && first.every(meets);
  if (!allMet) return "cut_short";
  if (logged.length > i.prescribedRows || logged.some(exceeds)) return "did_more";
  return "done";
}

/** Prescribed vs done totals for one field (e.g. reps 15 → 20). */
export function prescribedVsDone(prescribedRows: number, target: number | null | undefined, rows: Array<Record<string, number | null | undefined>>, key: string) {
  const done = rows.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);
  return { prescribed: target ? prescribedRows * target : null, done, sets: { prescribed: prescribedRows, done: rows.filter((r) => typeof r[key] === "number" && (r[key] as number) > 0).length } };
}
