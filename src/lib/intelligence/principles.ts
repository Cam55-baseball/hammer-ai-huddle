// Owner's Coaching Console rules. Versions are append-only; switched-off principles are never used.
export type EvidenceKind = "experience" | "study" | "hammers_pattern";
export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  experience: "Coaching experience",
  study: "A study",
  hammers_pattern: "A Hammers pattern",
};

export interface PrincipleVersion {
  id: string;
  principle_id: string;
  version: number;
  body: string;
  sport: string;
  area: string;
  situation: string | null;
  applies_when: string | null;
  not_when: string | null;
  connected_work: string | null;
  evidence_kind: EvidenceKind;
  evidence_note: string | null;
  created_at: string;
}
export interface Principle { id: string; active: boolean; current_version: number }

export interface PrincipleStats {
  advice: number; followed: number; players_followed: number;
  worked: number; no_change: number; got_worse: number; players_worked: number;
}

/** Only switched-on principles may guide advice. */
export function principlesInUse<T extends Principle>(list: T[]): T[] {
  return list.filter((p) => p.active === true);
}

/** Adding a version never changes or removes an existing one. */
export function appendVersion(
  history: PrincipleVersion[],
  next: Omit<PrincipleVersion, "version">,
): PrincipleVersion[] {
  const top = history.reduce((m, v) => Math.max(m, v.version), 0);
  return [...history.map((v) => ({ ...v })), { ...next, version: top + 1 }];
}

export function latestVersion(history: PrincipleVersion[]): PrincipleVersion | null {
  return history.reduce<PrincipleVersion | null>((m, v) => (!m || v.version > m.version ? v : m), null);
}

// Proposed badge thresholds — owner to confirm.
export const SEEN_MIN_PLAYERS = 3;
export const PROVEN_MIN_PLAYERS = 10;
export const PROVEN_MIN_WORKED_SHARE = 0.6;

export type Badge = "Hammers belief" | "Seen in Hammers players" | "Proven at Hammers";

export function badgeFor(s: PrincipleStats | null | undefined): Badge {
  if (!s) return "Hammers belief";
  const judged = s.worked + s.no_change + s.got_worse;
  if (s.players_worked >= PROVEN_MIN_PLAYERS && judged > 0 && s.worked / judged >= PROVEN_MIN_WORKED_SHARE) {
    return "Proven at Hammers";
  }
  if (s.players_worked >= SEEN_MIN_PLAYERS) return "Seen in Hammers players";
  return "Hammers belief";
}
