import { describe, expect, it } from "vitest";
import { practiceWindowRoute, savedPracticeCount } from "./practiceWindow";
const expected = { userId: "player", sport: "softball", module: "pitching", token: "exercise-set-2" };
const saved = { user_id: "player", sport: "softball", module: "pitching", deleted_at: null,
  fatigue_state_at_session: { today_exercise: { token: "exercise-set-2" } }, micro_layer_data: [{ pitch_result: "strike" }, { pitch_result: "ball" }] };
describe("canonical practice window readback", () => {
  it("counts the same saved reps with video or without video", () => {
    expect(savedPracticeCount(saved, expected)).toBe(2);
    expect(savedPracticeCount({ ...saved, micro_layer_data: saved.micro_layer_data.map(rep => ({ ...rep, video_start_sec: 1.47, video_end_sec: 2.51 })) }, expected)).toBe(2);
  });
  it.each([
    { user_id: "other" }, { sport: "baseball" }, { module: "throwing" }, { deleted_at: "2026-10-23" },
    { fatigue_state_at_session: { today_exercise: { token: "another-set" } } }, { micro_layer_data: [] },
  ])("rejects unrelated, deleted or empty saved work %j", patch => {
    expect(savedPracticeCount({ ...saved, ...patch }, expected)).toBeNull();
  });
  it("preserves the declared module and drill without inventing a lesson or bypassing readiness", () => {
    const url = new URL(practiceWindowRoute("/practice?module=pitching&drill_type=flat_ground", "set-2"), "https://hammersmodality.org");
    expect(url.searchParams.get("module")).toBe("pitching");
    expect(url.searchParams.get("drill_type")).toBe("flat_ground");
    expect(url.searchParams.get("today_window")).toBe("set-2");
    expect(url.searchParams.has("type")).toBe(false);
  });
});