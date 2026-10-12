// Pure helpers for the scout "Compare players" view (2–4 players).
// Shows only what each family shared; never fabricates; warns when unfair.
import type { ScoutProfileData } from "@/components/scout/ScoutProfileTabs";

export const NM = "Not yet measured";
export const NOT_SHARED = "Not shared";

export interface CompareColumn {
  id: string;
  name: string;
  position: string | null;
  level: string | null;
  gradYear: number | null;
  sharedMetrics: boolean;
  testCount: number;
  latestTest: { type: string; date: string; verified: boolean; values: string } | null;
  latestGrade: { grade: number | null; date: string | null; source: string | null } | null;
  reportCount: number | null; // null = video not shared
}

const day = (x?: string | null) => (x ? String(x).slice(0, 10) : null);

export function toColumn(id: string, p: ScoutProfileData | null | undefined): CompareColumn {
  const o = p?.shared.profile ? p.overview : null;
  const tests = p?.shared.metrics ? [...(p.tests ?? [])].sort((a, b) => String(b.test_date).localeCompare(String(a.test_date))) : [];
  const t = tests[0];
  const grades = p?.shared.metrics ? [...(p.grades ?? [])].sort((a, b) => String(b.graded_at ?? "").localeCompare(String(a.graded_at ?? ""))) : [];
  const g = grades[0];
  const gy = Number(o?.grad_year);
  return {
    id,
    name: (o?.full_name as string) || "Player (name not shared)",
    position: (o?.primary_position as string) || null,
    level: (o?.level as string) || null,
    gradYear: Number.isFinite(gy) && gy > 0 ? gy : null,
    sharedMetrics: !!p?.shared.metrics,
    testCount: tests.length,
    latestTest: t
      ? {
          type: t.test_type.replace(/_/g, " "),
          date: day(t.test_date) ?? "date not recorded",
          verified: (t.results as any)?._verified === "in_person",
          values: Object.entries(t.results ?? {}).filter(([k]) => !k.startsWith("_")).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", "),
        }
      : null,
    latestGrade: g ? { grade: g.overall_grade ?? null, date: day(g.graded_at), source: g.grade_source ?? null } : null,
    reportCount: p?.shared.video ? (p.reports?.length ?? 0) : null,
  };
}

export function scoutFairnessWarnings(cols: CompareColumn[]): string[] {
  const w: string[] = [];
  if (cols.length < 2) return w;
  const norm = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/[\s_]+/g, " ");
  if (new Set(cols.map((c) => norm(c.position)).filter(Boolean)).size > 1)
    w.push("These players play different positions — their numbers measure different things.");
  if (new Set(cols.map((c) => norm(c.level)).filter(Boolean)).size > 1)
    w.push("These players compete at different levels — compare with care.");
  const years = cols.map((c) => c.gradYear).filter((y): y is number => y !== null);
  if (years.length >= 2) {
    const gap = Math.max(...years) - Math.min(...years);
    if (gap >= 2) w.push(`Grad years ${gap} years apart — older players are often simply more developed.`);
  }
  const tested = cols.filter((c) => c.latestTest);
  if (tested.some((c) => c.latestTest!.verified) && tested.some((c) => !c.latestTest!.verified))
    w.push("Some latest tests were verified in person and some were athlete-entered.");
  const notShared = cols.filter((c) => !c.sharedMetrics);
  if (notShared.length)
    w.push(`${notShared.map((c) => c.name).join(", ")} ${notShared.length === 1 ? "hasn't" : "haven't"} shared stats with you, so tests and grades can't be compared.`);
  const thin = cols.filter((c) => c.sharedMetrics && c.testCount < 2);
  if (thin.length)
    w.push(`${thin.map((c) => c.name).join(", ")} ${thin.length === 1 ? "has" : "have"} fewer than 2 logged tests — not enough data yet for a fair comparison.`);
  return w;
}
