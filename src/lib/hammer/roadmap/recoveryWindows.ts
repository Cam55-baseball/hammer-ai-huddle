/**
 * Recovery Window Enforcer — the 24 / 48 / 72 / 96 hour "between-attempt"
 * clock. Runs as a post-processor on the daily plan blocks. Never promotes
 * a block; only trims intensity or converts to off-day with a legible
 * "available at" rationale.
 *
 * Rules matrix (base hours; quarter multiplier applied at resolve time):
 *
 *   Modality          Foundation  Build  Bridge  Peak  Sustain
 *   heavy_lift        96          72     72      48    48
 *   max_velocity      72          72     48      48    48
 *   bat_speed_max     72          48     48      24    24     (side-independent)
 *   throwing_max      96          72     48      48    48     (side-independent)
 *
 * Behaviour when today is inside the window since last completion:
 *   - >75% of window remaining → off (roll to next legal day)
 *   - 25–75% remaining         → activation (~30%)
 *   - <25% remaining           → secondary (~60%)
 *
 * The engine outside decides whether a completion actually represents a
 * max-intent attempt. This module only enforces the window given the
 * timestamps it is handed.
 */
import type { PrescribedBlock, ModalityKey, BlockStatus, LateralSide } from "@/lib/hammer/prescription/dailyPlan";
import type { RoadmapRung } from "./roadmapLadder";
import type { QuarterDescriptor } from "./seasonQuarters";

export type RecoveryModality = "heavy_lift" | "max_velocity" | "bat_speed_max" | "throwing_max";

export interface CompletionRecord {
  readonly modality: RecoveryModality;
  readonly at: Date;
  readonly side: LateralSide;
}

export type RecentCompletions = ReadonlyArray<CompletionRecord>;

const BASE_HOURS: Record<RecoveryModality, Record<RoadmapRung, number>> = {
  heavy_lift:    { foundation: 96, build: 72, bridge: 72, peak: 48, sustain: 48 },
  max_velocity:  { foundation: 72, build: 72, bridge: 48, peak: 48, sustain: 48 },
  bat_speed_max: { foundation: 72, build: 48, bridge: 48, peak: 24, sustain: 24 },
  throwing_max:  { foundation: 96, build: 72, bridge: 48, peak: 48, sustain: 48 },
};

/**
 * Which recovery modality does a plan block correspond to?
 * Only modalities that carry the max-intent clock are mapped.
 */
function recoveryModalityFor(m: ModalityKey): RecoveryModality | null {
  switch (m) {
    case "strength": return "heavy_lift";
    case "speed":    return "max_velocity";
    case "hitting":  return "bat_speed_max";
    case "throwing": return "throwing_max";
    default:         return null;
  }
}

export interface RecoveryDecision {
  readonly windowHours: number;
  readonly hoursSince: number | null;   // null = never logged
  readonly hoursRemaining: number;      // 0 if outside window
  readonly action: "primary" | "secondary" | "activation" | "off";
  readonly reason: string;
  readonly nextAvailableAt: Date | null;
}

/**
 * Compute the decision for one (modality, side) pair.
 */
export function evaluateRecoveryWindow(
  mod: RecoveryModality,
  side: LateralSide,
  rung: RoadmapRung,
  quarter: QuarterDescriptor,
  recent: RecentCompletions,
  today: Date,
): RecoveryDecision {
  const base = BASE_HOURS[mod][rung];
  const windowHours = Math.max(12, Math.round(base * quarter.recoveryWindowMultiplier));
  // Side-independent modalities (bat_speed_max, throwing_max) still consult side keys;
  // the caller passes side so an L attempt doesn't gate the R attempt on switch athletes.
  const relevant = recent.filter((r) => r.modality === mod && (side == null || r.side == null || r.side === side));
  if (relevant.length === 0) {
    return {
      windowHours, hoursSince: null, hoursRemaining: 0,
      action: "primary",
      reason: `No recent max-intent ${labelFor(mod)}. Full attempt is legal today (window: ${windowHours}h).`,
      nextAvailableAt: null,
    };
  }
  const latest = relevant.reduce((a, b) => (a.at > b.at ? a : b));
  const hoursSince = Math.max(0, (today.getTime() - latest.at.getTime()) / (60 * 60 * 1000));
  const hoursRemaining = Math.max(0, windowHours - hoursSince);
  const pctRemaining = windowHours > 0 ? hoursRemaining / windowHours : 0;

  if (hoursSince >= windowHours) {
    return {
      windowHours, hoursSince, hoursRemaining: 0,
      action: "primary",
      reason: `Last ${labelFor(mod)} ${fmtHours(hoursSince)} ago — outside the ${windowHours}h ${quarter.accent} window. Full attempt legal.`,
      nextAvailableAt: null,
    };
  }
  const nextAt = new Date(latest.at.getTime() + windowHours * 60 * 60 * 1000);
  if (pctRemaining > 0.75) {
    return {
      windowHours, hoursSince, hoursRemaining,
      action: "off",
      reason: `Last ${labelFor(mod)} only ${fmtHours(hoursSince)} ago. Recovery clock (${windowHours}h at ${labelRung(rung)}) needs ${fmtHours(hoursRemaining)} more — full attempt available ${fmtWhen(nextAt, today)}.`,
      nextAvailableAt: nextAt,
    };
  }
  if (pctRemaining > 0.25) {
    return {
      windowHours, hoursSince, hoursRemaining,
      action: "activation",
      reason: `${fmtHours(hoursSince)} since last ${labelFor(mod)} — inside the ${windowHours}h window. Running at ~30% (activation) so freshness is protected for ${fmtWhen(nextAt, today)}.`,
      nextAvailableAt: nextAt,
    };
  }
  return {
    windowHours, hoursSince, hoursRemaining,
    action: "secondary",
    reason: `${fmtHours(hoursSince)} since last ${labelFor(mod)} — window closes ${fmtWhen(nextAt, today)}. Running at ~60% (secondary).`,
    nextAvailableAt: nextAt,
  };
}

