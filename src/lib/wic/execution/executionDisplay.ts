/**
 * executionDisplay — Pass C, section 1.
 *
 * THE EXECUTION LAYER IS DISPLAY ONLY. It cannot touch a dose.
 *
 * Every field here is read off an already-persisted `wk_prescriptions` row and
 * turned into a string. Nothing in this module returns a set count, a rep
 * count or a load. `open_ended` renders "10+" — the stored number is still the
 * doctrine's number, and the "+" is a suffix on the way to the screen and
 * nowhere else.
 *
 * Defensive by construction:
 *   - every derivation runs inside one top-level try/catch
 *   - a null field renders nothing
 *   - an UNKNOWN enum value renders nothing (never the raw string, never a
 *     throw) — a value we do not recognise is a value we do not explain
 *
 * The failure mode we are designing against is a bad row taking down the whole
 * card. `deriveExecutionDisplay` returns `EMPTY_EXECUTION_DISPLAY` rather than
 * propagating, so the worst case is the athlete sees today's plan exactly as
 * they saw it before this layer existed.
 */

export const EXECUTION_DISPLAY_VERSION = "execution_display_v1";

/** In-season reps-in-reserve floor. Never to failure during the season. */
export const IN_SEASON_RIR_FLOOR = 3;

/**
 * Slots where a set RANGE or a density target may be shown.
 * Deliberately excludes `lift` — a compound row shows the doctrine's count and
 * only the doctrine's count.
 */
const RANGE_ELIGIBLE_SLOTS = new Set(["supplemental"]);
const RANGE_ELIGIBLE_ROLE_PATTERN = /warm|prime|recovery|mobility|flush|cooldown/i;

const INTENT_LABEL: Record<string, string> = {
  max_strength: "Max strength",
  speed_strength: "Speed-strength",
  strength_speed: "Strength-speed",
  hypertrophy: "Tissue building",
  power: "Power",
  tissue_capacity: "Tissue capacity",
  motor_control: "Motor control",
  potentiation: "Potentiation",
  work_capacity: "Work capacity",
  restoration: "Restoration",
};

const ASYMMETRY_COPY: Record<string, string> = {
  weak_side_twice: "Tighter side first and last.",
  weak_side_first: "Start on the tighter side.",
  even: "Match both sides.",
};

const INTENSITY_MODE_COPY: Record<string, string> = {
  extensive: "Extensive — volume of throws, quality over max effort on any one.",
  intensive: "Intensive — every rep at full intent.",
};

/** The narrow slice of a prescription row this layer is allowed to read. */
export interface ExecutionSource {
  slot?: string | null;
  sequence_role?: string | null;
  phase?: string | null;
  sets?: number | null;
  reps?: number | null;
  intent_tag?: string | null;
  execution_note?: string | null;
  per_side?: boolean | null;
  asymmetry_rule?: string | null;
  open_ended?: boolean | null;
  set_range_max?: number | null;
  density_target_seconds?: number | null;
  rir_low?: number | null;
  rir_high?: number | null;
  cue_ids?: string[] | null;
  troubleshoot_video_id?: string | null;
  intensity_mode?: string | null;
}

export interface ExecutionDisplay {
  /** Suffix to append to the rendered rep count. "" or "+". */
  repsSuffix: string;
  /** "3–5 sets", or null. Replaces the plain set count when present. */
  setsLabel: string | null;
  /** "Inside 8 min", or null. */
  densityLabel: string | null;
  /** "1–3 reps in reserve", or null. */
  rirLabel: string | null;
  intentLabel: string | null;
  executionNote: string | null;
  perSideLabel: string | null;
  asymmetryLabel: string | null;
  intensityModeLabel: string | null;
  cueIds: string[];
  troubleshootVideoId: string | null;
  /** Anything suppressed by an in-season ban, for the derivation log / tests. */
  suppressed: string[];
}

export const EMPTY_EXECUTION_DISPLAY: ExecutionDisplay = Object.freeze({
  repsSuffix: "",
  setsLabel: null,
  densityLabel: null,
  rirLabel: null,
  intentLabel: null,
  executionNote: null,
  perSideLabel: null,
  asymmetryLabel: null,
  intensityModeLabel: null,
  cueIds: [],
  troubleshootVideoId: null,
  suppressed: [],
});

function isInSeason(phase: string | null | undefined): boolean {
  return typeof phase === "string" && phase.toLowerCase() === "in_season";
}

