/**
 * TEMPORARY — on-screen frame-rate readout for the owner's device check.
 *
 * TO REMOVE after the mobile Safari check:
 *   1. Delete this file and src/components/debug/FpsProbeReadout.tsx.
 *   2. Remove the `<FpsProbeReadout />` line (and its import) from src/App.tsx.
 *   3. Remove the `publishFpsProbe(...)` call in src/lib/biomech/probeVideoMetadata.ts.
 * Or, to hide it without deleting anything, set FPS_PROBE_READOUT_ENABLED = false.
 */
import type { ProbedVideoMetadata } from "./probeVideoMetadata";

export const FPS_PROBE_READOUT_ENABLED = true;

export interface FpsProbeReport {
  readonly probe: ProbedVideoMetadata;
  readonly decision: string;
}

let latest: FpsProbeReport | null = null;
const listeners = new Set<(r: FpsProbeReport | null) => void>();

export function publishFpsProbe(probe: ProbedVideoMetadata, decision: string): void {
  if (!FPS_PROBE_READOUT_ENABLED) return;
  latest = { probe, decision };
  listeners.forEach((l) => l(latest));
}

export function clearFpsProbe(): void {
  latest = null;
  listeners.forEach((l) => l(null));
}

export function subscribeFpsProbe(fn: (r: FpsProbeReport | null) => void): () => void {
  listeners.add(fn);
  fn(latest);
  return () => listeners.delete(fn);
}
