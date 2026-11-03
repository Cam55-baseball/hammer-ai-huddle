import { describe, it, expect } from "vitest";
import { playerCardNote } from "./playerCardNotes";

describe("player card notes", () => {
  it("hides engine reasoning the owner named", () => {
    for (const t of [
      "Hitting is your top goal. An extra weekly skill block cannot fit the current phase, rest or day limits; your baseline stays.",
      "No recent max-intent max bat-speed set. Full attempt is legal today (window: 24h).",
      "Base work. A recurring finding shaped one existing drill slot.",
      "Day 1 of 6 · Goal #1 (Hitting). Off-season — high volume",
    ]) expect(playerCardNote(t)).toBeNull();
  });
  it("keeps the approved short notes", () => {
    for (const t of [
      "Replaced by coach workout — not missed",
      "Because: edited by Coach",
      "Coach allowed skip",
      "Smart stop: speed dropped",
      "Rest day — soft recovery and Mind only",
    ]) expect(playerCardNote(t)).toBe(t);
  });
});
