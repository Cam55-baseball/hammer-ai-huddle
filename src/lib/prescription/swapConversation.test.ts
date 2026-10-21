import { describe, expect, it } from "vitest";
import { answerSwapConversation, confirmedSwapAvailability, requireSwapVisit, startSwapConversation, swapEquipmentMemory } from "./swapConversation";

function ready(scope: "today" | "always" = "today") {
  let draft = startSwapConversation("athlete", "rx", "2026-10-21");
  draft = answerSwapConversation(draft, { step: "missing", items: ["barbell"] });
  draft = answerSwapConversation(draft, { step: "available", items: ["dumbbell"] });
  return answerSwapConversation(draft, { step: "scope", scope });
}
describe("three-question Swap contract", () => {
  it("requires exactly missing, available, then today/always before confirming availability", () => {
    const start = startSwapConversation("athlete", "rx", "2026-10-21");
    expect(() => confirmedSwapAvailability(start)).toThrow();
    expect(() => answerSwapConversation(start, { step: "scope", scope: "always" })).toThrow();
    expect(confirmedSwapAvailability(ready())).toEqual({ confirmed: true, have: ["dumbbell"], lacks: ["barbell"] });
    expect(() => answerSwapConversation(ready(), { step: "scope", scope: "always" })).toThrow();
  });
  it("today maps only to session memory and preserves unrelated saved facts", () => {
    expect(swapEquipmentMemory(ready(), ["barbell", "foam_roller", "tee"])).toEqual({
      scope: "session", equipment: ["dumbbell", "foam_roller", "tee"], source: "prescription_swap" });
  });
  it("always maps only to persistent memory and removes the exact missing item", () => {
    expect(swapEquipmentMemory(ready("always"), ["barbell", "plates", "squat_rack"])).toEqual({
      scope: "persistent", equipment: ["dumbbell", "plates", "squat_rack"], source: "prescription_swap" });
  });
  it("remembered inventory never confirms today's partner, field, wall or runway", () => {
    expect(confirmedSwapAvailability(ready()).have).toEqual(["dumbbell"]);
    let draft = startSwapConversation("athlete", "rx", "2026-10-21");
    draft = answerSwapConversation(draft, { step: "missing", items: ["pitching_machine"] });
    draft = answerSwapConversation(draft, { step: "available", items: ["partner"] });
    draft = answerSwapConversation(draft, { step: "scope", scope: "always" });
    expect(confirmedSwapAvailability(draft).have).toEqual(["partner"]);
    expect(() => swapEquipmentMemory(draft, [])).toThrow(/checked memory field/);
  });
  it("rejects contradictions, blank answers and another athlete, exercise or day", () => {
    const draft = startSwapConversation("athlete", "rx", "2026-10-21");
    expect(() => answerSwapConversation(draft, { step: "missing", items: [] })).toThrow();
    const next = answerSwapConversation(draft, { step: "missing", items: ["Barbell"] });
    expect(() => answerSwapConversation(next, { step: "available", items: ["barbell"] })).toThrow();
    for (const args of [["other", "rx", "2026-10-21"], ["athlete", "other", "2026-10-21"], ["athlete", "rx", "2026-10-20"]]) {
      expect(() => requireSwapVisit(ready(), args[0], args[1], args[2])).toThrow();
    }
  });
  it("allows a confirmed empty equipment list without manufacturing open space", () => {
    let draft = startSwapConversation("athlete", "rx", "2026-10-21");
    draft = answerSwapConversation(draft, { step: "missing", items: ["foam_roller"] });
    draft = answerSwapConversation(draft, { step: "available", items: [] });
    draft = answerSwapConversation(draft, { step: "scope", scope: "today" });
    expect(swapEquipmentMemory(draft, ["foam_roller"]).equipment).toEqual([]);
    expect(confirmedSwapAvailability(draft).have).toEqual([]);
  });
  it("dumbbell aliases cannot be both missing and available, including a crafted ready draft", () => {
    const next = answerSwapConversation(startSwapConversation("athlete", "rx", "2026-10-21"), { step: "missing", items: ["db"] });
    expect(next.lacks).toEqual(["dumbbell"]);
    expect(() => answerSwapConversation(next, { step: "available", items: ["dumbbells"] })).toThrow(/cannot/);
    expect(() => confirmedSwapAvailability({ ...ready(), have: ["db"], lacks: ["dumbbells"] })).toThrow(/availability/);
    expect(() => confirmedSwapAvailability({ ...ready(), lacks: [] })).toThrow(/availability/);
  });
});