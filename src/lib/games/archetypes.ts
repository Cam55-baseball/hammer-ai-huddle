/**
 * Pitcher / hitter archetypes — sport-aware.
 *
 * Used by the pregame plan generator to:
 *  - tag a dossier with an archetype (e.g. "high_slot_ride_fb_sweeper_rhp")
 *  - snapshot that tag on each at-bat for stable historical lookups
 *  - retrieve user history vs that archetype to personalize the plan
 *  - drive sport-specific language packs in the AI prompt
 */

export type Sport = "baseball" | "softball";

export interface PitcherFingerprint {
  throws?: "R" | "L" | string | null;
  release_height_in?: number | null;   // baseball ~5.5–6.5 ft → 66–78 in
  extension_ft?: number | null;        // ~5.5–7.5 ft
  arm_slot?: "over_the_top" | "high_three_quarter" | "three_quarter" | "low_three_quarter" | "sidearm" | "submarine" | string | null;
  arsenal?: Array<{ pitch: string; usage?: number; velo?: number; ivb?: number; hb?: number; whiff_pct?: number }>;
  fps_pct?: number | null;             // first-pitch strike %
  confidence_state?: "elite" | "high" | "neutral" | "shaky" | "off" | string | null;
}

export interface ArchetypeRule {
  id: string;
  label: string;
  sport: Sport;
  description: string;
  matches: (fp: PitcherFingerprint) => boolean;
  cues: string[];     // plan-language seed cues
}

// ---------- BASEBALL ----------
export const BASEBALL_PITCHER_ARCHETYPES: ArchetypeRule[] = [
  {
    id: "high_slot_ride_fb_sweeper_rhp",
    label: "High-slot RHP · ride FB + sweeper",
    sport: "baseball",
    description: "Tall release, plus IVB four-seam, glove-side sweeper. FB plays up; SL runs off the plate.",
    matches: (fp) =>
      (fp.throws ?? "R") === "R" &&
      (fp.release_height_in ?? 0) >= 72 &&
      !!fp.arsenal?.some((p) => /four|4s|fastball/i.test(p.pitch) && (p.ivb ?? 0) >= 16) &&
      !!fp.arsenal?.some((p) => /sweep|slider/i.test(p.pitch)),
    cues: [
      "See the ball up — his FB rides; the down pitch becomes a chase.",
      "Sweeper starts middle and runs off — let it travel, don't reach.",
      "Perceived velo is hotter than gun reading; start your move early.",
    ],
  },
  {
    id: "low_slot_sinker_run_rhp",
    label: "Low-slot RHP · sinker/runner",
    sport: "baseball",
    description: "Sub-72\" release, sinker with arm-side run, slider off the plate.",
    matches: (fp) =>
      (fp.throws ?? "R") === "R" &&
      (fp.release_height_in ?? 99) < 72 &&
      !!fp.arsenal?.some((p) => /sink|2s|two-?seam/i.test(p.pitch)),
    cues: [
      "Lower slot — see the ball DOWN in the zone, not up.",
      "Sinker runs in on you (RHB) — be ready to turn it loose middle-in.",
      "Back-foot slider is the put-away. Don't chase the slider that disappears.",
    ],
  },
  {
    id: "lefty_crossfire",
    label: "LHP · crossfire / deception",
    sport: "baseball",
    description: "Lefty with cross-body slot and breaking ball off plate to LHH, in on RHH.",
    matches: (fp) => (fp.throws ?? "") === "L",
    cues: [
      "Pick up the ball late from the cross-body slot — track release, not motion.",
      "Slider crosses the plate inside on RHB — flatten your top hand.",
      "Changeup falls; stay on the FB plane and adjust down.",
    ],
  },
  {
    id: "elite_extension_fb_dominant",
    label: "Elite-extension FB dominant",
    sport: "baseball",
    description: ">7 ft extension turns 93 into perceived ~96–97.",
    matches: (fp) => (fp.extension_ft ?? 0) >= 7,
    cues: [
      "His FB plays harder than the radar — start your move on time.",
      "Sit FB until 2 strikes; his off-speed plays off that timing.",
    ],
  },
  {
    id: "command_artist_low_velo",
    label: "Command artist · low velo",
    sport: "baseball",
    description: "Below-average velocity, plus command, high FPS%, lives on edges.",
    matches: (fp) =>
      (fp.fps_pct ?? 0) >= 0.65 &&
      !!fp.arsenal?.every?.((p) => (p.velo ?? 100) < 90),
    cues: [
      "He attacks the zone first pitch — be ready early or take to find your zone.",
      "Mistake-hitter game: pick your pitch in your zone and don't miss it.",
    ],
  },
];