function rangeEligible(src: ExecutionSource): boolean {
  const slot = (src.slot ?? "").toLowerCase();
  if (RANGE_ELIGIBLE_SLOTS.has(slot)) return true;
  const role = src.sequence_role ?? "";
  return RANGE_ELIGIBLE_ROLE_PATTERN.test(role);
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function formatSeconds(total: number): string {
  if (total >= 60 && total % 60 === 0) return `${total / 60} min`;
  if (total >= 60) return `${Math.round(total / 60)} min`;
  return `${total} sec`;
}

export function deriveExecutionDisplay(
  src: ExecutionSource | null | undefined,
): ExecutionDisplay {
  if (!src) return EMPTY_EXECUTION_DISPLAY;
  try {
    const inSeason = isInSeason(src.phase);
    const eligible = rangeEligible(src);
    const suppressed: string[] = [];

    // ── open_ended → "10+" ────────────────────────────────────────────────
    // Banned in-season: an open-ended set is an invitation to go to failure.
    let repsSuffix = "";
    if (src.open_ended === true) {
      if (inSeason) suppressed.push("open_ended:in_season");
      else repsSuffix = "+";
    }

    // ── set_range_max → "3–5 sets" ────────────────────────────────────────
    // The doctrine's count is ALWAYS the minimum. A max at or below it is a
    // no-op, not a reduction — this layer can never lower a set count.
    // Banned in-season for the same reason as open_ended: "up to five sets" is
    // open-ended volume on a day the ceiling says 6 movements in 30 minutes.
    let setsLabel: string | null = null;
    const rangeMax = positiveInt(src.set_range_max);
    const doctrineSets = positiveInt(src.sets);
    if (rangeMax !== null && doctrineSets !== null) {
      if (inSeason) suppressed.push("set_range_max:in_season");
      else if (!eligible) suppressed.push("set_range_max:slot_not_eligible");
      else if (rangeMax > doctrineSets) setsLabel = `${doctrineSets}–${rangeMax} sets`;
    }


    // ── density_target_seconds ────────────────────────────────────────────
    let densityLabel: string | null = null;
    const density = positiveInt(src.density_target_seconds);
    if (density !== null) {
      if (inSeason) suppressed.push("density_target_seconds:in_season");
      else if (!eligible) suppressed.push("density_target_seconds:slot_not_eligible");
      else densityLabel = `Inside ${formatSeconds(density)}`;
    }

    // ── reps in reserve, floored at 3 in-season ───────────────────────────
    let rirLabel: string | null = null;
    let lo = positiveInt(src.rir_low) ?? (src.rir_low === 0 ? 0 : null);
    let hi = positiveInt(src.rir_high) ?? (src.rir_high === 0 ? 0 : null);
    if (lo !== null || hi !== null) {
      if (inSeason) {
        const flooredLo = Math.max(lo ?? IN_SEASON_RIR_FLOOR, IN_SEASON_RIR_FLOOR);
        if (flooredLo !== lo) suppressed.push("rir_low:in_season_floor_3");
        lo = flooredLo;
        if (hi !== null && hi < lo) hi = lo;
      }
      if (lo !== null && hi !== null && hi > lo) rirLabel = `${lo}–${hi} reps in reserve`;
      else if (lo !== null) rirLabel = `${lo} reps in reserve`;
      else if (hi !== null) rirLabel = `${hi} reps in reserve`;
    }

    // ── plain lookups: unknown value renders nothing ──────────────────────
    const intentLabel =
      typeof src.intent_tag === "string" ? INTENT_LABEL[src.intent_tag] ?? null : null;
    const asymmetryLabel =
      typeof src.asymmetry_rule === "string" ? ASYMMETRY_COPY[src.asymmetry_rule] ?? null : null;
    const intensityModeLabel =
      typeof src.intensity_mode === "string"
        ? INTENSITY_MODE_COPY[src.intensity_mode] ?? null
        : null;

    const executionNote =
      typeof src.execution_note === "string" && src.execution_note.trim().length > 0
        ? src.execution_note.trim()
        : null;

    const perSideLabel = src.per_side === true ? "Each side." : null;

    const cueIds = Array.isArray(src.cue_ids)
      ? src.cue_ids.filter((c): c is string => typeof c === "string" && c.length > 0)
      : [];

    const troubleshootVideoId =
      typeof src.troubleshoot_video_id === "string" && src.troubleshoot_video_id.length > 0
        ? src.troubleshoot_video_id
        : null;

    return {
      repsSuffix,
      setsLabel,
      densityLabel,
      rirLabel,
      intentLabel,
      executionNote,
      perSideLabel,
      asymmetryLabel,
      intensityModeLabel,
      cueIds,
      troubleshootVideoId,
      suppressed,
    };
  } catch {
    // A malformed row must never take the card down.
    return EMPTY_EXECUTION_DISPLAY;
  }
}
