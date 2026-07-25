/**
 * Pitcher Profile — athlete-authored knobs for the pitching engine.
 *
 * Constitutionally additive & never engine-authored: only the athlete (or
 * parent / coach acting for them) may edit these. Stored in localStorage per
 * user for the first cut so the card ships without waiting on a DB migration
 * approval; the shape mirrors the eventual `athlete_pitcher_profile` table
 * so the resolver can move over transparently.
 *
 * Missingness-permissive at every read — an athlete who never opens the
 * pitching settings still gets a safe default profile.
 */

export type PitcherRole =
  | "starter"
  | "reliever"
  | "closer"
  | "two_way"
  | "undecided";

export type PitcherLevel =
  | "youth"
  | "middle_school"
  | "high_school"
  | "travel"
  | "college"
  | "pro"
  | "unknown";

export interface PitcherArsenalPitch {
  readonly key: string;         // e.g. "4s", "2s", "cb", "sl", "ch", "ris", "drop", "screw"
  readonly label: string;
  readonly primary?: boolean;
}

export interface PitcherProfile {
  readonly isPitcher: boolean;               // athlete confirmed they pitch this season
  readonly role: PitcherRole;
  readonly level: PitcherLevel;
  readonly inningsPerOutingTarget: number;   // self-reported capacity
  readonly preferredBullpenDow: number | null; // 0..6, JS getDay(); null = no preference
  readonly arsenal: ReadonlyArray<PitcherArsenalPitch>;
  readonly notes: string | null;
}

export const DEFAULT_PITCHER_PROFILE: PitcherProfile = {
  isPitcher: false,
  role: "undecided",
  level: "unknown",
  inningsPerOutingTarget: 2,
  preferredBullpenDow: null,
  arsenal: [],
  notes: null,
};

const KEY_PREFIX = "hammer.pitcher.profile.v1.";

function keyFor(userId: string | null | undefined): string {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

export function readPitcherProfile(userId: string | null | undefined): PitcherProfile {
  if (typeof window === "undefined") return DEFAULT_PITCHER_PROFILE;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_PITCHER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PitcherProfile>;
    return { ...DEFAULT_PITCHER_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PITCHER_PROFILE;
  }
}

export function writePitcherProfile(
  userId: string | null | undefined,
  profile: PitcherProfile,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(profile));
  } catch {
    /* quota / private-mode → drop silently, card still renders */
  }
}

export function isPitcherPosition(position: string | null | undefined): boolean {
  if (!position) return false;
  const p = position.toLowerCase().trim();
  return p === "p" || p === "sp" || p === "rp" || p === "cp" || p.includes("pitch");
}

/**
 * Should the pitching card mount today?
 * True when the athlete either explicitly set isPitcher, OR their primary
 * position resolves to a pitcher slot (auto-detect).
 */
export function shouldShowPitchingCard(
  profile: PitcherProfile,
  primaryPosition: string | null | undefined,
  secondaryPositions: string | null | undefined,
): boolean {
  if (profile.isPitcher) return true;
  if (isPitcherPosition(primaryPosition)) return true;
  if (secondaryPositions) {
    const parts = secondaryPositions.split(/[,;/]/).map((s) => s.trim());
    if (parts.some(isPitcherPosition)) return true;
  }
  return false;
}

export const BASEBALL_ARSENAL: ReadonlyArray<PitcherArsenalPitch> = [
  { key: "4s", label: "4-seam fastball" },
  { key: "2s", label: "2-seam / sinker" },
  { key: "cut", label: "Cutter" },
  { key: "sl", label: "Slider" },
  { key: "cb", label: "Curveball" },
  { key: "ch", label: "Changeup" },
  { key: "sp", label: "Splitter" },
  { key: "sw", label: "Sweeper" },
];

export const SOFTBALL_ARSENAL: ReadonlyArray<PitcherArsenalPitch> = [
  { key: "fb", label: "Fastball" },
  { key: "ch", label: "Changeup" },
  { key: "drop", label: "Drop ball" },
  { key: "ris", label: "Rise ball" },
  { key: "screw", label: "Screwball" },
  { key: "cv", label: "Curveball" },
  { key: "cb_soft", label: "Off-speed curve" },
];

export function arsenalCatalog(sport: "baseball" | "softball"): ReadonlyArray<PitcherArsenalPitch> {
  return sport === "softball" ? SOFTBALL_ARSENAL : BASEBALL_ARSENAL;
}
