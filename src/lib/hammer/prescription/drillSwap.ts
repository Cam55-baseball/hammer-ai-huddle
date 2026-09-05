/**
 * Drill swap resolver — "I don't have this" / "give me something else".
 *
 * Rules:
 *  • An alternative must serve the SAME training purpose. We never downgrade a
 *    skill rep into a warm-up.
 *  • We never invent equipment. Alternatives are ordered so the least
 *    gear-dependent option comes first.
 *  • If we genuinely have no equal alternative, we say so instead of guessing.
 */

export interface SwapCandidate {
  readonly name: string;
  readonly dosage: string;
  /** Plain-language reason this is a fair trade. */
  readonly why: string;
  /** Gear this alternative still needs, if any. */
  readonly equipmentNote?: string;
}

export interface SwapSubject {
  readonly name: string;
  readonly dosage: string;
  readonly equipmentNote?: string;
  readonly setup?: string;
}

interface SwapRule {
  /** Words that indicate the drill depends on this piece of gear. */
  readonly match: readonly string[];
  /** Athlete-facing name of the gear. */
  readonly gear: string;
  readonly alternatives: readonly Omit<SwapCandidate, "dosage">[];
}

const RULES: readonly SwapRule[] = [
  {
    match: ["pitching machine", "machine"],
    gear: "a pitching machine",
    alternatives: [
      { name: "Front toss from behind a screen", why: "Same timing work, thrown instead of fired." },
      { name: "High tee / low tee ladder", why: "Keeps the swing plane work when nobody can throw to you." },
    ],
  },
  {
    match: ["batting cage", "cage"],
    gear: "a batting cage",
    alternatives: [
      { name: "Tee work into a net", why: "Same swings, contained by a net instead of a cage.", equipmentNote: "tee, net" },
      { name: "Dry swings with a heavy towel", why: "Keeps the swing pattern when you have no place to hit a ball." },
    ],
  },
  {
    match: ["rebounder", "pitch back"],
    gear: "a rebounder net",
    alternatives: [
      { name: "Wall throws", why: "A flat wall returns the ball the same way.", equipmentNote: "a wall you're allowed to throw against" },
      { name: "Partner toss", why: "Same rapid-fire rhythm with a person instead of a net." },
    ],
  },
  {
    match: ["med ball", "medicine ball", "reactive_med_ball", "plyo ball"],
    gear: "a medicine or plyo ball",
    alternatives: [
      { name: "Band rotational punch", why: "Same rotational intent with elastic resistance.", equipmentNote: "resistance band" },
      { name: "Explosive rotational bodyweight throws (no ball)", why: "Keeps the rotation and the intent with nothing in your hands." },
    ],
  },
  {
    match: ["weighted ball", "overload ball", "underload"],
    gear: "weighted balls",
    alternatives: [
      { name: "Intent throws with a regular ball", why: "Same arm-speed intent, standard ball." },
      { name: "Towel drill", why: "Full arm path with no ball at all." },
    ],
  },
  {
    match: ["barbell", "back squat", "front squat", "bench press", "deadlift"],
    gear: "a barbell",
    alternatives: [
      { name: "Dumbbell or kettlebell version", why: "Same movement, loaded with what you have.", equipmentNote: "dumbbells or kettlebells" },
      { name: "Bodyweight tempo version (3 seconds down)", why: "Slow tempo replaces the missing load." },
    ],
  },
  {
    match: ["dumbbell", "kettlebell"],
    gear: "dumbbells or kettlebells",
    alternatives: [
      { name: "Backpack-loaded version", why: "A loaded backpack is real weight." },
      { name: "Bodyweight tempo version (3 seconds down)", why: "Slow tempo replaces the missing load." },
    ],
  },
  {
    match: ["cable", "cable chop", "pulley"],
    gear: "a cable machine",
    alternatives: [
      { name: "Band version anchored at chest height", why: "A band gives the same line of pull.", equipmentNote: "resistance band" },
      { name: "Bodyweight rotational hold", why: "Keeps the anti-rotation work with nothing at all." },
    ],
  },
  {
    match: ["band", "resistance band"],
    gear: "a resistance band",
    alternatives: [
      { name: "Bodyweight version, slower and paused", why: "Tempo and pauses replace the band tension." },
    ],
  },
  {
    match: ["sled", "prowler"],
    gear: "a sled",
    alternatives: [
      { name: "Hill sprints", why: "A hill loads acceleration the same way.", equipmentNote: "a hill or ramp" },
      { name: "Wall drive marches", why: "Same push angle, no gear." },
    ],
  },
  {
    match: ["box jump", "plyo box", "box"],
    gear: "a plyo box",
    alternatives: [
      { name: "Broad jump with a soft landing", why: "Same jump quality without a box to land on." },
      { name: "Step or bench version", why: "Any solid knee-height step works.", equipmentNote: "a sturdy step or bench" },
    ],
  },
  {
    match: ["radar", "rapsodo", "hittrax", "blast"],
    gear: "a measuring device",
    alternatives: [
      { name: "Same drill, logged by feel", why: "Do the work; just record it as unmeasured rather than skipping it." },
    ],
  },
  {
    match: ["tee"],
    gear: "a hitting tee",
    alternatives: [
      { name: "Soft toss from the side", why: "Same contact work with a partner instead of a tee." },
      { name: "Dry swings to a checkpoint", why: "Keeps the swing pattern with no ball." },
    ],
  },
  {
    match: ["turf", "field", "mound"],
    gear: "a field or mound",
    alternatives: [
      { name: "Flat-ground version in any open space", why: "Same work, flat ground." },
    ],
  },
];

