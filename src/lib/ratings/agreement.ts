/** Plan 4 §A "Do you agree?" — feedback only; never changes a rating. */
export interface AgreementRow { test_key: string; metric_key: string; sport: string; position: string | null; agree: boolean }
export interface AgreementGroup { key: string; test_key: string; metric_key: string; sport: string; position: string; total: number; agreed: number; rate: number }

export function agreementRates(rows: AgreementRow[]): AgreementGroup[] {
  const m = new Map<string, AgreementGroup>();
  for (const r of rows) {
    const position = r.position ?? "Not recorded";
    const key = [r.test_key, r.metric_key, r.sport, position].join("|");
    const g = m.get(key) ?? { key, test_key: r.test_key, metric_key: r.metric_key, sport: r.sport, position, total: 0, agreed: 0, rate: 0 };
    g.total += 1; if (r.agree) g.agreed += 1;
    g.rate = g.agreed / g.total;
    m.set(key, g);
  }
  return [...m.values()].sort((a, b) => a.rate - b.rate || b.total - a.total);
}
