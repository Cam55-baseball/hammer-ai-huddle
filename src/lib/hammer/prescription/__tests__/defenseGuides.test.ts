/**
 * Drift guard + smoke test for the Elite Defense Drill Intelligence system.
 *
 * Guarantees:
 *  1. Every drill name emitted by every position × sport × phase combo in
 *     defenseLibrary has a resolvable MovementGuide via guideForDefense —
 *     no more placeholder "guide on the way…" text on defense cards.
 *  2. Tier resolution is monotone: higher training age → tier is never lower.
 *  3. Tier scaling shrinks beginner dosage and grows elite dosage relative
 *     to the developing baseline for a representative catalog entry.
 *  4. Every returned prescription attaches a `guide` to every DrillStep.
 */
import { describe, it, expect } from "vitest";
import {
  selectDefenseDrills,
  resolveDefenseTier,
  type DefensePosition,
  type DefenseSport,
} from "../defenseLibrary";
import { guideForDefense } from "../defenseGuides";

const POSITIONS: DefensePosition[] = ["C", "P", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "OF", "IF", "utility"];
const SPORTS: DefenseSport[] = ["baseball", "softball"];
const PHASES = ["off", "pre", "in"] as const;

describe("defense guides — full drill-name coverage", () => {
  it("every drill emitted by the catalog has a MovementGuide", () => {
    const uncovered: string[] = [];
    for (const pos of POSITIONS) {
      for (const sport of SPORTS) {
        for (const phase of PHASES) {
          const rx = selectDefenseDrills({
            position: pos,
            sport,
            seasonPhase: phase,
            tier: "developing",
          });
          if (!rx) continue;
          for (const d of rx.drills) {
            const g = guideForDefense(d.name);
            if (!g) uncovered.push(`${pos}:${sport}:${phase} → "${d.name}"`);
            // The library must also attach the guide onto the DrillStep so the
            // MovementGuideSheet renders without hitting the placeholder path.
            expect(d.guide, `guide should be attached inline for ${d.name}`).toBeTruthy();
          }
        }
      }
    }
    expect(uncovered, `missing defense guides:\n${uncovered.join("\n")}`).toEqual([]);
  });

  it("secondary-position drills (blended) still resolve to a guide", () => {
    const rx = selectDefenseDrills({
      position: "SS",
      secondaryPositions: ["2B"],
      sport: "baseball",
      seasonPhase: "off",
      tier: "developing",
    });
    expect(rx).not.toBeNull();
    for (const d of rx!.drills) {
      expect(guideForDefense(d.name), `guide missing for blended drill "${d.name}"`).toBeTruthy();
    }
  });
});

describe("resolveDefenseTier", () => {
  it("maps training age to tier and steps down in-season", () => {
    expect(resolveDefenseTier(0, "off")).toBe("beginner");
    expect(resolveDefenseTier(2, "off")).toBe("developing");
    expect(resolveDefenseTier(4, "off")).toBe("advanced");
    expect(resolveDefenseTier(8, "off")).toBe("elite");
    // In-season steps the tier DOWN one.
    expect(resolveDefenseTier(8, "in")).toBe("advanced");
    expect(resolveDefenseTier(4, "in")).toBe("developing");
    // Tournament clamps.
    expect(resolveDefenseTier(8, "tournament")).toBe("developing");
  });
});

describe("tier scaling", () => {
  it("beginner shrinks, elite grows dosage vs developing baseline", () => {
    const args = { position: "C" as const, sport: "baseball" as const, seasonPhase: "off" };
    const beginner = selectDefenseDrills({ ...args, tier: "beginner" })!;
    const developing = selectDefenseDrills({ ...args, tier: "developing" })!;
    const elite = selectDefenseDrills({ ...args, tier: "elite" })!;

    // Pull the first ×N number out of each drill dosage and sum across the card.
    const totalReps = (rx: typeof beginner) => {
      let sum = 0;
      for (const d of rx.drills) {
        const m = d.dosage.match(/×\s*(\d+)/);
        if (m) sum += Number(m[1]);
      }
      return sum;
    };
    const b = totalReps(beginner);
    const d = totalReps(developing);
    const e = totalReps(elite);
    expect(d).toBeGreaterThan(0);
    expect(b).toBeLessThan(d);
    expect(e).toBeGreaterThan(d);
  });

  it("attaches per-tier setup note to the drill", () => {
    const rx = selectDefenseDrills({
      position: "SS",
      sport: "baseball",
      seasonPhase: "off",
      tier: "elite",
    })!;
    const withTierNote = rx.drills.find((d) => (d.setup ?? "").toLowerCase().includes("tier — elite"));
    expect(withTierNote, "at least one drill should carry an elite tier note in setup").toBeTruthy();
  });
});
