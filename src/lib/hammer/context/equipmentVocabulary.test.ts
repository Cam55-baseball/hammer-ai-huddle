import { describe, expect, it } from "vitest";
import {
  equipmentList,
  isAffirmation,
  mergeEquipment,
  parseEquipmentStatement,
} from "./equipmentVocabulary";

describe("parseEquipmentStatement", () => {
  it("parses a confident possession statement", () => {
    const p = parseEquipmentStatement("I have a tee, a net and a front toss screen");
    expect(p.confidence).toBe("high");
    expect(p.have.sort()).toEqual(["net", "screen", "tee"]);
    expect(p.scope).toBe("persistent");
  });

  it("parses a bare list", () => {
    const p = parseEquipmentStatement("tee, net, dumbbells");
    expect(p.confidence).toBe("high");
    expect(p.have.sort()).toEqual(["dumbbell", "net", "tee"]);
  });

  it("handles negation per clause", () => {
    const p = parseEquipmentStatement("I have a tee but no net");
    expect(p.have).toContain("tee");
    expect(p.lacks).toContain("net");
    expect(p.have).not.toContain("net");
  });

  it("flags hedged statements as low confidence", () => {
    const p = parseEquipmentStatement("I think I might have a tee somewhere");
    expect(p.confidence).toBe("low");
  });

  it("returns none when nothing recognisable was said", () => {
    expect(parseEquipmentStatement("how is my swing looking?").confidence).toBe("none");
  });

  it("detects a temporary scope", () => {
    expect(parseEquipmentStatement("today I only have bands, I'm in a hotel").scope).toBe("session");
  });

  it("merges without replacing existing gear", () => {
    expect(mergeEquipment(["tee"], { have: ["net"], lacks: [] }).sort()).toEqual(["net", "tee"]);
  });

  it("removes negated gear on merge", () => {
    expect(mergeEquipment(["tee", "net"], { have: [], lacks: ["net"] })).toEqual(["tee"]);
  });

  it("bodyweight-only replaces the inventory", () => {
    expect(mergeEquipment(["tee", "net"], { have: ["bodyweight"], lacks: [] })).toEqual(["bodyweight"]);
  });

  it("never returns a raw identifier in athlete-facing copy", () => {
    expect(equipmentList(["tee", "net", "screen"])).toBe("hitting tee, net or cage and front toss screen");
  });

  it("recognises affirmations", () => {
    expect(isAffirmation("yes")).toBe(true);
    expect(isAffirmation("nope")).toBe(false);
  });
});
