import { memoize } from "./types";

export interface CertState {
  earned: string[];
  lastSource: string | null;
}
const PREFIXES = ["cert."];

export const buildCertState = memoize<CertState>((rows) => {
  const seen = new Set<string>();
  const earned: string[] = [];
  let lastSource: string | null = null;
  for (const r of rows) {
    const p = r.payload as { cert?: string } | undefined;
    if (r.topic_id === "cert.granted" && p?.cert && !seen.has(p.cert)) {
      seen.add(p.cert);
      earned.push(p.cert);
      lastSource = r.event_id;
    }
  }
  return { earned, lastSource };
});

export function certState(rows: Parameters<typeof buildCertState>[0], scope: Parameters<typeof buildCertState>[1]) {
  return buildCertState(rows, scope, PREFIXES);
}
