import { describe, it, expect } from "vitest";
import {
  checkPrescriptionReplace,
  categorySlots,
  coachRxToWkRows,
  prescriptionIntensity,
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
  it("max-effort templates remain high intensity before an in-season game", () => {
    expect(prescriptionIntensity("max")).toBe("high");
    expect(checkPrescriptionReplace({ ...base, inSeason: true, gameNextDay: true, intensity: prescriptionIntensity("max") }).verdict).toBe("alongside_only");
  });
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

  it("every skill category replaces only its own slot (owner confirmation: hitting, pitching, throwing, fielding, baserunning)", () => {
    expect(categorySlots("hitting")).toEqual(["hitting"]);
    expect(categorySlots("pitching")).toEqual(["pitching"]);
    expect(categorySlots("throwing")).toEqual(["throwing"]);
    expect(categorySlots("fielding")).toEqual(["fielding"]);
    expect(categorySlots("baserunning")).toEqual(["baserunning"]);
    // No two skill categories share a slot — a replacement can never spill over.
    const skill = ["hitting", "pitching", "throwing", "fielding", "baserunning"] as const;
    const all = skill.flatMap((c) => categorySlots(c));
    expect(new Set(all).size).toBe(all.length);
    // And each category's rows land in that same slot.
    for (const c of skill) {
      const rows = coachRxToWkRows({
        userId: "p1", planDate: "2026-10-24", category: c,
        prescriptionId: "rx-1", coachName: "Coach Lee", usedInstead: true,
        exercises: [{ name: "Drill", sets: 2, reps: 8 }],
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].slot).toBe(c);
      expect(rows[0].sequence_role).toBe("coach");
    }
  });
});

describe("coachRxToWkRows — coach workout becomes real plan rows", () => {
  const base = {
    userId: "p1", planDate: "2026-10-24", category: "hitting" as const,
    prescriptionId: "rx-1", coachName: "Coach Lee",
  };
  it("maps exercises to pending wk_prescriptions rows in the category slot", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: true, exercises: [
      { name: "Tee work", sets: 3, reps: 10, rest: 60 },
      { name: "Soft toss", sets: 2, reps: 12 },
    ]});
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: "p1", plan_date: "2026-10-24", slot: "hitting", status: "pending",
      movement_name: "Tee work", sets: 3, reps: 10, rest_seconds: 60,
      dosage_unit: "reps", cns_cost: null, sequence_role: "coach",
    });
    expect((rows[0].why_payload as any).coach_rx).toBe("rx-1");
  });
  it("used-instead rows say so in the Because line; alongside rows say alongside", () => {
    const used = coachRxToWkRows({ ...base, usedInstead: true, exercises: [{ name: "Tee work" }] });
    const added = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: "Tee work" }] });
    expect(String(used[0].rationale)).toContain("used it instead of your hitting card");
    expect(String(added[0].rationale)).toContain("added alongside");
  });
  it("timed exercises log seconds, not reps", () => {
    const rows = coachRxToWkRows({ ...base, category: "warmup", usedInstead: false, exercises: [{ name: "Plank", duration: 45 }] });
    expect(rows[0]).toMatchObject({ slot: "warmup", duration_seconds: 45, dosage_unit: "seconds" });
  });
  it("skips nameless items and never invents dose", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: " " }, { name: "Band push-up" }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].sets).toBeNull();
    expect(rows[0].reps).toBeNull();
    expect(rows[0].movement_slug).toBe("");
    expect(rows[0].cns_cost).toBeNull();
  });
  it("preserves declared catalog identity, feet and throws rather than guessing reps", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: "Catch", slug: "catch_play", dosage_unit: "throws", reps: 12, distance_feet: 45 }] });
    expect(rows[0]).toMatchObject({ movement_slug: "catch_play", dosage_unit: "throws", reps: 12, distance_feet: 45 });
  });
  it("preserves an explicit total-reps dose in its canonical field", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: "Swings", sets: 2, reps: 24, dosage_unit: "total_reps" }] });
    expect(rows[0]).toMatchObject({ total_reps: 24, reps: null, dosage_unit: "total_reps" });
  });
  it("does not round fractional set counts into legal doses", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: "Swings", sets: 1.4, reps: 8 }] });
    expect(rows[0].sets).toBe(1.4);
  });
  it("keeps the entered hundredth-second time target", () => {
    const rows = coachRxToWkRows({ ...base, usedInstead: false, exercises: [{ name: "Hold", duration: 1.47, dosage_unit: "seconds" }] });
    expect(rows[0].duration_seconds).toBe(1.47);
  });
});
