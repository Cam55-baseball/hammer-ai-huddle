import { describe, it, expect } from "vitest";
import { messageAudience } from "../messages";
describe("coach message audience", () => {
  it("under 13 goes to the parent only", () => expect(messageAudience(12)).toBe("parent_only"));
  it("13-17 goes to player with parent copy", () => { expect(messageAudience(13)).toBe("player_and_parent"); expect(messageAudience(17)).toBe("player_and_parent"); });
  it("18+ goes to the player only", () => expect(messageAudience(18)).toBe("player"));
});
