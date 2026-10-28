/**
 * Recurring findings. The stored record (`athlete_recurring_issues`) is written
 * by the database whenever a saved analysis adds a finding: the same finding
 * tag in 2+ saved analyses within 28 days, or one saved analysis plus a
 * practice/game/coach indication of that tag. Readers re-check freshness here,
 * because a stored row is only recomputed when new evidence arrives.
 */
export const RECURRING_WINDOW_DAYS = 28;

export interface RecurringIssue {
  user_id: string;
  sport: string;
  skill_domain: string;
  fault_key: string;
  analysis_count: number;
  video_ids: string[];
  corroborating_signal_ids: string[];
  first_seen: string;
  last_seen: string;
}

export interface FindingEvidence { fault_key: string; skill_domain: string; video_id: string | null; created_at: string; saved: boolean }

/** Pure rule shared by readers and tests. */
export function detectRecurring(findings: ReadonlyArray<FindingEvidence>, corroboratedKeys: ReadonlySet<string>, now = Date.now()) {
  const since = now - RECURRING_WINDOW_DAYS * 86_400_000;
  const groups = new Map<string, Set<string>>();
  for (const f of findings) {
    const t = Date.parse(f.created_at);
    if (!f.saved || !f.video_id || !f.fault_key || f.fault_key === "other" || !Number.isFinite(t) || t < since || t > now) continue;
    const k = `${f.skill_domain}|${f.fault_key}`;
    (groups.get(k) ?? groups.set(k, new Set()).get(k)!).add(f.video_id);
  }
  return [...groups].filter(([k, vids]) => vids.size >= 2 || corroboratedKeys.has(k.split("|")[1]))
    .map(([k, vids]) => ({ skill_domain: k.split("|")[0], fault_key: k.split("|")[1], analysis_count: vids.size }));
}

/** A stored row still counts only while its newest evidence is inside the window. */
export function stillRecurring(issue: RecurringIssue, now = Date.now()): boolean {
  const last = Date.parse(issue.last_seen);
  if (!Number.isFinite(last) || last < now - RECURRING_WINDOW_DAYS * 86_400_000) return false;
  return issue.analysis_count >= 2 || issue.corroborating_signal_ids.length > 0;
}

export const prettyFinding = (key: string) => key.replace(/_/g, " ");

/** 14-year-old wording for the Because line. */
export function recurringBecause(issue: RecurringIssue, drillName: string): string {
  const where = issue.analysis_count >= 2
    ? `${issue.analysis_count} of your videos in the last 4 weeks`
    : "a video and your practice or game notes in the last 4 weeks";
  return `Because "${prettyFinding(issue.fault_key)}" keeps showing up (${where}), "${drillName}" works on it today.`;
}
