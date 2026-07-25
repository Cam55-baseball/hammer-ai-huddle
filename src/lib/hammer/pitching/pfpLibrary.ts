/**
 * Pitcher Fielding Practice (PFP) Library.
 *
 * A small, tiered catalog of the 6 essential PFP drills every pitcher
 * should touch every training day. Rotation is deterministic on day-of-year
 * so athletes see variety without the engine authoring organism truth.
 */
import type { RoadmapRung } from "@/lib/hammer/roadmap/roadmapLadder";

export type PfpTier = "beginner" | "intermediate" | "expert";

export interface PfpDrill {
  readonly slug: string;
  readonly name: string;
  readonly minutes: number;
  readonly tier: PfpTier;
  readonly cue: string;
  readonly rationale: string;
}

const CATALOG: ReadonlyArray<PfpDrill> = [
  {
    slug: "pfp_comebacker",
    name: "Comebacker glove-side & arm-side",
    minutes: 5,
    tier: "beginner",
    cue: "Recover to the ball, feet under, throw through the target.",
    rationale: "The most common ball back at the pitcher — must be automatic.",
  },
  {
    slug: "pfp_1_3_cover",
    name: "1-3 cover on ground ball to 1B",
    minutes: 5,
    tier: "beginner",
    cue: "Bee-line to the inside corner, tag the bag with your right foot, look for the throw early.",
    rationale: "Every ball to the right side is your outs to make.",
  },
  {
    slug: "pfp_3_1_putout",
    name: "3-1 put-out at first",
    minutes: 4,
    tier: "intermediate",
    cue: "Angle to the bag, receive on the run, get the tag foot down early.",
    rationale: "Fielders trust pitchers who show up to the bag on time.",
  },
  {
    slug: "pfp_bunt_field",
    name: "Bunt fielding — up the middle & 3B line",
    minutes: 5,
    tier: "intermediate",
    cue: "Attack the ball, glove flip only if you cannot spin to throw.",
    rationale: "Bunt game punishes pitchers who don't own their zone.",
  },
  {
    slug: "pfp_53_relay",
    name: "PFP 5-3 / 1-6-3 turn",
    minutes: 5,
    tier: "expert",
    cue: "Get to a good throwing angle first; velocity is second.",
    rationale: "The double play at the pitcher's assist is a game changer.",
  },
  {
    slug: "pfp_pickoff",
    name: "Pickoff moves — 1B / 2B / 3B",
    minutes: 6,
    tier: "expert",
    cue: "Deceive the runner, not yourself. Every look has a purpose.",
    rationale: "Controlling the running game is elite pitcher currency.",
  },
];

function tierCap(rung: RoadmapRung): PfpTier {
  switch (rung) {
    case "foundation": return "beginner";
    case "build":      return "beginner";
    case "bridge":     return "intermediate";
    case "peak":       return "expert";
    case "sustain":    return "expert";
  }
}

function tierAllowed(cap: PfpTier, tier: PfpTier): boolean {
  const order: PfpTier[] = ["beginner", "intermediate", "expert"];
  return order.indexOf(tier) <= order.indexOf(cap);
}

/**
 * Deterministic PFP rotation for a given date + rung.
 * Returns 2 drills totalling ~8-12 min. Foundation gets only beginner drills.
 */
export function pickPfpDrillsForToday(
  today: Date,
  rung: RoadmapRung,
): ReadonlyArray<PfpDrill> {
  const cap = tierCap(rung);
  const pool = CATALOG.filter((d) => tierAllowed(cap, d.tier));
  if (pool.length === 0) return [];
  // Day-of-year seed for deterministic rotation.
  const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 0));
  const doy = Math.floor((today.getTime() - start.getTime()) / 86400_000);
  const i1 = doy % pool.length;
  const i2 = (doy + 3) % pool.length;
  const first = pool[i1];
  const second = pool[i2 === i1 ? (i2 + 1) % pool.length : i2];
  return [first, second];
}

export const PFP_CATALOG = CATALOG;
