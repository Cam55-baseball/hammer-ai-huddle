/**
 * intensityMode — Pass C, section 1.
 *
 * Med ball work splits into two genuinely different sessions that happen to
 * share a catalog row shape:
 *
 *   intensive  — a small number of maximal throws. Rep-dosed, envelope math
 *                applies exactly as it does to any other rep-dosed movement.
 *   extensive  — 50–100 throws at submaximal intent. This is a volume of
 *                throws, not sets-and-reps, and forcing it through the
 *                envelope produces nonsense like "10 sets x 8".
 *
 * Extensive sessions therefore ship as `dosage_unit: 'total_reps'`, which the
 * validator already exempts from envelope math (same treatment as innings,
 * contacts and feet). This is NOT a dose change: `resolveDose()` is never
 * consulted for a total-dosed movement in the first place, so nothing that was
 * previously rep-dosed silently moves — only rows we explicitly mark
 * `extensive` change unit, and they carry an explicit total.
 *
 * Pure. No I/O. Deterministic.
 */

export const INTENSITY_MODE_VERSION = "intensity_mode_v1";

export type IntensityMode = "intensive" | "extensive";

/** Default throw volume for an extensive med-ball session. */
export const EXTENSIVE_THROW_FLOOR = 50;
export const EXTENSIVE_THROW_CEILING = 100;

export interface IntensityModeInput {
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  intensity_class?: string | null;
  dosage_unit?: string | null;
  default_total_reps?: number | null;
  /** Explicit catalog value wins over any inference. */
  intensity_mode?: string | null;
}

function isMedBall(m: IntensityModeInput): boolean {
  const hay = `${m.slug ?? ""} ${m.name ?? ""}`.toLowerCase();
  return /med[\s_-]?ball|medball/.test(hay);
}

/**
 * Returns the mode, or null when the movement is not a med-ball row at all.
 * Only med ball is in scope for Pass C — everything else keeps its unit.
 */
export function resolveIntensityMode(m: IntensityModeInput | null | undefined): IntensityMode | null {
  if (!m) return null;
  if (m.intensity_mode === "extensive" || m.intensity_mode === "intensive") {
    return m.intensity_mode;
  }
  if (!isMedBall(m)) return null;
  // Unmarked med ball defaults to `intensive` — the conservative read. An
  // unmarked row keeps its existing rep dose and its existing envelope
  // treatment, so this function can never move an existing prescription.
  return "intensive";
}

export interface ExtensiveDose {
  dosage_unit: string;
  total_reps: number;
}

/**
 * For an extensive med-ball session, produce the total-dosed shape.
 * Returns null for anything that should stay rep-dosed.
 */
export function resolveExtensiveDose(
  m: IntensityModeInput | null | undefined,
  fallbackTotal: number | null = null,
): ExtensiveDose | null {
  if (resolveIntensityMode(m) !== "extensive") return null;
  const declared = m?.default_total_reps ?? fallbackTotal;
  const total =
    typeof declared === "number" && Number.isFinite(declared) && declared > 0
      ? Math.min(EXTENSIVE_THROW_CEILING, Math.max(EXTENSIVE_THROW_FLOOR, Math.trunc(declared)))
      : EXTENSIVE_THROW_FLOOR;
  return { dosage_unit: "total_reps", total_reps: total };
}
