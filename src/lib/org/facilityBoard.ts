export interface FacilityBoardRow {
  athlete_id: string;
  name: string | null;
  team_id: string | null;
  team_name: string | null;
  coach_id: string | null;
  coach_name: string | null;
  today_planned: number;
  today_done: number;
  week_planned: number;
  week_done: number;
  missed_days: number;
  latest_test: { test_type: string; test_date: string; next_entry_date: string | null } | null;
  top_alert: { metric_key: string; kind: string; at: string } | null;
  last_active: string | null;
}

export function playerName(r: FacilityBoardRow): string {
  return r.name?.trim() || "Name not shared";
}

/** The single most important message for a player, or null when everything is fine. */
export function headline(r: FacilityBoardRow, todayISO: string): string {
  if (r.missed_days > 0) return `Missed ${r.missed_days} day${r.missed_days === 1 ? "" : "s"}`;
  const next = r.latest_test?.next_entry_date;
  if (next) {
    const days = Math.round((Date.parse(next) - Date.parse(todayISO)) / 86400000);
    if (days >= 0 && days <= 7) {
      if (days === 0) return `Test due today: ${r.latest_test!.test_type}`;
      if (days === 1) return `Test due tomorrow: ${r.latest_test!.test_type}`;
      return `Test due in ${days} days: ${r.latest_test!.test_type}`;
    }
  }
  if (r.top_alert) return "Open alert";
  if (r.today_planned > 0 && r.today_done >= r.today_planned) return "Today's plan done ✓";
  return "All good ✓";
}

export function todayLine(r: FacilityBoardRow): string {
  if (r.today_planned === 0) return "No plan for today";
  return `${r.today_done} of ${r.today_planned} cards done today`;
}

export function weekLine(r: FacilityBoardRow): string {
  if (r.week_planned === 0) return "Nothing planned in the last 7 days";
  return `${Math.round((r.week_done / r.week_planned) * 100)}% (${r.week_done} of ${r.week_planned} cards) done in the last 7 days`;
}

/** Attendance only — check-in contents are health data and stay on the consent-gated player page. */
export function checkinLine(r: FacilityBoardRow & { checkins_7d?: number | null }): string {
  if (r.checkins_7d == null) return "Check-ins: Not enough data";
  return `Check-ins completed: ${r.checkins_7d} of the last 7 days. Answers are on the player's page (shared only with health consent).`;
}

export function lastActiveLine(r: FacilityBoardRow): string {
  return r.last_active ? `Last activity: ${r.last_active}` : "No activity yet";
}

export function testsLine(r: FacilityBoardRow): string {
  if (!r.latest_test) return "No tests yet";
  const t = r.latest_test;
  return `Newest test: ${t.test_type} (${t.test_date})${t.next_entry_date ? ` · next due ${t.next_entry_date}` : ""}`;
}

export function alertLine(r: FacilityBoardRow): string {
  return r.top_alert ? `Alert: ${r.top_alert.kind} on ${r.top_alert.metric_key}` : "No open alerts";
}
