import { videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
// Development tab logic (PLAN v3.1 Phase 6 owner addition).
// Everything is derived from real analysis reports and fault findings only.
// Connections are always labeled by strength: Observed fact / Measured change /
// Supported pattern / Hypothesis to check / Not enough data. Never causal.

export interface DevReport {
  id: string;
  date: string;
  module: string | null;
  efficiency_score: number | null;
}

export interface DevFinding {
  id: string;
  video_id: string | null;
  skill_domain: string | null;
  fault_key: string;
  evidence: string | null;
  created_at: string;
}

export type IssueStatus = "Recurring" | "New" | "Cleaning up";

export interface Issue {
  fault_key: string;
  category: string;
  status: IssueStatus;
  times_seen: number;
  reports_checked: number;
  last_seen: string;
  evidence: string | null;
}

export type ConnectionLabel =
  | "Observed fact"
  | "Measured change"
  | "Supported pattern"
  | "Hypothesis to check"
  | "Not enough data";

export interface Connection {
  label: ConnectionLabel;
  text: string;
}

export interface CategoryCard {
  category: string;
  reports: DevReport[]; // most recent first, max 5
  trend: "up" | "down" | "flat" | "unknown";
  issues: Issue[];
}

export interface Takeaway {
  text: string;
  evidence: string;
  confidence: "High" | "Medium" | "Low";
}

const pretty = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Date-only form of any ISO date or timestamp. */
export const dateOnly = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : "Not recorded";

function trendOf(scores: number[]): "up" | "down" | "flat" | "unknown" {
  const nums = scores.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return "unknown";
  // scores are most-recent-first: compare newest half vs oldest half
  const mid = Math.ceil(nums.length / 2);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const recent = avg(nums.slice(0, mid));
  const older = avg(nums.slice(mid));
  const span = Math.max(Math.abs(recent), Math.abs(older), 1);
  const diff = (recent - older) / span;
  if (diff > 0.1) return "up";
  if (diff < -0.1) return "down";
  return "flat";
}

/** Group reports by category (module), keep the 5 most recent per category. */
export function reportsByCategory(reports: DevReport[]): Map<string, DevReport[]> {
  const map = new Map<string, DevReport[]>();
  for (const r of reports) {
    const cat = r.module || "general";
    const list = map.get(cat) ?? [];
    if (list.length < 5) list.push(r);
    map.set(cat, list);
  }
  return map;
}

/**
 * Classify each fault within its category:
 * - New: only in the most recent report that assessed it
 * - Recurring: in 2+ of the last 5 reports
 * - Cleaning up: seen before but NOT in the most recent report
 */
export function classifyIssues(reports: DevReport[], findings: DevFinding[]): Issue[] {
  const byCat = reportsByCategory(reports);
  const issues: Issue[] = [];
  const byFault = new Map<string, DevFinding[]>();
  for (const f of findings) {
    const list = byFault.get(f.fault_key) ?? [];
    list.push(f);
    byFault.set(f.fault_key, list);
  }
  const reportDate = new Map<string, string>();
  for (const r of reports) reportDate.set(r.id, dateOnly(r.date));
  for (const [faultKey, rows] of byFault) {
    const cat = rows[0].skill_domain || "general";
    const catReports = byCat.get(cat) ?? [];
    if (catReports.length === 0) continue;
    const recentIds = new Set(catReports.map((r) => r.id));
    const inRecent = rows.filter((f) => f.video_id && recentIds.has(f.video_id));
    const newestReportId = catReports[0]?.id;
    const inNewest = inRecent.some((f) => f.video_id === newestReportId);
    const timesSeen = inRecent.length > 0 ? inRecent.length : rows.length;
    let status: IssueStatus;
    if (inNewest && timesSeen <= 1) status = "New";
    else if (inNewest) status = "Recurring";
    else status = "Cleaning up";
    // Last seen = the date of the newest report that contains this fault,
    // falling back to the finding's own timestamp.
    const dated = inRecent
      .map((f) => reportDate.get(f.video_id!))
      .filter((d): d is string => !!d)
      .sort()
      .pop();
    issues.push({
      fault_key: faultKey,
      category: cat,
      status,
      times_seen: timesSeen,
      reports_checked: catReports.length,
      last_seen: dated ?? dateOnly(rows[0].created_at),
      evidence: rows[0].evidence,
    });
  }
  return issues.sort((a, b) => b.last_seen.localeCompare(a.last_seen));
}

export function buildCategoryCards(reports: DevReport[], findings: DevFinding[]): CategoryCard[] {
  const byCat = reportsByCategory(reports);
  const issues = classifyIssues(reports, findings);
  const cards: CategoryCard[] = [];
  for (const [cat, reps] of byCat) {
    cards.push({
      category: cat,
      reports: reps,
      trend: trendOf((videoGradesShown() ? reps : []).map((r) => r.efficiency_score).filter((s): s is number => s != null)),
      issues: issues.filter((i) => i.category === cat),
    });
  }
  return cards.sort((a, b) => a.category.localeCompare(b.category));
}

/** Strengths and weaknesses from measured scores only, each with evidence + date. */
export function strengthsAndWeaknesses(reports: DevReport[]): {
  strengths: { text: string; evidence: string }[];
  weaknesses: { text: string; evidence: string }[];
  note: string | null;
} {
  if (!videoGradesShown()) return { strengths: [], weaknesses: [], note: `Video grades: ${VIDEO_GRADE_PLACEHOLDER}.` };
  const scored = reports.filter((r) => r.efficiency_score != null);
  if (scored.length < 2)
    return { strengths: [], weaknesses: [], note: "Not enough data yet — needs at least 2 scored reports." };
  const byCat = reportsByCategory(scored);
  const catAvg = [...byCat.entries()].map(([cat, reps]) => ({
    cat,
    avg: reps.reduce((s, r) => s + (r.efficiency_score ?? 0), 0) / reps.length,
    latest: reps[0],
    n: reps.length,
  }));
  const overall = scored.reduce((s, r) => s + (r.efficiency_score ?? 0), 0) / scored.length;
  const strengths = catAvg
    .filter((c) => c.avg > overall + 3)
    .map((c) => ({
      text: `${pretty(c.cat)} is a strength`,
      evidence: `Average score ${Math.round(c.avg)} across ${c.n} report${c.n === 1 ? "" : "s"}, latest ${dateOnly(c.latest.date)} — above this player's own average of ${Math.round(overall)}.`,
    }));
  const weaknesses = catAvg
    .filter((c) => c.avg < overall - 3)
    .map((c) => ({
      text: `${pretty(c.cat)} needs the most work`,
      evidence: `Average score ${Math.round(c.avg)} across ${c.n} report${c.n === 1 ? "" : "s"}, latest ${dateOnly(c.latest.date)} — below this player's own average of ${Math.round(overall)}.`,
    }));
  const note =
    strengths.length === 0 && weaknesses.length === 0
      ? "No category stands out yet — scores are similar across categories."
      : null;
  return { strengths, weaknesses, note };
}

/** Labeled connections — each honestly labeled by how strong the evidence is. */
export function buildConnections(reports: DevReport[], findings: DevFinding[]): Connection[] {
  const out: Connection[] = [];
  const cards = buildCategoryCards(reports, findings);
  const issues = classifyIssues(reports, findings);
  if (reports.length < 2) {
    out.push({ label: "Not enough data", text: "Fewer than 2 analysis reports — connections need more reports." });
    return out;
  }
  for (const c of cards) {
    if (c.trend === "up" || c.trend === "down") {
      out.push({
        label: "Measured change",
        text: `${pretty(c.category)} scores went ${c.trend} across the last ${c.reports.length} reports (${dateOnly(c.reports[c.reports.length - 1].date)} → ${dateOnly(c.reports[0].date)}).`,
      });
    }
  }
  for (const i of issues) {
    if (i.status === "Recurring" && i.times_seen >= 3) {
      out.push({
        label: "Supported pattern",
        text: `${pretty(i.fault_key)} has shown up in ${i.times_seen} of the last ${i.reports_checked} ${pretty(i.category).toLowerCase()} reports.`,
      });
    } else if (i.status === "New") {
      out.push({
        label: "Hypothesis to check",
        text: `${pretty(i.fault_key)} appeared for the first time in the latest ${pretty(i.category).toLowerCase()} report — watch the next video to see if it repeats.`,
      });
    }
  }
  const cleaning = issues.filter((i) => i.status === "Cleaning up");
  for (const i of cleaning) {
    out.push({
      label: "Observed fact",
      text: `${pretty(i.fault_key)} was not seen in the latest ${pretty(i.category).toLowerCase()} report (${i.last_seen} was the last time it appeared).`,
    });
  }
  if (out.length === 0) {
    out.push({ label: "Not enough data", text: "No clear connections yet — keep collecting reports." });
  }
  return out;
}

/** 1–3 takeaways with evidence and confidence. */
export function buildTakeaways(reports: DevReport[], findings: DevFinding[]): Takeaway[] {
  const out: Takeaway[] = [];
  const cards = buildCategoryCards(reports, findings);
  const issues = classifyIssues(reports, findings);
  const recurring = issues.filter((i) => i.status === "Recurring").sort((a, b) => b.times_seen - a.times_seen);
  if (recurring[0]) {
    out.push({
      text: `Keep working on ${pretty(recurring[0].fault_key).toLowerCase()} — it is the most recurring issue.`,
      evidence: `Seen in ${recurring[0].times_seen} of the last ${recurring[0].reports_checked} ${pretty(recurring[0].category).toLowerCase()} reports; latest ${recurring[0].last_seen}.`,
      confidence: recurring[0].times_seen >= 3 ? "High" : "Medium",
    });
  }
  const improving = cards.find((c) => c.trend === "up");
  if (improving) {
    out.push({
      text: `${pretty(improving.category)} is improving — keep the current work going.`,
      evidence: `Scores rose across the last ${improving.reports.length} reports (${dateOnly(improving.reports[improving.reports.length - 1].date)} → ${dateOnly(improving.reports[0].date)}).`,
      confidence: improving.reports.length >= 4 ? "High" : "Medium",
    });
  }
  const slipping = cards.find((c) => c.trend === "down");
  if (slipping && out.length < 3) {
    out.push({
      text: `${pretty(slipping.category)} scores are slipping — worth a look at the next session.`,
      evidence: `Scores fell across the last ${slipping.reports.length} reports (${dateOnly(slipping.reports[slipping.reports.length - 1].date)} → ${dateOnly(slipping.reports[0].date)}).`,
      confidence: slipping.reports.length >= 4 ? "High" : "Low",
    });
  }
  if (out.length === 0) {
    out.push({
      text: "Not enough data yet for takeaways.",
      evidence: `${reports.length} analysis report${reports.length === 1 ? "" : "s"} so far — takeaways need at least 2 reports with scores.`,
      confidence: "Low",
    });
  }
  return out.slice(0, 3);
}