function labelFor(m: RecoveryModality): string {
  switch (m) {
    case "heavy_lift": return "heavy lift";
    case "max_velocity": return "max-velocity sprint";
    case "bat_speed_max": return "max bat-speed set";
    case "throwing_max": return "max-intent throw";
  }
}
function labelRung(r: RoadmapRung): string {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
function fmtWhen(when: Date, today: Date): string {
  const diffH = (when.getTime() - today.getTime()) / (60 * 60 * 1000);
  if (diffH < 1) return "shortly";
  if (diffH < 24) return `in ${Math.round(diffH)}h`;
  const days = Math.round(diffH / 24);
  return `in ${days}d`;
}

/**
 * Apply the recovery clock to plan blocks.
 * - Never promotes a block (awaiting-input / suppressed pass through).
 * - Never touches anchor modalities.
 * - Uses the block's `.side` for switch/ambidextrous laterality.
 */
export function applyRecoveryWindows(
  blocks: ReadonlyArray<PrescribedBlock>,
  rung: RoadmapRung,
  quarter: QuarterDescriptor,
  recent: RecentCompletions,
  today: Date,
): ReadonlyArray<PrescribedBlock> {
  return blocks.map((b) => {
    const mod = recoveryModalityFor(b.modality);
    if (!mod) return b;
    if (b.status === "awaiting-input" || b.status === "suppressed" || b.status === "off-day") {
      return b;
    }
    const side: LateralSide = b.side ?? null;
    const dec = evaluateRecoveryWindow(mod, side, rung, quarter, recent, today);
    if (dec.action === "primary") {
      return {
        ...b,
        roadmapReason: `${b.roadmapReason} · ${dec.reason}`,
      };
    }
    if (dec.action === "off") {
      const nextLine = dec.nextAvailableAt
        ? `Available ${fmtWhen(dec.nextAvailableAt, today)}.`
        : "Available soon.";
      return {
        ...b,
        status: "off-day" as BlockStatus,
        title: `${b.title.split(" — ")[0]} — recovery clock · ${nextLine}`,
        why: dec.reason,
        roadmapReason: dec.reason,
        phase: "recover",
        drills: [],
        steps: [
          `Rest this modality — window is ${dec.windowHours}h at your ${labelRung(rung)} rung (${quarter.accent} quarter).`,
        ],
        cues: [],
        stopRules: [],
        durationMin: 0,
        gamePlanTemplate: null,
      };
    }
    const scale = dec.action === "activation" ? 0.3 : 0.6;
    const scaledDrills = b.drills.map((d) => ({ ...d, dosage: scaleDosageLabel(d.dosage, scale) }));
    return {
      ...b,
      drills: scaledDrills,
      steps: scaledDrills.map((d) => `${d.name} — ${d.dosage}`),
      durationMin: b.durationMin == null ? b.durationMin : Math.max(8, Math.round(b.durationMin * scale)),
      roadmapReason: `${b.roadmapReason} · ${dec.reason}`,
    };
  });
}

function scaleDosageLabel(dosage: string, scale: number): string {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = Math.max(1, Math.round(parseInt(m[1], 10) * scale));
  return dosage.replace(/^(\d+)/, String(sets));
}
