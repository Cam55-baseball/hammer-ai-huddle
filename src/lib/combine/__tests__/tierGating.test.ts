import { describe, expect, it } from "vitest";

import { COMBINE_EVENTS } from "../events";
import {
  combineEventsForTier,
  isCombineEventIncluded,
  type CombineGateResult,
} from "../tierGating";

type Excluded = Extract<CombineGateResult, { included: false }>;

function excluded(r: CombineGateResult): Excluded {
  if (r.included) throw new Error("expected the event to be excluded");
  return r as never as Excluded;
}

describe("combine tier gating", () => {
  it("gives golden2way every event", () => {
    expect(combineEventsForTier("golden2way")).toEqual([...COMBINE_EVENTS]);
  });

  it("gives pitcher only the pitching-velocity events", () => {
    expect(combineEventsForTier("pitcher")).toEqual(["bullpen_velocity"]);
  });

  it("gives 5tool everything except pitching velocity", () => {
    const events = combineEventsForTier("5tool");
    expect(events).not.toContain("bullpen_velocity");
    expect(events).toContain("exit_velocity");
    expect(events).toContain("pop_time");
    expect(events).toHaveLength(COMBINE_EVENTS.length - 1);
  });

  it("excludes bullpen_velocity for 5tool with a reason", () => {
    const r = excluded(isCombineEventIncluded("5tool", "bullpen_velocity"));
    expect(r.reason).toBe("tier_excludes_event");
    expect(r.message).toContain("Complete Pitcher");
  });

  it("excludes non-pitching events for pitcher with a reason", () => {
    const r = excluded(isCombineEventIncluded("pitcher", "broad_jump"));
    expect(r.reason).toBe("tier_excludes_event");
    expect(r.message).toContain("5Tool");
  });

  it("never grants access on an unknown tier", () => {
    for (const tier of [null, undefined, "", "free", "pro"]) {
      const r = excluded(isCombineEventIncluded(tier, "broad_jump"));
      expect(r.reason).toBe("unknown_tier");
    }
    expect(combineEventsForTier("free")).toEqual([]);
  });

  it("never grants access on an unknown event", () => {
    const r = excluded(isCombineEventIncluded("golden2way", "sixty_yard_dash"));
    expect(r.reason).toBe("unknown_event");
  });

});
