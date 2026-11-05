import { describe, it, expect } from "vitest";
import { legacyDrillLogSpec } from "@/lib/hammer/prescription/legacyDrillLog";
const ITEMS: [string, string, number | null, number][] = [
  ["Build-up catch — feel (45 ft)", "45ft x 10 throws", 10, 1],
  ["Build-up catch — today's top step (120 ft)", "120ft x 8 throws · easy, pain-free", 8, 1],
  ["Catch play", "60ft x 15 throws at 60%", 15, 1],
  ["Long toss (inside catch play) — extension", "to 120ft x 12 throws at 75%", 12, 1],
  ["Light catch — injury-limited", "45ft x 10 throws", 10, 1],
  ["Warm-up throws — easy to building", "Start your first throws easy and build up. Not extra throws.", null, 1],
  ["Tennis-ball whip throws — teach fast-object finish", "3x8 throws with intent focus", 8, 3],
  ["Arm-strength day — pull-downs", "90ft x 5 throws", 5, 1],
];
describe("locked by owner Nov 5: throwing items log in throws and carry the button", () => {
  for (const [name, dose, throws, rows] of ITEMS) it(name, () => {
    for (const modality of ["warmup", "throwing", "defense"]) {
      const s = legacyDrillLogSpec(modality, name, dose);
      expect(s.throwing).toBe(true);
      expect(s.fields.map(f => f.key)).toEqual(["throws"]);
      expect(s.fields[0].prefill).toBe(throws);
      expect(s.rows).toBe(rows);
    }
  });
  it("arm-care band work is not a throwing item", () =>
    expect(legacyDrillLogSpec("warmup", "Arm prep — Band series — ER / IR", "ER 1x12, IR 1x12").throwing).toBeUndefined());
});
