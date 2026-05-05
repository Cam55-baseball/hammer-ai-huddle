import type { Severity } from '@/demo/sims/hittingSim';
import type { PrescribedVideo } from './videoPrescription';

export interface PrescribedHistoryEntry {
  shown: string[];
  accepted: string[];
  skipped: string[];
}
export type PrescribedHistory = Record<string, PrescribedHistoryEntry>;

export interface SimSignatureEntry {
  firstRun: { severity: Severity; gap: number | string; ts: string };
  lastRun:  { severity: Severity; gap: number | string; ts: string };
  runs: number;
}
export type SimSignatures = Record<string, SimSignatureEntry>;

const SEVERITY_ORDER: Severity[] = ['minor', 'moderate', 'critical'];

/** Return up to 3 unseen videos. If pool exhausted at this severity, escalate. */
export function pickUnseen(
  candidates: PrescribedVideo[],
  catalogBySeverity: Record<Severity, PrescribedVideo[]>,
  severity: Severity,
  shown: ReadonlySet<string>,
): PrescribedVideo[] {
  const fresh = candidates.filter(v => !shown.has(v.id));
  if (fresh.length >= 3) return fresh.slice(0, 3);

  // Try escalating severities in order, then de-escalating, to fill the quota.
  const order = [
    severity,
    ...SEVERITY_ORDER.filter(s => s !== severity).sort(
      (a, b) => SEVERITY_ORDER.indexOf(b) - SEVERITY_ORDER.indexOf(a),
    ),
  ];
  const out: PrescribedVideo[] = [...fresh];
  const seen = new Set<string>(fresh.map(v => v.id));
  for (const sev of order) {
    for (const v of catalogBySeverity[sev] ?? []) {
      if (out.length >= 3) return out;
      if (seen.has(v.id) || shown.has(v.id)) continue;
      out.push(v);
      seen.add(v.id);
    }
  }
  // Last resort: refill from original candidates even if shown (don't break the UI).
  for (const v of candidates) {
    if (out.length >= 3) break;
    if (seen.has(v.id)) continue;
    out.push(v);
    seen.add(v.id);
  }
  return out.slice(0, 3);
}

export function recordShown(
  history: PrescribedHistory,
  simId: string,
  videoIds: string[],
): PrescribedHistory {
  const prev = history[simId] ?? { shown: [], accepted: [], skipped: [] };
  const shown = Array.from(new Set([...prev.shown, ...videoIds]));
  return { ...history, [simId]: { ...prev, shown } };
}

export function recordSimRun(
  signatures: SimSignatures,
  simId: string,
  severity: Severity,
  gap: number | string,
): SimSignatures {
  const now = new Date().toISOString();
  const prev = signatures[simId];
  const lastRun = { severity, gap, ts: now };
  if (!prev) return { ...signatures, [simId]: { firstRun: lastRun, lastRun, runs: 1 } };
  return { ...signatures, [simId]: { firstRun: prev.firstRun, lastRun, runs: prev.runs + 1 } };
}
