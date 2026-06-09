/**
 * BH V1 Report Card schemas — §5.1 content store.
 *
 * Lifted verbatim from docs/asb/report-card-constitution.md §5.1
 * (RATIFIED 2026-06-09, Phase 0.10 / §0.29). Pure content. No scoring,
 * no inference, no organism truth authorship. Drill / Video / Roadmap /
 * clip slots intentionally empty → render as visible missingness per
 * §3 Law 7 / CDR-8=D. Operational tagging is a separate backlog.
 *
 * Subordinate to: Eternal Laws, §0.7 hitting non-negotiables, §6
 * Universal Category Explanation Law, §17 per-category schema,
 * RFL-092 V1 implementation authorization (BP + BH only).
 */

export type BhCategoryId =
  | "p1_hip_load"
  | "p2_hand_load"
  | "p3_stride"
  | "p4_hitters_move";

export type BhPhaseId = "P1" | "P2" | "P3" | "P4";

export type BhHierarchyRank = "non_negotiable" | "rank_1";

export interface BhCategorySchema {
  readonly id: BhCategoryId;
  readonly phaseId: BhPhaseId;
  readonly name: string;
  readonly engineBinding: string;
  readonly displayFormat: string;
  readonly hierarchyRank: BhHierarchyRank;
  readonly weightAthleteView: string;
  readonly whatIsIt: string;
  readonly whyItMatters: string;
  readonly ifPoorPerformance: string;
  readonly ifPoorDurability: string;
  readonly ifPoorEfficiency: string;
  readonly ifPoorConsistency: string;
  readonly howToImprove: string;
  /** Empty → visible missingness ("Drill prescription pending"). */
  readonly drillIds: readonly string[];
  /** Empty → visible missingness ("Video pairing pending"). */
  readonly videoIds: readonly string[];
  /** Null → visible missingness ("Roadmap step pending"). */
  readonly roadmapStep: string | null;
  readonly goodLooksLikeClip: string | null;
  readonly badLooksLikeClip: string | null;
  readonly coachHammerVoice: {
    readonly athlete: true;
    readonly parent: true;
    readonly coach: true;
  };
  readonly confidenceRule: string;
  readonly missingnessRule: string;
}

