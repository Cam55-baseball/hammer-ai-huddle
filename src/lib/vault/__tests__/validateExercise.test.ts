import { describe, it, expect } from "vitest";
import { validateExercise, type VaultExercise } from "../validateExercise";
import { buntingVaultContent } from '../../../../supabase/functions/_shared/vault/buntingContent';

const ok: VaultExercise = {
  slug: "db_press_neutral", name: "DB press, neutral grip",
  how_to_one_rep: "You need two dumbbells and a flat bench. One rep is lowering both dumbbells to the chest and pressing back up.",
  cue: "Elbows at 45°", stop_if: "Sharp shoulder pain", measure_type: "weight_reps",
  default_sets: 3, default_reps: 8, equipment: ["dumbbells", "bench"], card_type: "lift",
  sports: ["baseball"], season_phases: ["off_season"], min_age: 13, rest_rule: "lift_day", primer_role: "none",
};

describe("vault validator", () => {
  it("all twelve owner bunt definitions validate with exact type/side and five attempts", () => {
    const content = buntingVaultContent();
    expect(content).toHaveLength(12);
    for (const item of content) {
      expect(validateExercise(item, {isNew:true})).toEqual([]);
      expect(item.default_reps).toBe(5);
      expect(item.measure_type).toBe('bunt_attempts');
    }
    expect(validateExercise({...content[0], bunt_side:undefined}).join()).toContain('exact batting side');
  });
  it("passes a complete exercise", () => expect(validateExercise(ok)).toEqual([]));
  it("retains complete either-or gear without requiring both implements", () => {
    expect(validateExercise({ ...ok, equipment: [], equipment_alternatives: [["dumbbell"], ["kettlebell"]] })).toEqual([]);
    expect(validateExercise({ ...ok, equipment: [], equipment_alternatives: [[]] }).join()).toContain("nonempty");
  });
  it("blocks an incomplete exercise", () => {
    const p = validateExercise({ ...ok, name: "", stop_if: "", sports: [], default_reps: null });
    expect(p.length).toBeGreaterThanOrEqual(4);
  });
  it("blocks DB named with a barbell description", () => {
    expect(validateExercise({ ...ok, how_to_one_rep: "You need a barbell. One rep is one press." }).join()).toMatch(/dumbbell/);
  });
  it("blocks a series without movements", () => {
    expect(validateExercise({ ...ok, name: "Band Series", how_to_one_rep: "You need a band. One round is every movement." }).join()).toMatch(/series/);
  });
  it("blocks a jump logged in time", () => {
    expect(validateExercise({ ...ok, name: "Broad jump", measure_type: "hold_seconds", default_seconds: 5 }).join()).toMatch(/never time/);
  });
  it("blocks filler", () => {
    expect(validateExercise({ ...ok, how_to_one_rep: "One rep is one full, controlled movement from start to finish and back. dumbbell" }).join()).toMatch(/filler/);
  });
  it("throws need an arm weight", () => {
    expect(validateExercise({ ...ok, measure_type: "throw_count", arm_weight: null }).join()).toMatch(/arm-ledger/);
  });
  it("accepts an uploaded video or https mp4 link, rejects anything else", () => {
    expect(validateExercise({ ...ok, video_url: "exercise-videos/db_press_neutral/1-clip.mp4" })).toEqual([]);
    expect(validateExercise({ ...ok, video_url: "https://cdn.example.com/clip.mp4" })).toEqual([]);
    expect(validateExercise({ ...ok, video_url: "http://insecure.com/clip.mp4" }).join()).toMatch(/video/i);
    expect(validateExercise({ ...ok, video_url: "https://example.com/page" }).join()).toMatch(/MP4/);
    expect(validateExercise({ ...ok, video_url: "other-bucket/clip.mp4" }).join()).toMatch(/exercise-videos/);
  });
});

describe("new exercises entering the planner", () => {
  const base = {
    slug: "new_move", name: "Wall Slide Slow", how_to_one_rep: "One rep is one slow slide up the wall.",
    cue: "Ribs down.", stop_if: "You feel pain.", measure_type: "reps", default_sets: 2, default_reps: 8,
    equipment: ["none"], card_type: "warmup", sports: ["baseball"], season_phases: ["in_season"], min_age: 8, rest_rule: "none", warmup_stage: 3,
  };
  it("requires a planner category for a brand-new exercise", () => {
    expect(validateExercise(base, { isNew: true }).join()).toMatch(/planner category/);
    expect(validateExercise({ ...base, catalog_category: "shoulder_prep" }, { isNew: true })).toEqual([]);
  });
  it("does not require it when editing an existing exercise", () => {
    expect(validateExercise(base)).toEqual([]);
  });
});
