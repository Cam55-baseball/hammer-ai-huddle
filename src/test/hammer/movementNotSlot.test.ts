/**
 * Step 22 — a card's cue, dose unit and bucket come from the MOVEMENT row,
 * never from the session slot it happened to land in.
 *
 * The Copenhagen Plank bug: a plank landed in the speed session and picked up
 * the speed session's label and a sprint dose sentence. The generator now:
 *   - writes `cue` straight from the movement row,
 *   - writes the athlete-facing `why` from the movement row's own
 *     `why_prescribed`, keeping the session line as `session_context`,
 *   - takes the dose unit from the movement row (or an explicit override),
 *     never from the slot,
 *   - takes bucket / sub-bucket from the movement row.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const GEN = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");

/** The single prescription builder body, so we assert on the real code path. */
const pushBody = (() => {
  const start = GEN.indexOf("const push = (");
  expect(start).toBeGreaterThan(0);
  return GEN.slice(start, start + 12000);
})();

describe("cue comes from the movement row", () => {
  it("assigns the catalog cue verbatim", () => {
    expect(pushBody).toContain("cue: s.movement.cue");
  });

  it("never builds a cue from the slot, role or session template", () => {
    const cueAssignments = [...pushBody.matchAll(/\bcue:\s*([^,\n]+)/g)].map((m) => m[1].trim());
    expect(cueAssignments.length).toBeGreaterThan(0);
    for (const value of cueAssignments) {
      expect(value).toBe("s.movement.cue");
      expect(value).not.toMatch(/slot|role|template|session/i);
    }
  });
});

describe("the why line describes the movement, not the slot", () => {
  it("prefers the movement row's own why_prescribed", () => {
    expect(pushBody).toContain("const movementWhy = (s.movement.why_prescribed ?? \"\").trim();");
    expect(pushBody).toContain("const reasonPiece = movementWhy || slotContext");
    expect(pushBody).toContain("why_exercise: movementWhy || slotContext");
    expect(pushBody).toContain("why: movementWhy || slotContext");
  });

  it("keeps the session line as separate context, not as the movement why", () => {
    expect(pushBody).toContain("session_context: slotContext || null");
    // The old slot-first ordering must not come back.
    expect(pushBody).not.toContain("why: why || s.movement.why_prescribed");
    expect(pushBody).not.toContain("why_exercise: why || s.movement.why_prescribed");
  });
});

describe("dose unit and bucket come from the movement row", () => {
  it("resolves the dose unit from an explicit override or the catalog row", () => {
    expect(GEN).toContain('(overrides as any).dosage_unit ?? s.movement.dosage_unit ?? "reps"');
  });

  it("stamps bucket and sub-bucket from the movement row", () => {
    expect(pushBody).toContain("category: s.movement.category");
    expect(pushBody).toContain("pattern: s.movement.pattern");
  });
});
