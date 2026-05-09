/**
 * Phase I — CSV export cap/chunking behavior.
 * Pure logic test of the loop invariant used by FoundationTraceInspector.exportCsv.
 */
import { describe, it, expect } from 'vitest';
import { TRACE_EXPORT_MAX, TRACE_EXPORT_CHUNK } from '@/lib/foundationThresholds';

function planChunks(rowsAvailable: number) {
  let total = 0;
  const sizes: number[] = [];
  while (total < TRACE_EXPORT_MAX) {
    const want = Math.min(TRACE_EXPORT_CHUNK, TRACE_EXPORT_MAX - total);
    const got = Math.min(want, rowsAvailable - total);
    if (got <= 0) break;
    sizes.push(got);
    total += got;
    if (got < TRACE_EXPORT_CHUNK) break;
  }
  return { total, sizes, capped: total >= TRACE_EXPORT_MAX };
}

describe('CSV export chunking', () => {
  it('terminates early when chunk is partial', () => {
    const r = planChunks(2_500);
    expect(r.total).toBe(2_500);
    expect(r.sizes).toEqual([1_000, 1_000, 500]);
    expect(r.capped).toBe(false);
  });

  it('caps at TRACE_EXPORT_MAX', () => {
    const r = planChunks(50_000);
    expect(r.total).toBe(TRACE_EXPORT_MAX);
    expect(r.capped).toBe(true);
    expect(r.sizes.reduce((a, b) => a + b, 0)).toBe(TRACE_EXPORT_MAX);
  });

  it('handles empty result set', () => {
    expect(planChunks(0)).toEqual({ total: 0, sizes: [], capped: false });
  });
});
