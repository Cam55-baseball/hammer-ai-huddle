/**
 * sportRules — THE single source of truth for every sport-respective
 * vocabulary in Game Hub.
 *
 * Loggers, dossier drawers, pregame plans, scouting reports and postgame
 * reports all read from here. Nothing in the game module is allowed to hold
 * its own pitch-type or arm-slot list — that is how baseball athletes end up
 * being offered a rise ball and softball athletes a knuckleball.
 */

export type GameSport = "baseball" | "softball";

export function asGameSport(s: unknown): GameSport {
  return String(s ?? "").toLowerCase() === "softball" ? "softball" : "baseball";
}

export interface PitchTypeDef {
  /** stored value — stable across the whole ledger */
  value: string;
  /** short chip label */
  label: string;
  /** coach-legible name used in reports */
  full: string;
  /** rough family for report rollups */
  family: "fastball" | "breaking" | "offspeed" | "movement";
}

const BASEBALL_PITCHES: PitchTypeDef[] = [
  { value: "FB", label: "FB", full: "Four-seam fastball", family: "fastball" },
  { value: "2-seam", label: "2S", full: "Two-seam / sinker", family: "fastball" },
  { value: "CT", label: "CT", full: "Cutter", family: "fastball" },
  { value: "SL", label: "SL", full: "Slider", family: "breaking" },
  { value: "SW", label: "SW", full: "Sweeper", family: "breaking" },
  { value: "CB", label: "CB", full: "Curveball", family: "breaking" },
  { value: "CH", label: "CH", full: "Changeup", family: "offspeed" },
  { value: "SP", label: "SP", full: "Splitter", family: "offspeed" },
  { value: "KN", label: "KN", full: "Knuckleball", family: "movement" },
];

const SOFTBALL_PITCHES: PitchTypeDef[] = [
  { value: "FB", label: "FB", full: "Fastball", family: "fastball" },
  { value: "rise", label: "Rise", full: "Riseball", family: "movement" },
  { value: "drop", label: "Drop", full: "Dropball", family: "movement" },
  { value: "peel-drop", label: "Peel", full: "Peel drop", family: "movement" },
  { value: "screw", label: "Screw", full: "Screwball", family: "movement" },
  { value: "CB", label: "Curve", full: "Curveball", family: "breaking" },
  { value: "CH", label: "Change", full: "Changeup", family: "offspeed" },
  { value: "flat", label: "Flat", full: "Flat / off-speed rise", family: "offspeed" },
];

export function pitchTypes(sport: unknown): PitchTypeDef[] {
  return asGameSport(sport) === "softball" ? SOFTBALL_PITCHES : BASEBALL_PITCHES;
}

export function pitchTypeValues(sport: unknown): string[] {
  return pitchTypes(sport).map((p) => p.value);
}

/** Human name for a stored pitch value, sport-correct. Falls back to the raw value. */
export function pitchTypeLabel(sport: unknown, value?: string | null): string {
  if (!value) return "—";
  const hit = pitchTypes(sport).find((p) => p.value === value);
  if (hit) return hit.full;
  // value logged under the other sport (imported data) — still name it
  const other = [...BASEBALL_PITCHES, ...SOFTBALL_PITCHES].find((p) => p.value === value);
  return other?.full ?? value;
}

export function pitchFamily(sport: unknown, value?: string | null): PitchTypeDef["family"] | "unknown" {
  if (!value) return "unknown";
  const hit =
    pitchTypes(sport).find((p) => p.value === value) ??
    [...BASEBALL_PITCHES, ...SOFTBALL_PITCHES].find((p) => p.value === value);
  return hit?.family ?? "unknown";
}

export interface ArmSlotDef {
  value: string;
  label: string;
}

const BASEBALL_SLOTS: ArmSlotDef[] = [
  { value: "over_top", label: "Over the top" },
  { value: "high_three_quarter", label: "High 3/4" },
  { value: "three_quarter", label: "3/4" },
  { value: "low_three_quarter", label: "Low 3/4" },
  { value: "side_arm", label: "Sidearm" },
  { value: "submarine", label: "Submarine" },
];

const SOFTBALL_SLOTS: ArmSlotDef[] = [
  { value: "windmill", label: "Windmill" },
  { value: "windmill_high_release", label: "Windmill — high release" },
  { value: "windmill_low_release", label: "Windmill — low release" },
  { value: "slingshot", label: "Slingshot" },
];

export function armSlots(sport: unknown): ArmSlotDef[] {
  return asGameSport(sport) === "softball" ? SOFTBALL_SLOTS : BASEBALL_SLOTS;
}

export function armSlotLabel(sport: unknown, value?: string | null): string {
  if (!value) return "—";
  const all = [...BASEBALL_SLOTS, ...SOFTBALL_SLOTS];
  return (
    armSlots(sport).find((s) => s.value === value)?.label ??
    all.find((s) => s.value === value)?.label ??
    value
  );
}

/** Playing-surface facts that change situational logic between the sports. */
export interface SportGeometry {
  pitchingDistanceFt: number;
  baseDistanceFt: number;
  /** rough time (s) a pitch is in flight at typical velo — used for read/steal context */
  typicalReactionWindowSec: number;
  leadoffsAllowed: boolean;
  /** language used for "the pitcher's release" in cues */
  deliveryNoun: string;
}

const BASEBALL_GEOMETRY: SportGeometry = {
  pitchingDistanceFt: 60.5,
  baseDistanceFt: 90,
  typicalReactionWindowSec: 0.4,
  leadoffsAllowed: true,
  deliveryNoun: "release",
};

const SOFTBALL_GEOMETRY: SportGeometry = {
  pitchingDistanceFt: 43,
  baseDistanceFt: 60,
  typicalReactionWindowSec: 0.35,
  leadoffsAllowed: false,
  deliveryNoun: "release (leave on release, no leadoff)",
};

export function sportGeometry(sport: unknown): SportGeometry {
  return asGameSport(sport) === "softball" ? SOFTBALL_GEOMETRY : BASEBALL_GEOMETRY;
}

/** Zone-language emphasis used by plans and reports. */
export function zoneEmphasis(sport: unknown): string {
  return asGameSport(sport) === "softball"
    ? "Top of the zone is the riseball lane — chase up is the number-one leak. Bottom is drop/peel."
    : "Top of the zone is the four-seam lane, bottom is sinker/breaking. Chase down-and-away is the number-one leak.";
}

/** Positions that exist in each sport (same nine, kept here so reports agree). */
export const FIELD_POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
export type FieldPosition = (typeof FIELD_POSITIONS)[number];