export const BH_V1_CATEGORIES: readonly BhCategorySchema[] = [
  {
    id: "p1_hip_load",
    phaseId: "P1",
    name: "Hip Load (Pelvic Coil)",
    engineBinding:
      "p1_hip_load (hittingPhases.ts — canonical; formulaPhases.ts is constitutionally invalid per RFL-074)",
    displayFormat:
      "Pass/Fail chip (Non-Negotiable gate per §0.7) + band on click (CDR-1=D, §14)",
    hierarchyRank: "non_negotiable",
    weightAthleteView: "n/a — gate",
    whatIsIt:
      "How you coil the back hip to load the swing before anything else moves.",
    whyItMatters:
      "Hip Load is where the swing's energy is stored. Skip it and there's nothing for the rest of the swing to spend.",
    ifPoorPerformance:
      "Power and exit velocity cap because the body never loaded what it's going to try to fire.",
    ifPoorDurability:
      "The arms try to make up for what the hips didn't store, loading shoulders and forearms.",
    ifPoorEfficiency:
      "The swing runs on borrowed effort instead of stored energy.",
    ifPoorConsistency: "Without a stored coil, every swing is improvised.",
    howToImprove:
      "Train the coil as the first event of the swing, owned by the back hip, not the hands.",
    drillIds: [],
    videoIds: [],
    roadmapStep: null,
    goodLooksLikeClip: null,
    badLooksLikeClip: null,
    coachHammerVoice: { athlete: true, parent: true, coach: true },
    confidenceRule:
      'Pass/Fail when load frame is engine-confident; "estimate" otherwise per CDR-5=D / CDR-7=D',
    missingnessRule:
      '"Not measured this session — hip-load frame unscorable" per §3 Law 7 / CDR-8=D. Never silent.',
  },
  {
    id: "p2_hand_load",
    phaseId: "P2",
    name: "Hand Load",
    engineBinding: "p2_hand_load (hittingPhases.ts — canonical)",
    displayFormat: "Band + raw on click (CDR-1=D, §14)",
    hierarchyRank: "rank_1",
    weightAthleteView:
      "high (Rank 1; specific per-phase weight inherits §0.27 doctrine-derived hierarchy — BH per-phase numeric weights not enumerated by §0.27 C1, which is BP-only)",
    whatIsIt:
      "What the hands do while the hips load — the upper-body half of the load sequence.",
    whyItMatters:
      "Hand Load sets the path the swing is going to live on. Get it wrong and the swing is fighting the bat from the first move.",
    ifPoorPerformance:
      "Bat path is compromised; barrel is late or out of plane.",
    ifPoorDurability:
      "Forearms and lead shoulder absorb what the load mis-sequenced.",
    ifPoorEfficiency: "The swing has to recover before it can attack.",
    ifPoorConsistency: "Bat path varies pitch to pitch.",
    howToImprove:
      "Coordinate hand load to the hip load — same start, same finish, every time.",
    drillIds: [],
    videoIds: [],
    roadmapStep: null,
    goodLooksLikeClip: null,
    badLooksLikeClip: null,
    coachHammerVoice: { athlete: true, parent: true, coach: true },
    confidenceRule: 'Band on engine confidence; "estimate" otherwise per CDR-7=D',
    missingnessRule:
      '"Not measured this session — hand-load trace unresolvable" per §3 Law 7 / CDR-8=D',
  },
  {
    id: "p3_stride",
    phaseId: "P3",
    name: "Stride & Landing",
    engineBinding:
      "p3_stride (hittingPhases.ts — canonical; not p3_launch from formulaPhases per RFL-074)",
    displayFormat: "Band + raw on click (CDR-1=D, §14)",
    hierarchyRank: "rank_1",
    weightAthleteView: "high (Rank 1)",
    whatIsIt:
      "How you stride and how the front foot lands — the bridge between load and rotation.",
    whyItMatters:
      "A swing fired off a bad landing isn't a swing, it's a guess.",
    ifPoorPerformance: "Power leaks; contact quality drops.",
    ifPoorDurability:
      "Front side absorbs uneven load; knee, hip, and low back pay it.",
    ifPoorEfficiency: "Energy from the load doesn't make it to rotation.",
    ifPoorConsistency: "Contact point drifts with landing drift.",
    howToImprove:
      "Land on time, in line, with intent. Stride is delivery, not preparation.",
    drillIds: [],
    videoIds: [],
    roadmapStep: null,
    goodLooksLikeClip: null,
    badLooksLikeClip: null,
    coachHammerVoice: { athlete: true, parent: true, coach: true },
    confidenceRule:
      'Band on engine confidence; "estimate" if landing frame is partial per CDR-7=D',
    missingnessRule:
      '"Not measured this session — landing frame unresolvable" per §3 Law 7 / CDR-8=D',
  },
  {
    id: "p4_hitters_move",
    phaseId: "P4",
    name: "Hitter's Move",
    engineBinding: "p4_hitters_move (hittingPhases.ts — canonical)",
    displayFormat:
      "Pass/Fail chip (Non-Negotiable gate per §0.7) + band on click (CDR-1=D, §14)",
    hierarchyRank: "non_negotiable",
    weightAthleteView: "n/a — gate",
    whatIsIt:
      "The rotation through contact — how the body fires what the load stored, into the ball.",
    whyItMatters:
      "The Hitter's Move is the swing's payoff. Everything before it is preparation; without this, none of it shows up at contact.",
    ifPoorPerformance:
      "Exit velocity, bat speed, and contact quality all collapse together.",
    ifPoorDurability:
      "The arms try to author the move the body refused to; shoulder, elbow, and lead wrist absorb it.",
    ifPoorEfficiency:
      "Stored energy is spent on rotation correction instead of contact.",
    ifPoorConsistency:
      "Contact quality varies wildly even when load looks identical.",
    howToImprove:
      "Train rotation through contact, not at it. The Hitter's Move finishes through the ball, not on it.",
    drillIds: [],
    videoIds: [],
    roadmapStep: null,
    goodLooksLikeClip: null,
    badLooksLikeClip: null,
    coachHammerVoice: { athlete: true, parent: true, coach: true },
    confidenceRule:
      'Pass/Fail on engine-confident rotation frame; band on full-confidence move; else "estimate" per CDR-5=D / CDR-7=D',
    missingnessRule:
      '"Not measured this session — rotation-through-contact unresolvable" per §3 Law 7 / CDR-8=D. Never silent.',
  },
] as const;

export function getBhCategory(id: BhCategoryId): BhCategorySchema | undefined {
  return BH_V1_CATEGORIES.find((c) => c.id === id);
}
