// Plan v3.1 §4 — summary card wording. Pure; every missing value says so.
export interface GlanceProfile {
  full_name: string | null;
  age: number | null;
  position: string | null;
  team: string | null;
  plan_started_at: string | null;
  sport: string | null;
}

export interface Glance {
  profile?: GlanceProfile | null;
  today_planned: number;
  today_done: number;
  week_planned: number;
  week_done: number;
  top_alert: { metric_key: string; direction: string | null; kind: string | null; at: string } | null;
  latest_test: { test_type: string; test_date: string; next_entry_date: string | null } | null;
  head_coach: { coach_id: string; name: string | null } | null;
}

const words = (k: string) => k.replace(/[_.]+/g, " ").trim();

export function todayStatus(g: Glance | null | undefined): string {
  if (!g || g.today_planned === 0) return "No plan for today";
  if (g.today_done >= g.today_planned) return `All ${g.today_planned} done ✓`;
  return `${g.today_done} of ${g.today_planned} done`;
}

export function weekCompletion(g: Glance | null | undefined): string {
  if (!g || g.week_planned === 0) return "Nothing planned in the last 7 days";
  return `${Math.round((g.week_done / g.week_planned) * 100)}% (${g.week_done} of ${g.week_planned} cards)`;
}

export function topAlert(g: Glance | null | undefined, fmt: (iso: string) => string): string {
  const a = g?.top_alert;
  if (!a) return "No open alerts";
  const dir = a.direction === "up" ? "above" : a.direction === "down" ? "below" : "away from";
  return `${words(a.metric_key)} ${dir} their usual (${fmt(a.at)})`;
}

export function latestTest(g: Glance | null | undefined, fmt: (iso: string) => string): string {
  const t = g?.latest_test;
  if (!t) return "No tests yet";
  const due = t.next_entry_date ? ` · next due ${fmt(t.next_entry_date)}` : "";
  return `${words(t.test_type)} on ${fmt(t.test_date)}${due}`;
}

export function headCoach(g: Glance | null | undefined): string {
  if (!g?.head_coach) return "Not chosen yet";
  return g.head_coach.name?.trim() || "Chosen (name not shared)";
}
