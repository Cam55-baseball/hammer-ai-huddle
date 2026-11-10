import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildShadowInputs } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { POOR_RECOVERY_MAX, isPoorRecovery } from "@/lib/readiness/recoveryScale";
import {
  ARCHIVED_FIELDS,
  isArchivedCatchingMetric,
  withoutArchivedCatchingRows,
  withoutArchivedDefenseFields,
} from "@/lib/measure/archivedFields";
import { deriveDefensivePlayMetrics } from "@/hooks/useDefensivePlays";
import { METRICS, ALIASES } from "../../../supabase/functions/_shared/ledger/metricDictionary";

function shadowWithRecovery(perceived_recovery: number | null) {
  // Minimal raw input: one check-in, everything else empty.
  const raw: any = {
    today: "2026-03-10",
    quizzes: [{ entry_date: "2026-03-09", perceived_recovery }],
  };
  for (const k of ["lifts", "practices", "games", "throws", "sprints", "dailyLogs", "pitcherOutings", "speedSessions", "plays", "templates", "exposures", "sessions"]) raw[k] ??= [];
  return buildShadowInputs(raw);
}

describe("Owner Nov 9 round 4 — one recovery cutoff", () => {
  it("the single cutoff is 4 or below on the 1–10 scale", () => {
    expect(POOR_RECOVERY_MAX).toBe(4);
    expect(isPoorRecovery(4)).toBe(true);
    expect(isPoorRecovery(5)).toBe(false);
    expect(isPoorRecovery(null)).toBeNull();
  });

  it("injury-risk planner: recovery 4 counts as high soreness (was only ≤3)", () => {
    expect(shadowWithRecovery(4).checkIns[0]).toMatchObject({ highSoreness: true });
  });

  it("injury-risk planner: recovery 5 is not high soreness", () => {
    expect(shadowWithRecovery(5).checkIns[0]).toMatchObject({ highSoreness: false });
  });

  it("injury-risk planner: a missing recovery answer is never high soreness", () => {
    expect(shadowWithRecovery(null).checkIns[0]).toMatchObject({ highSoreness: false });
  });

  it("no hard-coded recovery cutoff remains in the planner, the app hooks or recommend-workout", () => {
    const adapter = readFileSync("supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter.ts", "utf8");
    expect(adapter).not.toMatch(/recovery\s*<=\s*3/);
    for (const f of ["src/hooks/useUnifiedDataSync.ts", "src/hooks/useWorkoutRecommendations.ts", "supabase/functions/recommend-workout/index.ts"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/[Rr]ecovery\s*(<=|<)\s*[1-3]\b/);
    }
  });
});

describe("Owner Nov 9 round 4 — three fields parked until CV", () => {
  it("lists exactly the three parked fields", () => {
    expect(ARCHIVED_FIELDS.map((f) => f.id)).toEqual([
      "defense.distance_to_cover",
      "catching.framing_strikes_above_expected",
      "catching.block_success",
    ]);
  });

  it("none of them is in the metric dictionary", () => {
    const keys = new Set(METRICS.map((m: any) => m.key));
    const aliasText = JSON.stringify(ALIASES);
    for (const k of ["distance_to_cover", "framing_strikes_above_expected", "block_success", "framing"]) {
      expect(keys.has(k)).toBe(false);
      expect(aliasText).not.toContain(k);
    }
  });

  it("distance to cover never feeds catch probability, even when given", () => {
    const d = deriveDefensivePlayMetrics({ hangTimeSec: 4, distanceToCoverFt: 40, totalPlayTimeSec: null, outcome: "out", batterHand: "R" }, []);
    expect(d.catchProbability).toBeNull();
    expect(d.oaeCredit).toBeNull();
  });

  it("stored defensive rows read with distance and its derived numbers excluded", () => {
    const row = { id: "x", distance_to_cover: 45, catch_probability: 0.8, oae_credit: 0.2, hang_time_sec: 3.4 };
    const out = withoutArchivedDefenseFields(row);
    expect(out).toMatchObject({ distance_to_cover: null, catch_probability: null, oae_credit: null, hang_time_sec: 3.4 });
    expect(row.distance_to_cover).toBe(45); // the stored value itself is untouched
  });

  it("archived catching rows are excluded from reads; active metrics stay", () => {
    const rows = [{ metric: "pop_time_sec" }, { metric: "framing_strikes_above_expected" }, { metric: "block_success" }, { metric: "exchange_time_sec" }];
    expect(withoutArchivedCatchingRows(rows).map((r) => r.metric)).toEqual(["pop_time_sec", "exchange_time_sec"]);
    expect(isArchivedCatchingMetric("block_success")).toBe(true);
    expect(isArchivedCatchingMetric("pop_time_sec")).toBe(false);
  });

  it("entry screens no longer offer the three inputs", () => {
    const defense = readFileSync("src/pages/DefensivePlayEntry.tsx", "utf8");
    expect(defense).not.toMatch(/htmlFor="distance"|Ground to cover \(ft\)/);
    const catching = readFileSync("src/pages/CatchingRepEntry.tsx", "utf8");
    expect(catching).toMatch(/CATCHING_METRICS\.filter\(\(m\) => !isArchivedCatchingMetric\(m\)\)/);
    const practice = readFileSync("src/components/practice/CatchingRepFields.tsx", "utf8");
    expect(practice).not.toMatch(/onChange\('block_success'/);
    const list = readFileSync("src/components/defense/DefensivePlayList.tsx", "utf8");
    expect(list).not.toMatch(/distance_to_cover/);
  });
});
