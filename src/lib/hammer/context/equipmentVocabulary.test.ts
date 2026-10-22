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
    expect([...p.have].sort()).toEqual(["net", "screen", "tee"]);
    expect(p.scope).toBe("persistent");
  });

  it("parses a bare list", () => {
    const p = parseEquipmentStatement("tee, net, dumbbells");
    expect(p.confidence).toBe("high");
    expect([...p.have].sort()).toEqual(["dumbbell", "net", "tee"]);
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

describe("honest reporting of unrecognised items", () => {
  it("retains a declared pitching rubber without assuming a mound", () => {
    const parsed = parseEquipmentStatement("I have a pitching rubber");
    expect(parsed.have).toEqual(["pitching_rubber"]);
    expect(mergeEquipment([], parsed)).toEqual(["pitching_rubber"]);
  });
  it("retains explicitly declared farmer handles without assuming dumbbells", () => {
    const parsed = parseEquipmentStatement("I have farmer handles");
    expect(parsed.have).toEqual(["farmer_handles"]);
    expect(mergeEquipment([], parsed)).toEqual(["farmer_handles"]);
    expect(parsed.unrecognized).toEqual([]);
  });
  it("retains a declared partner and treadmill without assuming either exists", () => {
    const parsed = parseEquipmentStatement("I have a partner and a treadmill");
    expect(parsed.have).toEqual(["partner", "treadmill"]);
    expect(mergeEquipment([], parsed)).toEqual(["partner", "treadmill"]);
    expect(parseEquipmentStatement("I have a tee").have).not.toContain("partner");
  });
  it("remembers the corrected safety bar and pull-up support requirements", () => {
    const parsed = parseEquipmentStatement("I have a safety squat bar and a pull-up bar");
    expect(parsed.have).toContain("safety_bar");
    expect(parsed.have).toContain("pull_up_bar");
  });
  it("saves the machine and never drops it", () => {
    const p = parseEquipmentStatement("I have a machine, regular bat, heavy bat, light bat, and tee");
    expect([...p.have].sort()).toEqual(
      ["gamer_bat", "overload_bat", "pitching_machine", "tee", "underload_bat"],
    );
    expect(p.unrecognized).toEqual([]);
  });

  it("reports an item the vocabulary does not know", () => {
    const p = parseEquipmentStatement("I have a tee and a zorbtronic thing");
    expect(p.have).toContain("tee");
    expect(p.unrecognized.join(" ")).toContain("zorbtronic");
  });

  it("does not treat ordinary conversation as unrecognised gear", () => {
    expect(parseEquipmentStatement("how is my swing looking?").unrecognized).toEqual([]);
  });
});
