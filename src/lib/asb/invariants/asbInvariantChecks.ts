/**
 * Invariant suite runner — CI / manual debug entry point.
 *
 * Pure orchestration: caller supplies sampled events + their downstream
 * projections; runner returns ParityResult[] for assertion.
 *
 * Deleting this file causes ZERO runtime breakage anywhere in the app.
 */
import { buildParityMatrix, type ParityInputs, type ParityResult } from "./asbParityMatrix";

export type { ParityResult } from "./asbParityMatrix";

export interface InvariantSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: ParityResult[];
}

export async function runInvariantSuite(
  samples: ParityInputs[],
): Promise<InvariantSuiteSummary> {
  const results: ParityResult[] = [];
  for (const s of samples) {
    const r = await buildParityMatrix(s);
    results.push(...r);
  }
  const failed = results.filter((r) => !r.pass).length;
  return {
    total: results.length,
    passed: results.length - failed,
    failed,
    results,
  };
}

export function assertInvariantSuite(summary: InvariantSuiteSummary): void {
  if (summary.failed > 0) {
    const reasons = summary.results
      .filter((r) => !r.pass)
      .map((r) => `[${r.subsystem}] ${r.event_id}: ${r.mismatch_reason}`)
      .join("\n");
    throw new Error(`ASB invariant suite FAILED (${summary.failed}/${summary.total}):\n${reasons}`);
  }
}
