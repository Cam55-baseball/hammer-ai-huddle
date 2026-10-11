/**
 * Phase 4 rules:
 * 1. Game pitches merge into the arm ledger additively — same date adds up,
 *    never replaces practice counts.
 * 2. Spray dots come only from real logged directions — missing or unknown
 *    directions are skipped, never fabricated.
 */
import { describe, it, expect } from "vitest";
import { mergePitchLogs } from "@/lib/throwing/armLedgerEntry";
import { sprayBalls, sprayOffset, SPRAY_SPOTS } from "@/lib/games/spray";

describe("mergePitchLogs", () => {
  it("adds game pitches to bullpen pitches on the same date", () => {
    const merged = mergePitchLogs(
      [{ plan_date: "2026-10-10", pitches: 30 }],
      [{ plan_date: "2026-10-10", pitches: 55 }],
    );
    expect(merged).toEqual([{ plan_date: "2026-10-10", pitches: 85 }]);
  });

  it("keeps separate dates separate and drops empty rows", () => {
    const merged = mergePitchLogs(
      [{ plan_date: "2026-10-09", pitches: 25 }, { plan_date: "", pitches: 10 }],
      [{ plan_date: "2026-10-10", pitches: 40 }, { plan_date: "2026-10-10", pitches: 0 }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.plan_date === "2026-10-10")?.pitches).toBe(40);
  });
});

describe("sprayBalls", () => {
  it("keeps only real logged directions", () => {
    const balls = sprayBalls([
      { exit_direction: "LF", batted_ball_type: "line_drive" },
      { exit_direction: "cf", batted_ball_type: "fly" },
      { exit_direction: null, batted_ball_type: "grounder" },
      { exit_direction: "NOWHERE", batted_ball_type: null },
      { exit_direction: "SS", batted_ball_type: "" },
    ]);
    expect(balls).toHaveLength(3);
    expect(balls[0]).toEqual({ direction: "LF", type: "line_drive" });
    expect(balls[1]).toEqual({ direction: "CF", type: "fly" });
    expect(balls[2]).toEqual({ direction: "SS", type: null });
    for (const b of balls) expect(SPRAY_SPOTS[b.direction]).toBeDefined();
  });

  it("sprayOffset is deterministic and spreads duplicates", () => {
    expect(sprayOffset(0)).toEqual({ dx: 0, dy: 0 });
    expect(sprayOffset(2)).toEqual(sprayOffset(2));
    expect(sprayOffset(1)).not.toEqual(sprayOffset(2));
  });
});