// ---------- SOFTBALL ----------
export const SOFTBALL_PITCHER_ARCHETYPES: ArchetypeRule[] = [
  {
    id: "rise_dominant_rhp",
    label: "Riseball-dominant RHP",
    sport: "softball",
    description: "Riseball climbs above the zone; drop/change pull eyes down.",
    matches: (fp) => !!fp.arsenal?.some((p) => /rise/i.test(p.pitch)),
    cues: [
      "Lay off the high rise — start at the belt and only swing at strikes.",
      "She'll spike the drop after a rise — hold your ground.",
      "Change of speeds is the trap. Stay back and let the ball travel.",
    ],
  },
  {
    id: "drop_screw_groundball",
    label: "Drop/screw groundball arm",
    sport: "softball",
    description: "Lives at the knees with drop + screw, gets weak contact.",
    matches: (fp) =>
      !!fp.arsenal?.some((p) => /drop/i.test(p.pitch)) &&
      !!fp.arsenal?.some((p) => /screw/i.test(p.pitch)),
    cues: [
      "Get the head out — she wants you on top of the ball.",
      "Screw runs in on you; flatten the path and drive line drives.",
    ],
  },
  {
    id: "change_disruptor",
    label: "Change-up disruptor",
    sport: "softball",
    description: "Plus change pulls hitters off front foot.",
    matches: (fp) => !!fp.arsenal?.some((p) => /change/i.test(p.pitch) && (p.usage ?? 0) >= 0.2),
    cues: [
      "Stay back. If your weight goes, you're out.",
      "She'll throw the change in fastball counts — be patient through contact.",
    ],
  },
  {
    id: "lefty_dropper",
    label: "Lefty dropper / curve",
    sport: "softball",
    description: "LHP with drop-curve combo, runs off the plate on RHH.",
    matches: (fp) => (fp.throws ?? "") === "L",
    cues: [
      "Drop-curve breaks late and away — track to the back foot then commit.",
      "Inner half on RHB is her chase pitch — let it go.",
    ],
  },
];

export function archetypesFor(sport: Sport): ArchetypeRule[] {
  return sport === "softball" ? SOFTBALL_PITCHER_ARCHETYPES : BASEBALL_PITCHER_ARCHETYPES;
}

export function classifyPitcher(sport: Sport, fp: PitcherFingerprint): ArchetypeRule | null {
  const list = archetypesFor(sport);
  for (const a of list) {
    try {
      if (a.matches(fp)) return a;
    } catch {
      /* ignore bad rule eval */
    }
  }
  return null;
}

// ---------- HITTER ARCHETYPES (pitcher-side mirror) ----------
export interface HitterFingerprint {
  bats?: "R" | "L" | "S" | string | null;
  chase_pct?: number | null;
  first_pitch_swing_pct?: number | null;
  whiff_pct?: number | null;
  pull_pct?: number | null;
  power_zone?: "in" | "middle" | "away" | string | null;
  cold_pitch_types?: string[];
}

export interface HitterArchetypeRule {
  id: string;
  label: string;
  sport: Sport;
  description: string;
  matches: (fp: HitterFingerprint) => boolean;
  cues: string[];
}

export const HITTER_ARCHETYPES: HitterArchetypeRule[] = [
  {
    id: "free_swinger_chaser",
    label: "Free swinger / chaser",
    sport: "baseball",
    description: "High chase, high first-pitch swing — wants to attack.",
    matches: (fp) => (fp.chase_pct ?? 0) >= 0.32 || (fp.first_pitch_swing_pct ?? 0) >= 0.45,
    cues: [
      "Expand early — first pitch off the plate often gets a swing.",
      "Bury breaking stuff after a strike; don't groove a get-me-over.",
    ],
  },
  {
    id: "patient_zone_hunter",
    label: "Patient zone hunter",
    sport: "baseball",
    description: "Low chase, hunts a pitch in a zone.",
    matches: (fp) => (fp.chase_pct ?? 1) <= 0.22,
    cues: [
      "Strike one is gold — attack the zone early, then expand.",
      "Don't fall behind; he'll take walks and you'll be pitching from behind.",
    ],
  },
  {
    id: "pull_power",
    label: "Pull-side power",
    sport: "baseball",
    description: "Big pull%, damage middle-in.",
    matches: (fp) => (fp.pull_pct ?? 0) >= 0.5 || fp.power_zone === "in",
    cues: [
      "Avoid middle-in. Live away and change eye level.",
      "Backdoor breaking ball is your friend.",
    ],
  },
  {
    id: "spray_contact",
    label: "Spray / contact",
    sport: "baseball",
    description: "Low whiff, sprays the field.",
    matches: (fp) => (fp.whiff_pct ?? 1) <= 0.18,
    cues: [
      "Don't groove anything middle — work corners and change speeds.",
      "Force weak contact; he won't strike out, so make him hit YOUR pitch.",
    ],
  },
];

export function classifyHitter(fp: HitterFingerprint): HitterArchetypeRule | null {
  for (const a of HITTER_ARCHETYPES) {
    try {
      if (a.matches(fp)) return a;
    } catch {
      /* ignore */
    }
  }
  return null;
}
