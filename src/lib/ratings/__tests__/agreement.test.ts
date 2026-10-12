import { describe, it, expect } from "vitest";
import { agreementRates } from "../agreement";
describe("agreement rates", () => {
  it("groups by test, metric, sport, position and computes the rate", () => {
    const g = agreementRates([
      { test_key: "t", metric_key: "m", sport: "baseball", position: "SS", agree: true },
      { test_key: "t", metric_key: "m", sport: "baseball", position: "SS", agree: false },
      { test_key: "t", metric_key: "m", sport: "softball", position: "SS", agree: true },
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ sport: "baseball", total: 2, agreed: 1, rate: 0.5 });
  });
});
