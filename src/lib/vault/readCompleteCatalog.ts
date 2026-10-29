/** Owner list reads every page; a server row cap must not hide a new save. */
export async function readCompleteCatalog<T>(readPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const page = await readPage(from, from + 499);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}