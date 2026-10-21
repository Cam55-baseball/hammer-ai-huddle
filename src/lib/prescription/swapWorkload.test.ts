import { describe, expect, it } from "vitest";
import { sameOrLowerSwapWorkload } from "./swapWorkload";

const source = { cns_cost: 2, volume_cost: 3, contacts_per_rep: 1 };
describe("universal Swap workload channels", () => {
  it("preserves the 30-rep session's maximum 30 contacts, not a different contacts-per-rep dose", () => {
    expect(sameOrLowerSwapWorkload(source, { ...source, contacts_per_rep: 1 })).toBe(true);
    expect(sameOrLowerSwapWorkload(source, { ...source, contacts_per_rep: 2 })).toBe(false);
  });
  it("lower CNS cost cannot compensate for higher volume or contacts", () => {
    expect(sameOrLowerSwapWorkload(source, { cns_cost: 1, volume_cost: 4, contacts_per_rep: 1 })).toBe(false);
    expect(sameOrLowerSwapWorkload(source, { cns_cost: 1, volume_cost: 2, contacts_per_rep: 2 })).toBe(false);
    expect(sameOrLowerSwapWorkload(source, { cns_cost: 1, volume_cost: 2, contacts_per_rep: 0 })).toBe(true);
  });
  it("missing, null, negative and non-finite costs are not zero on either side", () => {
    for (const channel of ["cns_cost", "volume_cost", "contacts_per_rep"] as const) {
      for (const value of [undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(sameOrLowerSwapWorkload(source, { ...source, [channel]: value })).toBe(false);
        expect(sameOrLowerSwapWorkload({ ...source, [channel]: value }, source)).toBe(false);
      }
    }
  });
});