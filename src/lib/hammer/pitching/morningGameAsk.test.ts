import { describe, expect, it } from "vitest";
import { decideMorningGameAsk, gameLogAskedKey } from "@/lib/hammer/pitching/morningGameAsk";

const base = {
  hasYesterdayGame: true,
  yesterdayLogged: false,
  askedBefore: false,
  isPitcher: false,
  yesterdayPitchThrown: false,
};

describe("decideMorningGameAsk", () => {
  it("asks about an unlogged yesterday game", () => {
    expect(decideMorningGameAsk(base)).toEqual({ askGame: true, askPitch: false });
  });

  it("does not ask when the game is already logged", () => {
    expect(decideMorningGameAsk({ ...base, yesterdayLogged: true })).toEqual({
      askGame: false,
      askPitch: false,
    });
  });

  it("asks a pitcher about pitching even without a game", () => {
    expect(decideMorningGameAsk({ ...base, hasYesterdayGame: false, isPitcher: true })).toEqual({
      askGame: false,
      askPitch: true,
    });
  });

  it("does not ask a pitcher who already threw", () => {
    expect(
      decideMorningGameAsk({ ...base, isPitcher: true, yesterdayPitchThrown: true }),
    ).toEqual({ askGame: true, askPitch: false });
  });

  it("never asks twice for the same date", () => {
    expect(
      decideMorningGameAsk({ ...base, isPitcher: true, askedBefore: true }),
    ).toEqual({ askGame: false, askPitch: false });
  });

  it("shares the asked-once key with the Hammers Today game prompt", () => {
    expect(gameLogAskedKey("u1", "2026-10-07")).toBe("hm.gameLogAsked.u1.2026-10-07");
  });
});