function haystack(d: SwapSubject): string {
  return `${d.name} ${d.equipmentNote ?? ""} ${d.setup ?? ""}`.toLowerCase();
}

/** The gear this drill appears to depend on, in plain words. */
export function detectRequiredGear(d: SwapSubject): string | null {
  const h = haystack(d);
  for (const rule of RULES) {
    if (rule.match.some((m) => h.includes(m))) return rule.gear;
  }
  return null;
}

/** Same-purpose alternatives, least gear-dependent first. */
export function suggestAlternatives(d: SwapSubject): SwapCandidate[] {
  const h = haystack(d);
  const out: SwapCandidate[] = [];
  for (const rule of RULES) {
    if (!rule.match.some((m) => h.includes(m))) continue;
    for (const alt of rule.alternatives) {
      if (out.some((o) => o.name === alt.name)) continue;
      out.push({ ...alt, dosage: d.dosage });
    }
  }
  return out;
}

export interface PlanAdjustment {
  readonly id?: string;
  readonly modality: string;
  readonly action: "unavailable" | "swap" | "position_worked";
  readonly scope: "today" | "always";
  readonly original_key: string | null;
  readonly original_name: string | null;
  readonly replacement_name: string | null;
  readonly replacement_dosage: string | null;
  readonly reason: string | null;
  readonly position_code?: string | null;
}

export function drillKey(modality: string, drill: { slug?: string; name: string }): string {
  return `${modality}::${(drill.slug ?? drill.name).toLowerCase().trim()}`;
}

interface AdjustableBlock {
  readonly modality: string;
  readonly drills: ReadonlyArray<{ name: string; slug?: string; dosage: string; equipmentNote?: string; setup?: string; cue?: string; stopIf?: string }>;
  readonly roadmapReason?: string;
}

/**
 * Apply saved adjustments to generated blocks. Swaps replace the drill and
 * label it; "unavailable with no alternative" removes it and says why.
 */
export function applyAdjustments<T extends AdjustableBlock>(
  blocks: readonly T[],
  adjustments: readonly PlanAdjustment[],
): T[] {
  if (adjustments.length === 0) return blocks as T[];
  const byKey = new Map<string, PlanAdjustment>();
  for (const a of adjustments) {
    if (a.action === "position_worked" || !a.original_key) continue;
    byKey.set(a.original_key, a);
  }
  if (byKey.size === 0) return blocks as T[];

  return blocks.map((b) => {
    let touched = false;
    const notes: string[] = [];
    const drills = b.drills.flatMap((d) => {
      const adj = byKey.get(drillKey(b.modality, d));
      if (!adj) return [d];
      touched = true;
      if (!adj.replacement_name) {
        notes.push(`${d.name} was left out — you told me you can't do it${adj.reason ? ` (${adj.reason})` : ""}.`);
        return [];
      }
      notes.push(`${adj.replacement_name} replaces ${d.name} — swapped by you.`);
      return [
        {
          ...d,
          name: adj.replacement_name,
          dosage: adj.replacement_dosage ?? d.dosage,
          slug: undefined,
          equipmentNote: undefined,
        },
      ];
    });
    if (!touched) return b;
    return {
      ...b,
      drills,
      roadmapReason: [b.roadmapReason, ...notes].filter(Boolean).join(" "),
    } as T;
  });
}
