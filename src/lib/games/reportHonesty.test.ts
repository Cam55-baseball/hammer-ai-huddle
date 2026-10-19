/**
 * Owner rule (Oct 19): the player's post-game report must show "Verified by
 * coach" like the game sheet, and any rate built from a small sample must
 * say "early read" instead of standing as a clean percentage.
 */
import { describe, it, expect } from "vitest";
import { buildIndividualPostgame, MIN_TREND_SAMPLE } from "./reportEngine";

const game = {
  id: "g1",
  game_date: "2026-10-18",
  sport: "baseball",
  opponent_team: "TEST Bears",
};

const twoPitches = [
  { perspective: "hitter", result: "swinging_strike", location: { zone: 5 } },
  { perspective: "hitter", result: "ball", location: { zone: 5 } },
];

describe("post-game report honesty", () => {
  it("shows Verified by coach with the date when the game is verified", () => {
    const r = buildIndividualPostgame({
      game: { ...game, verified_at: "2026-10-18T20:00:00Z", verified_role: "coach" },
      atBats: [], pitches: [], defense: [], baserun: [],
    });
    expect(r.subtitle).toContain("Verified by coach on 2026-10-18");
  });

  it("shows the Logged-by source when the game is not verified", () => {
    const r = buildIndividualPostgame({
      game: { ...game, entry_source: "parent_entered" },
      atBats: [], pitches: [], defense: [], baserun: [],
    });
    expect(r.subtitle).toContain("Logged by: Parent-entered");
  });

  it("labels plate-discipline rates as early read below the sample floor", () => {
    const r = buildIndividualPostgame({
      game, atBats: [], pitches: twoPitches, defense: [], baserun: [],
    });
    const disc = r.sections.find((s) => s.id === "discipline")!;
    const swing = disc.stats!.find((s) => s.label === "Swing rate")!;
    const whiff = disc.stats!.find((s) => s.label === "Whiff rate")!;
    expect(swing.detail).toContain("early read");
    expect(whiff.detail).toContain("early read");
  });

  it("drops the early-read label once the sample floor is met", () => {
    const many = Array.from({ length: MIN_TREND_SAMPLE }, () => ({
      perspective: "hitter", result: "ball", location: { zone: 5 },
    }));
    const r = buildIndividualPostgame({
      game, atBats: [], pitches: many, defense: [], baserun: [],
    });
    const disc = r.sections.find((s) => s.id === "discipline")!;
    const swing = disc.stats!.find((s) => s.label === "Swing rate")!;
    expect(swing.detail ?? "").not.toContain("early read");
  });

  it("never lets a tiny-sample chase rate author a Train next suggestion", () => {
    const chasey = [
      { perspective: "hitter", result: "swinging_strike", location: { outZone: "low" } },
      { perspective: "hitter", result: "swinging_strike", location: { outZone: "low" } },
    ];
    const r = buildIndividualPostgame({
      game, atBats: [], pitches: chasey, defense: [], baserun: [],
    });
    expect(r.nextUp.join(" ")).not.toContain("Chase control");
  });
});
