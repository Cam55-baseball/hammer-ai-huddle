import { describe, it, expect } from "vitest";
import {
  normalizeInjuryHistory,
  injuryHistoryToText,
  isInjuryHistoryEmpty,
} from "@/lib/hammer/context/normalizers";

describe("normalizeInjuryHistory", () => {
  it("returns [] for null/undefined", () => {
    expect(normalizeInjuryHistory(null)).toEqual([]);
    expect(normalizeInjuryHistory(undefined)).toEqual([]);
  });

  it("returns [] for empty string and 'none'/'no'", () => {
    expect(normalizeInjuryHistory("")).toEqual([]);
    expect(normalizeInjuryHistory("   ")).toEqual([]);
    expect(normalizeInjuryHistory("none")).toEqual([]);
    expect(normalizeInjuryHistory("None")).toEqual([]);
    expect(normalizeInjuryHistory("No")).toEqual([]);
  });

  it("wraps a free-text string into a single note", () => {
    expect(normalizeInjuryHistory("ACL 2022")).toEqual([{ note: "ACL 2022" }]);
  });

  it("normalizes string arrays (PhysioHealthIntakeDialog legacy)", () => {
    expect(normalizeInjuryHistory(["ACL 2022", "rotator cuff"])).toEqual([
      { note: "ACL 2022" },
      { note: "rotator cuff" },
    ]);
  });

  it("normalizes object arrays (Hammer onboarding) and keeps optional fields", () => {
    const res = normalizeInjuryHistory([
      { note: "Shoulder twinge", region: "shoulder", severity: "mild" },
      { region: "elbow" }, // note missing → fall back to region
      { note: "  " }, // empty after trim → skipped
      null,
      "trailing string",
    ]);
    expect(res).toEqual([
      { note: "Shoulder twinge", region: "shoulder", severity: "mild" },
      { note: "elbow", region: "elbow" },
      { note: "trailing string" },
    ]);
  });

  it("handles a single object input", () => {
    expect(normalizeInjuryHistory({ note: "Back tight" })).toEqual([
      { note: "Back tight" },
    ]);
  });

  it("returns [] for an unrecognised object", () => {
    expect(normalizeInjuryHistory({ foo: "bar" })).toEqual([]);
  });
});

describe("injuryHistoryToText", () => {
  it("produces a lowercased flat blob safe for region matching", () => {
    const txt = injuryHistoryToText([
      { note: "Shoulder twinge", region: "shoulder" },
      "Hamstring strain",
    ]);
    expect(txt).toContain("shoulder");
    expect(txt).toContain("hamstring");
    expect(txt).toBe(txt.toLowerCase());
  });

  it("returns '' for empty/none inputs", () => {
    expect(injuryHistoryToText(null)).toBe("");
    expect(injuryHistoryToText("none")).toBe("");
    expect(injuryHistoryToText([])).toBe("");
  });
});

describe("isInjuryHistoryEmpty", () => {
  it("is true for null/none/empty array, false otherwise", () => {
    expect(isInjuryHistoryEmpty(null)).toBe(true);
    expect(isInjuryHistoryEmpty("none")).toBe(true);
    expect(isInjuryHistoryEmpty([])).toBe(true);
    expect(isInjuryHistoryEmpty("ACL")).toBe(false);
    expect(isInjuryHistoryEmpty([{ note: "x" }])).toBe(false);
  });
});
