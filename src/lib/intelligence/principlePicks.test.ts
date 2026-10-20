import { describe, it, expect } from "vitest";
import { parseConnectedWork, formatConnectedWork, principleDrillBoosts, type PrinciplePick } from "./principlePicks";

const pick = (over: Partial<PrinciplePick>): PrinciplePick => ({
  id: "v1", sport: "baseball", area: "hitting", situation: null,
  applies_when: null, not_when: null, connected_work: null, ...over,
});

describe("principle structured picks", () => {
  it("parses one drill slug per line, ignoring blanks and junk", () => {
    expect(parseConnectedWork("tee-work\n top-hand-circuit \n\nnot a slug!!\nsoft-toss")).toEqual(["tee-work", "top-hand-circuit", "soft-toss"]);
    expect(parseConnectedWork(null)).toEqual([]);
    expect(parseConnectedWork("")).toEqual([]);
  });

  it("round-trips through the formatter", () => {
    expect(parseConnectedWork(formatConnectedWork(["a-drill", "b-drill"]))).toEqual(["a-drill", "b-drill"]);
  });

  it("boosts only exact sport + category + drill matches", () => {
    const picks = [
      pick({ id: "a", connected_work: "tee-work" }),
      pick({ id: "b", sport: "softball", connected_work: "tee-work" }),
      pick({ id: "c", area: "throwing", connected_work: "tee-work" }),
      pick({ id: "d", connected_work: "other-drill" }),
    ];
    expect(principleDrillBoosts(picks, "tee-work", "baseball", "hitting").map(p => p.id)).toEqual(["a"]);
    expect(principleDrillBoosts(picks, "tee-work", "softball", "hitting").map(p => p.id)).toEqual(["b"]);
    expect(principleDrillBoosts(picks, "missing", "baseball", "hitting")).toEqual([]);
  });
});
