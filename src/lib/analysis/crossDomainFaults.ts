/**
 * Cross-modality fault correlation.
 *
 * Pure. Takes the persisted fault findings for one athlete and groups them by
 * root movement pattern. A pattern seen in more than one skill domain is
 * ranked above single-domain faults, because it is one problem costing the
 * athlete in several places.
 *
 * Resolution is measured, never assumed: a domain counts as clear only when
 * that domain's MOST RECENT analysis no longer carries the pattern. A pattern
 * is fully resolved only when every affected domain is clear.
 */
import { rootPattern, type RootPattern } from "./rootPatterns";

export interface FaultFinding {
  id?: string;
  video_id: string | null;
  skill_domain: string;
  sport?: string | null;
  fault_key: string;
  movement_key: string | null;
  correction_key: string | null;
  root_pattern_key: string | null;
  evidence: string | null;
  created_at: string;
}

export interface DomainExpression {
  domain: string;
  /** How many analyses in this domain carried the pattern. */
  occurrences: number;
  /** Most recent sentence explaining it in this domain. */
  says: string | null;
  lastSeenAt: string;
  correctionKeys: string[];
  /** True when this domain's latest analysis no longer shows the pattern. */
  clearedInLatest: boolean;
}

export interface RootPatternGroup {
  pattern: RootPattern;
  domains: DomainExpression[];
  crossDomain: boolean;
  totalOccurrences: number;
  lastSeenAt: string;
  correctionKeys: string[];
  /** Every affected domain's latest analysis is clean. */
  resolvedEverywhere: boolean;
}

function latestAnalysisPerDomain(findings: FaultFinding[]): Map<string, string> {
  // The newest analysis timestamp we have per domain, whatever it flagged.
  const latest = new Map<string, string>();
  for (const f of findings) {
    const prev = latest.get(f.skill_domain);
    if (!prev || f.created_at > prev) latest.set(f.skill_domain, f.created_at);
  }
  return latest;
}

/**
 * @param findings   all fault rows for the athlete
 * @param latestByDomain optional map of domain → timestamp of that domain's
 *   most recent analysis run (including runs that flagged nothing). Without it
 *   we fall back to the newest finding in that domain, which can never show a
 *   pattern as cleared.
 */
export function correlateRootPatterns(
  findings: FaultFinding[],
  latestByDomain?: Map<string, string>,
): RootPatternGroup[] {
  const domainLatest = latestByDomain ?? latestAnalysisPerDomain(findings);
  const byRoot = new Map<string, FaultFinding[]>();

  for (const f of findings) {
    if (!f.root_pattern_key) continue;
    const arr = byRoot.get(f.root_pattern_key) ?? [];
    arr.push(f);
    byRoot.set(f.root_pattern_key, arr);
  }

  const groups: RootPatternGroup[] = [];
  byRoot.forEach((rows, key) => {
    const pattern = rootPattern(key);
    if (!pattern) return;

    const byDomain = new Map<string, FaultFinding[]>();
    rows.forEach((r) => {
      const arr = byDomain.get(r.skill_domain) ?? [];
      arr.push(r);
      byDomain.set(r.skill_domain, arr);
    });

    const domains: DomainExpression[] = [];
    byDomain.forEach((rs, domain) => {
      const sorted = [...rs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const lastSeenAt = sorted[0].created_at;
      const domainLatestAt = domainLatest.get(domain) ?? lastSeenAt;
      domains.push({
        domain,
        occurrences: new Set(sorted.map((r) => r.video_id ?? r.created_at)).size,
        says: sorted[0].evidence,
        lastSeenAt,
        correctionKeys: [...new Set(sorted.map((r) => r.correction_key).filter((c): c is string => !!c))],
        clearedInLatest: domainLatestAt > lastSeenAt,
      });
    });

    domains.sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));

    groups.push({
      pattern,
      domains,
      crossDomain: domains.length > 1,
      totalOccurrences: domains.reduce((n, d) => n + d.occurrences, 0),
      lastSeenAt: domains[0].lastSeenAt,
      correctionKeys: [...new Set(domains.flatMap((d) => d.correctionKeys))],
      resolvedEverywhere: domains.every((d) => d.clearedInLatest),
    });
  });

  // Cross-domain first, then how widely it shows up, then recency.
  groups.sort((a, b) => {
    if (a.crossDomain !== b.crossDomain) return a.crossDomain ? -1 : 1;
    if (a.domains.length !== b.domains.length) return b.domains.length - a.domains.length;
    if (a.totalOccurrences !== b.totalOccurrences) return b.totalOccurrences - a.totalOccurrences;
    return a.lastSeenAt < b.lastSeenAt ? 1 : -1;
  });

  return groups;
}

/** Correction keys belonging to an unresolved cross-domain pattern. */
export function crossDomainCorrectionKeys(groups: RootPatternGroup[]): string[] {
  return [
    ...new Set(
      groups
        .filter((g) => g.crossDomain && !g.resolvedEverywhere)
        .flatMap((g) => g.correctionKeys),
    ),
  ];
}

const DOMAIN_LABELS: Record<string, string> = {
  hitting: "hitting",
  pitching: "pitching",
  throwing: "throwing",
};

export function domainListSentence(domains: string[]): string {
  const names = domains.map((d) => DOMAIN_LABELS[d] ?? d);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
