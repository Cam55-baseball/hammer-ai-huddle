/**
 * Single source of truth for the per-domain "teaching phases" that the owner
 * can tag a video with in the Video Library Manager.
 *
 * Mirrors the Universal Cause→Effect doctrine and the Hitting 1-2-3-4 memory:
 *  - Hitting P1 Hip Load, P2 Heel Plant, P3 Launch, P4 Hitter's Move (NN P1+P4).
 *  - Pitching / Throwing follow the lateral-shoulders + release checkpoints.
 *  - Fielding, Base Running follow the standard read → execute → finish flow.
 *
 * Phase ids are stable strings stored in `library_videos.formula_phases`
 * (text[]). They are scoped per-domain via the `id` prefix so a single
 * lookup map is unambiguous.
 */

import type { SkillDomain } from './videoRecommendationEngine';

export interface FormulaPhase {
  /** Stable id stored in DB. Lowercase, snake_case, domain-prefixed. */
  id: string;
  /** Short owner-facing label (e.g. "P1 Hip Load"). */
  label: string;
  /** Optional one-liner shown as a tooltip / helper. */
  hint?: string;
  /** Hitting P1 + P4 are NN (non-negotiable) — surface a subtle marker. */
  nonNegotiable?: boolean;
}

const HITTING_PHASES: FormulaPhase[] = [
  { id: 'p1_hip_load',       label: 'P1 Hip Load',       hint: 'NN — hands-break is the hard trigger.', nonNegotiable: true },
  { id: 'p2_heel_plant',     label: 'P2 Heel Plant',     hint: 'Front-side stack, cap 85.' },
  { id: 'p3_launch',         label: 'P3 Launch',         hint: 'Sequencing + barrel turn, cap 75.' },
  { id: 'p4_hitters_move',   label: "P4 Hitter's Move",  hint: 'NN — most important. Hard cap 50, elite +5 bonus.', nonNegotiable: true },
];

const PITCHING_PHASES: FormulaPhase[] = [
  { id: 'pi_p1_setup',           label: 'P1 Setup',            hint: 'Stance, grip, breath.' },
  { id: 'pi_p2_stride',          label: 'P2 Stride',           hint: 'Direction, length, posture.' },
  { id: 'pi_p3_lateral_shoulder', label: 'P3 Lateral Shoulders', hint: 'Belly-button test, scap load.' },
  { id: 'pi_p4_release',         label: 'P4 Release',          hint: 'Out-front, intent, finish.' },
  { id: 'pi_p5_follow_through',  label: 'P5 Follow-through',   hint: 'Deceleration, recovery.' },
];

const THROWING_PHASES: FormulaPhase[] = [
  { id: 'th_p1_grip_setup',      label: 'P1 Grip / Setup',     hint: 'Footwork + ball transfer.' },
  { id: 'th_p2_stride',          label: 'P2 Stride',           hint: 'Direction to target.' },
  { id: 'th_p3_lateral_shoulder', label: 'P3 Lateral Shoulders', hint: 'Sequence — hips before shoulders.' },
  { id: 'th_p4_release',         label: 'P4 Release',          hint: 'Out-front + accuracy.' },
];

const FIELDING_PHASES: FormulaPhase[] = [
  { id: 'fi_p1_pre_pitch',  label: 'P1 Pre-pitch', hint: 'Pre-pitch read + posture.' },
  { id: 'fi_p2_read',       label: 'P2 Read',      hint: 'First-step decision.' },
  { id: 'fi_p3_approach',   label: 'P3 Approach',  hint: 'Route + tempo to ball.' },
  { id: 'fi_p4_field',      label: 'P4 Field / Transfer', hint: 'Glove work, transfer.' },
  { id: 'fi_p5_throw',      label: 'P5 Throw',     hint: 'Footwork + accuracy.' },
];

const BASERUNNING_PHASES: FormulaPhase[] = [
  { id: 'br_p1_read',         label: 'P1 Read',         hint: 'Pitcher / contact read.' },
  { id: 'br_p2_jump',         label: 'P2 Jump',         hint: 'First-step explosiveness.' },
  { id: 'br_p3_acceleration', label: 'P3 Acceleration', hint: 'Drive phase to top speed.' },
  { id: 'br_p4_finish',       label: 'P4 Slide / Finish', hint: 'Slide angle, base touch.' },
];

const BY_DOMAIN: Record<SkillDomain, FormulaPhase[]> = {
  hitting: HITTING_PHASES,
  pitching: PITCHING_PHASES,
  throwing: THROWING_PHASES,
  fielding: FIELDING_PHASES,
  base_running: BASERUNNING_PHASES,
};

/** All phases across every domain — for label lookup of arbitrary stored ids. */
const ALL_PHASES: FormulaPhase[] = Object.values(BY_DOMAIN).flat();
const PHASE_BY_ID = new Map(ALL_PHASES.map(p => [p.id, p]));

export function getPhasesForDomain(domain?: SkillDomain | null): FormulaPhase[] {
  if (!domain) return [];
  return BY_DOMAIN[domain] ?? [];
}

/** Combine phases for multiple domains while preserving deterministic order. */
export function getPhasesForDomains(domains: SkillDomain[]): FormulaPhase[] {
  const seen = new Set<string>();
  const out: FormulaPhase[] = [];
  for (const d of domains) {
    for (const p of getPhasesForDomain(d)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}

export function getPhaseLabel(id: string): string {
  return PHASE_BY_ID.get(id)?.label ?? id;
}

/** Render a compact "P1 + P4" style summary from stored ids. */
export function summarizePhases(ids: string[]): string {
  if (!ids?.length) return '';
  const labels = ids
    .map(id => PHASE_BY_ID.get(id))
    .filter((p): p is FormulaPhase => !!p)
    .map(p => p.label.split(' ')[0]); // "P1", "P4", etc.
  return labels.join(' + ');
}
