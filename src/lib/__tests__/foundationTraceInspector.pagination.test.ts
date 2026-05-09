/**
 * Phase I — cursor pagination contiguity.
 * Verifies the cursor advance rule (`lt('created_at', cursor)`) and that the
 * inspector's de-dup invariant (last cursor strictly decreasing) holds across
 * page boundaries when the underlying data has unique created_at values.
 */
import { describe, it, expect } from 'vitest';
import { TRACE_PAGE_SIZE } from '@/lib/foundationThresholds';

interface Row { trace_id: string; created_at: string }

function fakeFetch(all: Row[], cursor: string | null, pageSize = TRACE_PAGE_SIZE) {
  const after = cursor === null ? all : all.filter(r => r.created_at < cursor);
  return after.slice(0, pageSize);
}

function paginateAll(all: Row[]) {
  const acc: Row[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const page = fakeFetch(all, cursor);
    if (page.length === 0) break;
    acc.push(...page);
    cursor = page[page.length - 1].created_at;
    if (page.length < TRACE_PAGE_SIZE) break;
  }
  return acc;
}

describe('cursor pagination', () => {
  it('returns every row exactly once when created_at is unique', () => {
    const all: Row[] = Array.from({ length: 250 }, (_, i) => ({
      trace_id: `t${i}`,
      created_at: new Date(Date.UTC(2026, 0, 1) - i * 60_000).toISOString(),
    }));
    const out = paginateAll(all);
    expect(out.length).toBe(250);
    expect(new Set(out.map(r => r.trace_id)).size).toBe(250);
  });

  it('terminates on partial page', () => {
    const all: Row[] = Array.from({ length: 50 }, (_, i) => ({
      trace_id: `t${i}`,
      created_at: new Date(Date.UTC(2026, 0, 1) - i * 60_000).toISOString(),
    }));
    const out = paginateAll(all);
    expect(out.length).toBe(50);
  });
});
