/**
 * topicVariables — extracts whitelisted numeric series per topic from
 * loaded ASB command rows. Each series is a Map<dateYYYY-MM-DD, number>.
 *
 * Trust-first: only Release-1 trusted signals. No LLM-inferred metrics.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import type { ExplorerVariable } from "@/components/progress/correlations/CorrelationExplorer";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function extractNumeric(
  rows: ReadonlyArray<AsbEventRow>,
  matcher: (r: AsbEventRow) => number | null,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const v = matcher(r);
    if (typeof v === "number" && Number.isFinite(v)) {
      out.set(dayKey(r.occurred_at), v);
    }
  }
  return out;
}

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function buildTopicVariables(
  rows: ReadonlyArray<AsbEventRow>,
  topic: "pitching" | "readiness" | "workload" | "goals",
): ExplorerVariable[] {
  const vars: ExplorerVariable[] = [];

  if (topic === "pitching") {
    vars.push({
      key: "tempo_sec",
      label: "Tempo (s)",
      series: extractNumeric(rows, (r) => {
        if (!r.topic_id?.includes("tempo")) return null;
        const p = r.payload as Record<string, unknown> | null;
        return num(p?.tempo_sec) ?? num(p?.value);
      }),
    });
  }

  if (topic === "readiness" || topic === "pitching" || topic === "workload") {
    vars.push({
      key: "readiness",
      label: "Readiness",
      series: extractNumeric(rows, (r) => {
        if (!r.topic_id?.includes("readiness")) return null;
        const p = r.payload as Record<string, unknown> | null;
        return num(p?.readiness_score) ?? num(p?.score);
      }),
    });
    vars.push({
      key: "sleep_hours",
      label: "Sleep (hours)",
      series: extractNumeric(rows, (r) => {
        if (!r.topic_id?.includes("sleep") && !r.topic_id?.includes("recovery")) return null;
        const p = r.payload as Record<string, unknown> | null;
        return num(p?.sleep_hours) ?? num(p?.hours);
      }),
    });
    vars.push({
      key: "fatigue",
      label: "Fatigue",
      series: extractNumeric(rows, (r) => {
        if (!r.topic_id?.includes("fatigue")) return null;
        const p = r.payload as Record<string, unknown> | null;
        return num(p?.fatigue_score) ?? num(p?.value);
      }),
    });
  }

  if (topic === "workload") {
    vars.push({
      key: "session_count",
      label: "Sessions/day",
      series: (() => {
        const m = new Map<string, number>();
        for (const r of rows) {
          if (!r.topic_id?.includes("session")) continue;
          const d = dayKey(r.occurred_at);
          m.set(d, (m.get(d) ?? 0) + 1);
        }
        return m;
      })(),
    });
  }

  if (topic === "goals") {
    vars.push({
      key: "mood",
      label: "Mood",
      series: extractNumeric(rows, (r) => {
        if (!r.topic_id?.includes("mood") && !r.topic_id?.includes("mind")) return null;
        const p = r.payload as Record<string, unknown> | null;
        return num(p?.mood_score) ?? num(p?.value);
      }),
    });
    vars.push({
      key: "goal_progress",
      label: "Goal events/day",
      series: (() => {
        const m = new Map<string, number>();
        for (const r of rows) {
          if (!r.topic_id?.includes("goal")) continue;
          const d = dayKey(r.occurred_at);
          m.set(d, (m.get(d) ?? 0) + 1);
        }
        return m;
      })(),
    });
  }

  // Always include readiness/sleep cross-cut if not already present
  return vars.filter(
    (v, i, arr) => arr.findIndex((x) => x.key === v.key) === i,
  );
}
