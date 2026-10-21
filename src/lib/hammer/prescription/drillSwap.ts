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

/** Gear detection is a display hint from explicit requirements, never movement-name inference. */
export function detectRequiredGear(d: SwapSubject): string | null {
  return d.equipmentNote?.trim() || null;
}

/** Same-purpose alternatives, least gear-dependent first. */
export function suggestAlternatives(d: SwapSubject): SwapCandidate[] {
  // Names and copied dosage text cannot establish equivalent intent or safety.
  // These old hardcoded suggestions are not canonical prescriptions.
  void d;
  return [];
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
 * Legacy name-only adjustments are notices, never prescription authority.
 * Keep the original complete session until a server-certified replacement exists.
 */
export function applyAdjustments<T extends AdjustableBlock>(
  blocks: readonly T[],
  adjustments: readonly PlanAdjustment[],
): T[] {
  if (adjustments.length === 0) return blocks as T[];
  const byKey = new Map<string, PlanAdjustment>();
  for (const a of adjustments) {
    if (a.action === "position_worked" || !a.original_key) continue;
    if (!byKey.has(a.original_key)) byKey.set(a.original_key, a);
  }
  if (byKey.size === 0) return blocks as T[];

  return blocks.map((b) => {
    let touched = false;
    const notes: string[] = [];
    const drills = b.drills.map((d) => {
      const adj = byKey.get(drillKey(b.modality, d));
      if (!adj || adj.modality !== b.modality) return d;
      touched = true;
      notes.push(`${d.name}: your earlier change needs a safety check. The original work is kept; don't do it if the needed gear or safe space is missing.`);
      return d;
    });
    if (!touched) return b;
    return {
      ...b,
      drills,
      roadmapReason: [b.roadmapReason, ...notes].filter(Boolean).join(" "),
    } as T;
  });
}
