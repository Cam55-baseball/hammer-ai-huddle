import { describe, it, expect } from "vitest";
import { BASIC_HOW_TO } from "../basicHowTo.generated";
import catalog from "@/test/fixtures/wkCatalogRules.json";

/**
 * Round 3 (G): premium description quality gates. These FAIL THE BUILD when:
 *  - a banned filler phrase appears,
 *  - the equipment named does not match the exercise (db/kb/bb/band/cable/sled/med ball),
 *  - a series/circuit/complex does not list or dose its movements,
 *  - an entry has no specific rep definition,
 *  - a catalog exercise has no description at all.
 * Entries the rewriter could not write with confidence are flagged for the owner in
 * docs/owner/exercise-descriptions-needed.tsv instead of being guessed.
 */

const BANNED = [/full, controlled movement from start to finish/i, /smooth, controlled form/i];

const EQUIP: Array<[RegExp, RegExp, RegExp[]]> = [
  // [slug token, word that must appear, words that must NOT appear as the equipment]
  [/(^|_)db(_|$)/, /dumbbell/i, [/barbell/i, /kettlebell/i]],
  [/(^|_)kb(_|$)/, /kettlebell/i, [/barbell/i, /dumbbell/i]],
  [/(^|_)bb(_|$)/, /barbell/i, [/dumbbell/i, /kettlebell/i]],
  [/band|xband|jband/, /band/i, []],
  [/cable/, /cable|band/i, []],
  [/sled/, /sled/i, []],
  [/med_?ball|medball|(^|_)mb(_|$)/, /med(?:icine)?[ -]?ball/i, []],
];

const SERIES = /series|circuit|complex|full_chart|routine/i;
const MOVEMENT_LIST = /\d+\s*movements?\s*×|:\s*[^.]+,[^.]+,|\w+-\w+,[^.]+,|\d+\s+[a-z-]+(?:\s+[a-z-]+)?\s+(?:each|per side|swings|jumps|punches|skips|hops|reps)|\d+\s+each\b|,\s*then\s+|\b(?:three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\s+[a-z-]+[^.]*,[^.]+,/i;
const REP_DEF = /One rep is|One round is|check-off task|Hold the position/i;

const entries = Object.entries(BASIC_HOW_TO);

describe("basic how-to quality gates (round 3)", () => {
  it("no banned filler phrases anywhere", () => {
    for (const [slug, t] of entries) {
      for (const b of BANNED) expect(t, `${slug}: ${b}`).not.toMatch(b);
    }
  });
  it("equipment named matches the exercise slug", () => {
    for (const [slug, t] of entries) {
      for (const [token, must, mustNot] of EQUIP) {
        if (!token.test(slug)) continue;
        // "_bb" / "_sb" at the end of a baseball/softball pair is the sport, not a barbell.
        // A trailing "_bb" is always the sport (baseball), never a barbell; barbell slugs use "bb_" inside the name.
        if (/_bb$/.test(slug) && !/(^|_)bb_/.test(slug)) continue;
        expect(t, `${slug} should name its equipment`).toMatch(must);
        for (const bad of mustNot) expect(t, `${slug} names wrong equipment`).not.toMatch(bad);
      }
    }
  });
  it("every series/circuit/complex lists or doses its movements", () => {
    // Flagged for the owner (movement list not known — never guessed): must shrink, never grow.
    const PENDING_OWNER_SERIES = new Set([
    ]);
    for (const [slug, t] of entries) {
      if (!SERIES.test(slug) && !SERIES.test(t)) continue;
      if (PENDING_OWNER_SERIES.has(slug)) continue;
      expect(t, `${slug} series without a movement list`).toMatch(MOVEMENT_LIST);
    }
  });
  it("every entry carries a specific rep definition", () => {
    for (const [slug, t] of entries) {
      expect(t, `${slug} has no rep definition`).toMatch(REP_DEF);
      expect(t.length, `${slug} too short`).toBeGreaterThan(40);
    }
  });
  it("every catalog exercise has a description", () => {
    for (const row of catalog as Array<{ slug: string }>) {
      expect(BASIC_HOW_TO[row.slug], row.slug).toBeTruthy();
    }
  });
});
