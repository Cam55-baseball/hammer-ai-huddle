import { expect, it } from 'vitest';
import { readCompleteCatalog } from './readCompleteCatalog';
it('owner can find the newly saved exercise beyond the server first-page cap', async () => {
  const items = Array.from({ length: 1082 }, (_, id) => ({ id }));
  const ranges: number[][] = [];
  const result = await readCompleteCatalog(async (from, to) => { ranges.push([from, to]); return items.slice(from, to + 1); });
  expect(result).toHaveLength(1082);
  expect(result[result.length - 1]?.id).toBe(1081);
  expect(ranges).toEqual([[0, 499], [500, 999], [1000, 1499]]);
});