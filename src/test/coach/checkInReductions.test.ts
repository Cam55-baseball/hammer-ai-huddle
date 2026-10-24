import { describe, expect, it } from "vitest";
import { checkInReductions, latestCheckInValues } from "../../../supabase/functions/_shared/wic/checkInReductions";
describe("existing generator check-in reductions shared with coach", () => {
  it("sleep under six hours takes the existing one cap step", () => { expect(checkInReductions(6, { sleep_hours: 5 }).cnsCap).toBe(5); expect(checkInReductions(6, { sleep_hours: 6 }).cnsCap).toBe(6); });
  it("readiness four takes the existing step", () => { expect(checkInReductions(6, { cns_readiness: 4 }).cnsCap).toBe(5); });
  it("rest intent never stacks on sleep or readiness", () => { expect(checkInReductions(6, { sleep_hours: 5, cns_readiness: 4 }, "rest").cnsCap).toBe(4); expect(checkInReductions(6, {}, "rest").cnsCap).toBe(5); });
  it("push and skip grant no new workload", () => { expect(checkInReductions(6, {}, "push").cnsCap).toBe(6); expect(checkInReductions(6, {}, "skip").cnsCap).toBe(6); });
  it("takes latest canonical answer without inventing a missing score", () => { expect(latestCheckInValues([{ topic_id: "behavioral.readiness", payload: { score: 4 } }, { topic_id: "behavioral.readiness", payload: { score: 8 } }])).toEqual({ cns_readiness: 4 }); expect(latestCheckInValues([{ topic_id: "behavioral.readiness", payload: {} }])).toBeNull(); });
});