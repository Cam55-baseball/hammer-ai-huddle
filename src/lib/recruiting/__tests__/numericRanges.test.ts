import { describe, expect, it } from "vitest";
import {
  GRADE_RANGE,
  NO_MAX,
  NO_MIN,
  formatHeight,
  isInvertedRange,
  optionsForField,
  rangeToCriteria,
} from "../numericRanges";

describe("height options", () => {
  const h = optionsForField("height_inches", "number")!;

  it("starts at <3' and lists every inch to 8'0\"", () => {
    expect(h.min[0]).toMatchObject({ label: "<3'", unbounded: true });
    expect(h.min[1].label).toBe("3'0\"");
    expect(h.min[h.min.length - 1].label).toBe("8'0\"");
    // 36..96 inclusive = 61 values, plus the bookend.
    expect(h.min).toHaveLength(62);
  });

  it("mirrors on the max side and tops out at 8'+", () => {
    expect(h.max[0].label).toBe("3'0\"");
    expect(h.max[h.max.length - 1]).toMatchObject({ label: "8'+", unbounded: true });
  });

  it("formats inches as feet and inches", () => {
    expect(formatHeight(74)).toBe("6'2\"");
  });
});

describe("every numeric field has paired options", () => {
  it.each(["height_inches", "weight", "age", "gpa", "graduation_year"])("%s", (key) => {
    const o = optionsForField(key, "number");
    expect(o).not.toBeNull();
    expect(o!.min.length).toBeGreaterThan(3);
    expect(o!.max.length).toBeGreaterThan(3);
  });

  it("grades use the 20-80 scale", () => {
    expect(GRADE_RANGE.min.some((o) => o.label === "20")).toBe(true);
    expect(GRADE_RANGE.max[GRADE_RANGE.max.length - 1].label).toBe("80+");
    expect(optionsForField("fastball_grade", "grade")).toBe(GRADE_RANGE);
  });

  it("leaves text fields alone", () => {
    expect(optionsForField("state", "text")).toBeNull();
  });
});

describe("rangeToCriteria", () => {
  it("min only → at least", () => {
    expect(rangeToCriteria(74, null)).toEqual([{ operator: "gte", value: 74 }]);
  });
  it("max only → at most", () => {
    expect(rangeToCriteria(null, 78)).toEqual([{ operator: "lte", value: 78 }]);
  });
  it("same both sides → exact", () => {
    expect(rangeToCriteria(74, 74)).toEqual([{ operator: "eq", value: 74 }]);
  });
  it("true range → two rows", () => {
    expect(rangeToCriteria(72, 78)).toEqual([
      { operator: "gte", value: 72 },
      { operator: "lte", value: 78 },
    ]);
  });
  it("open-ended bookends apply no bound", () => {
    expect(rangeToCriteria(NO_MIN, 78)).toEqual([{ operator: "lte", value: 78 }]);
    expect(rangeToCriteria(72, NO_MAX)).toEqual([{ operator: "gte", value: 72 }]);
    expect(rangeToCriteria(NO_MIN, NO_MAX)).toEqual([]);
  });
  it("nothing picked → nothing added", () => {
    expect(rangeToCriteria(null, null)).toEqual([]);
  });
  it("inverted range is rejected", () => {
    expect(isInvertedRange(78, 72)).toBe(true);
    expect(rangeToCriteria(78, 72)).toEqual([]);
    expect(isInvertedRange(NO_MIN, 72)).toBe(false);
  });
});
