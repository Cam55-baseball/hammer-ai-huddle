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
  advice: number | null; followed: number | null; players_followed: number | null;
  worked: number | null; no_change: number | null; got_worse: number | null; players_worked: number | null;
  /** True when fewer than PRIVACY_MIN_PLAYERS players are involved; the server hid the counts. */
  hidden_small_group?: boolean;
}

/** Population learning never shows counts from fewer than this many players (no reverse-identification). TEST accounts are left out server-side. */
export const PRIVACY_MIN_PLAYERS = 3;
export const SMALL_GROUP_NOTE = `Fewer than ${PRIVACY_MIN_PLAYERS} players so far — numbers hidden to protect privacy`;

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

/** Declared current version only; uncommitted future history is not current advice. */
export function declaredPrincipleVersion(principle: Principle, versions: readonly PrincipleVersion[]): PrincipleVersion | null {
  const matches = versions.filter(v => v.principle_id === principle.id && v.version === principle.current_version);
  return matches.length === 1 ? matches[0] : null;
}

// Badge thresholds — owner-approved.
export const SEEN_MIN_PLAYERS = 3;
export const PROVEN_MIN_PLAYERS = 10;
export const PROVEN_MIN_WORKED_SHARE = 0.6;

export type Badge = "Hammers belief" | "Seen in Hammers players" | "Proven at Hammers";

export function badgeFor(s: PrincipleStats | null | undefined): Badge {
  if (!s || s.players_worked == null) return "Hammers belief";
  const worked = s.worked ?? 0;
  const judged = worked + (s.no_change ?? 0) + (s.got_worse ?? 0);
  if (s.players_worked >= PROVEN_MIN_PLAYERS && judged > 0 && worked / judged >= PROVEN_MIN_WORKED_SHARE) {
    return "Proven at Hammers";
  }
  if (s.players_worked >= SEEN_MIN_PLAYERS) return "Seen in Hammers players";
  return "Hammers belief";
}
