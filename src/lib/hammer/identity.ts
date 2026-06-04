/**
 * Hammer Wave 1 — C1 Name Disambiguation
 *
 * Single canonical Hammer identity resolver. Pure module. No I/O, no Date.now,
 * no Math.random. Sole exported source of voice/brand/state labels per Phase 3
 * §1 (Brand Layer) and Hammer Execution Constitution §3
 * (single-Hammer-authority row).
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Hammer Activation Phases 1–8 · Wave 1 Execution Package.
 */
import { branding } from "@/branding";

export interface HammerIdentity {
  /** Stable canonical id. Never user-visible; never renamed. */
  readonly id: "hammer";
  /** Voice label spoken by Hammer in any first-person surface. */
  readonly voiceLabel: "Hammer";
  /** Brand label (product / app name). */
  readonly brandLabel: string;
  /**
   * User-visible label for the biomarker chip historically called
   * "Hammer State". Renamed to "Organism State" per Phase 3 §2 forbidden-term
   * doctrine and Wave 1 Execution Package §1 rows 6–9.
   */
  readonly organismStateLabel: "Organism State";
  /** Marketing tagline. */
  readonly tagline: string;
}

export const HAMMER_IDENTITY: HammerIdentity = Object.freeze({
  id: "hammer",
  voiceLabel: "Hammer",
  brandLabel: branding.appName,
  organismStateLabel: "Organism State",
  tagline: branding.tagline,
});

/**
 * Canonical accessor. Pure. Always returns the same frozen object —
 * replay-deterministic across engine_version + reasoning_version.
 */
export function getHammerIdentity(): HammerIdentity {
  return HAMMER_IDENTITY;
}
