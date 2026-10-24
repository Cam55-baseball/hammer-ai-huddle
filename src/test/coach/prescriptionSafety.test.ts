import { describe, it, expect } from "vitest";
import {
  checkPrescriptionReplace,
  categorySlots,
  type RxReplaceFacts,
} from "../../../supabase/functions/_shared/coach/prescriptionSafety";

const base: RxReplaceFacts = {
  category: "hitting",
  date: "2026-10-24",
  intensity: "standard",
  throwing: false,
  isRestDay: false,
  gameOnDate: false,
  gameNextDay: false,
  inSeason: false,
  nextThrowDate: null,
  injuryMode: false,
  hasCard: true,
};

describe("coach prescription replace safety", () => {
  it("allows a normal same-category replace", () => {
    const r = checkPrescriptionReplace(base);
    expect(r.verdict).toBe("allow");
    expect(r.safeOption).toBeNull();
  });

  it("blocks replace on a rest day and offers save-for-later", () => {
    const r = checkPrescriptionReplace({ ...base, isRestDay: true });
    expect(r.verdict).toBe("alongside_only");
    expect(r.reasons.join(" ")).toMatch(/rest day/);
  });

  it("blocks throwing replace before the pitch-count rest date", () => {
    const r = checkPrescriptionReplace({
      ...base,
      category: "pitching",
      throwing: true,
      nextThrowDate: "2026-10-26",
    });
    expect(r.verdict).toBe("alongside_only");
    expect(r.safeOption).toMatch(/2026-10-26/);
  });

  it("allows throwing on the rest date itself", () => {
    const r = checkPrescriptionReplace({
      ...base,
      category: "pitching",
      throwing: true,
      nextThrowDate: "2026-10-24",
    });
    expect(r.verdict).toBe("allow");
  });

  it("game day allows only light replacements", () => {
    expect(checkPrescriptionReplace({ ...base, gameOnDate: true }).verdict).toBe("alongside_only");
    expect(checkPrescriptionReplace({ ...base, gameOnDate: true, intensity: "light" }).verdict).toBe("allow");
  });

  it("in season blocks high intensity the day before a game", () => {
    expect(
      checkPrescriptionReplace({ ...base, inSeason: true, gameNextDay: true, intensity: "high" }).verdict,
    ).toBe("alongside_only");
    expect(
      checkPrescriptionReplace({ ...base, inSeason: false, gameNextDay: true, intensity: "high" }).verdict,
    ).toBe("allow");
  });

  it("injury mode blocks replacement", () => {
    const r = checkPrescriptionReplace({ ...base, injuryMode: true });
    expect(r.verdict).toBe("alongside_only");
    expect(r.reasons.join(" ")).toMatch(/injury mode/);
  });

  it("no card of that category means alongside only", () => {
    const r = checkPrescriptionReplace({ ...base, hasCard: false });
    expect(r.verdict).toBe("alongside_only");
    expect(r.reasons.join(" ")).toMatch(/no hitting card/);
  });

  it("vision has no card and is always alongside only", () => {
    const r = checkPrescriptionReplace({ ...base, category: "vision" });
    expect(r.verdict).toBe("alongside_only");
  });

  it("maps categories to wk slots without spill-over", () => {
    expect(categorySlots("lift")).toEqual(["lift", "supplemental"]);
    expect(categorySlots("hitting")).toEqual(["hitting"]);
    expect(categorySlots("vision")).toEqual([]);
    expect(categorySlots("warmup")).toEqual(["warmup", "ub_primer"]);
  });
});
