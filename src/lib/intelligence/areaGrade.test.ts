import { describe, it, expect } from "vitest";
import { areaGrade } from "./areaGrade";
describe("areaGrade", () => {
  it("maps 0/50/100 to 20/50/80", () => {
    expect(areaGrade(0).grade).toBe(20); expect(areaGrade(50).grade).toBe(50); expect(areaGrade(100).grade).toBe(80);
  });
  it("always lands on a multiple of 5", () => { expect(areaGrade(57).grade % 5).toBe(0); });
  it("bands: under 40 Sub Par, 40–60 Acceptable, 65+ Elite", () => {
    expect(areaGrade(20).band).toBe("Sub Par"); expect(areaGrade(40).band).toBe("Acceptable");
    expect(areaGrade(75).band).toBe("Elite");
  });
});
