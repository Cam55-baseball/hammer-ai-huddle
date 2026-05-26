/**
 * Wave 2 — Parity drift monitor.
 *
 * Periodic in-browser sampler that runs the existing invariant suite over a
 * rolling window of recent events + their downstream projections. Surfaces
 * violations to the operator. Never mutates ledger or projections.
 */
import { runInvariantSuite } from "@/lib/asb/invariants/asbInvariantChecks";
import type { ParityResult } from "@/lib/asb/invariants/asbCrossSystemValidators";

export interface ParityMonitorSample {
  ranAt: string;
  total: number;
  passed: number;
  failed: number;
  violations: ParityResult[];
}

export async function sampleParity(
  // Caller supplies window-fetched events + the projection bundles to test.
  // Kept abstract so the UI layer (ops/Drift) can choose the scope.
  input: Parameters<typeof runInvariantSuite>[0],
): Promise<ParityMonitorSample> {
  const ranAt = new Date().toISOString();
  let results: ParityResult[] = [];
  try {
    results = await runInvariantSuite(input);
  } catch (e) {
    console.error("[ops.parity] suite_threw", (e as Error)?.message);
  }
  const failed = results.filter((r) => !r.pass);
  return {
    ranAt,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    violations: failed,
  };
}
