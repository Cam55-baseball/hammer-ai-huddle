/**
 * glossary — plain-language meaning for every code used in Game Hub.
 *
 * Beginner-first: nothing in the UI may show a bare abbreviation. Codes stay
 * visible next to the words so experienced users keep their speed.
 *
 * Pure data + pure formatters. No fabrication: every helper returns `null`
 * when the underlying value is missing rather than inventing a description.
 */

export interface CodeMeaning {
  /** stored ledger code — never changes */
  code: string;
  /** short plain-language name */
  plain: string;
  /** one-line beginner explanation */
  help: string;
}

/** At-bat results — `gp_at_bats.result`. */
export const AB_RESULTS: ReadonlyArray<CodeMeaning> = [
  { code: "1B", plain: "Single", help: "You hit the ball and reached first base." },
  { code: "2B", plain: "Double", help: "You hit the ball and reached second base." },
  { code: "3B", plain: "Triple", help: "You hit the ball and reached third base." },
  { code: "HR", plain: "Home run", help: "You hit the ball and scored on the hit." },
  { code: "BB", plain: "Walk", help: "Four balls — you go to first base without swinging your way on." },
  { code: "HBP", plain: "Hit by pitch", help: "The pitch hit you, so you go to first base." },
  { code: "K_swinging", plain: "Strikeout swinging", help: "Third strike, and you swung and missed." },
  { code: "K_looking", plain: "Strikeout looking", help: "Third strike called on you without swinging." },
  { code: "FO", plain: "Fly out", help: "You hit the ball in the air and a fielder caught it." },
  { code: "GO", plain: "Ground out", help: "You hit the ball on the ground and were thrown out at first." },
  { code: "LO", plain: "Line out", help: "You hit a hard line drive straight at a fielder who caught it." },
  { code: "PO", plain: "Pop out", help: "You hit a short, high pop-up that was caught." },
  { code: "FC", plain: "Fielder's choice", help: "You reached base only because the fielder chose to get a different runner out." },
  { code: "SAC", plain: "Sacrifice bunt", help: "You gave yourself up on a bunt to move a runner to the next base." },
  { code: "SF", plain: "Sacrifice fly", help: "You flew out, but a runner scored on the catch." },
  { code: "E", plain: "Error charged", help: "A fielder misplayed the ball; the play is scored as their mistake." },
  { code: "ROE", plain: "Reached on error", help: "You reached base because a fielder made a mistake, not on a clean hit." },
];

/** Contact quality — how well the ball came off your bat. */
export const CONTACT_QUALITY: ReadonlyArray<CodeMeaning> = [
  { code: "barrel", plain: "Barrel — best contact", help: "Hit flush off the sweet spot: hard and in the air." },
  { code: "solid", plain: "Solid — good contact", help: "Hit well, just not perfectly on the sweet spot." },
  { code: "flare", plain: "Flare — soft, lucky", help: "A soft blooper that drops in front of the outfielders." },
  { code: "topped", plain: "Topped — hit the top of the ball", help: "The bat came over the ball, so it rolled on the ground." },
  { code: "weak", plain: "Weak — mishit", help: "Very little force behind it — an easy play for the defense." },
  { code: "popup", plain: "Pop-up — under the ball", help: "The bat got under the ball, so it went straight up." },
  { code: "whiff", plain: "Whiff — swing and miss", help: "You swung and did not touch the ball." },
  { code: "foul", plain: "Foul ball", help: "You made contact but the ball went out of play sideways or back." },
];

/** Where the ball went — positions on the field. */
export const DIRECTIONS: ReadonlyArray<CodeMeaning> = [
  { code: "LF", plain: "Left field", help: "The outfield grass on the left side, past third base." },
  { code: "LCF", plain: "Left-center field", help: "The outfield gap between left field and center field." },
  { code: "CF", plain: "Center field", help: "Straight out over second base, deepest part of the outfield." },
  { code: "RCF", plain: "Right-center field", help: "The outfield gap between center field and right field." },
  { code: "RF", plain: "Right field", help: "The outfield grass on the right side, past first base." },
  { code: "3B", plain: "Third base", help: "The infielder standing near third base, on the left side." },
  { code: "SS", plain: "Shortstop", help: "The infielder between second and third base." },
  { code: "2B", plain: "Second base", help: "The infielder between first and second base." },
  { code: "1B", plain: "First base", help: "The infielder standing near first base." },
  { code: "P", plain: "Pitcher", help: "Straight back to the pitcher in the middle of the infield." },
  { code: "C", plain: "Catcher", help: "Right in front of home plate, fielded by the catcher." },
];

/** Pitch results — `gp_pitches.result`. */
export const PITCH_RESULTS: ReadonlyArray<CodeMeaning> = [
  { code: "ball", plain: "Ball", help: "The pitch missed the strike zone and you did not swing." },
  { code: "called_strike", plain: "Called strike", help: "A strike you did not swing at." },
  { code: "swinging_strike", plain: "Swing and miss", help: "You swung and missed the pitch." },
  { code: "foul", plain: "Foul ball", help: "Contact, but the ball went out of play sideways or back." },
  { code: "in_play", plain: "Put in play", help: "You hit the ball into the field — this pitch ends the at-bat." },
  { code: "hbp", plain: "Hit by pitch", help: "The pitch hit you, so you go to first base." },
  { code: "bunt_foul", plain: "Bunt, foul", help: "You bunted and the ball went foul." },
  { code: "bunt_in_play", plain: "Bunt, in play", help: "You bunted the ball into the field." },
];

function lookup(list: ReadonlyArray<CodeMeaning>, code?: string | null): CodeMeaning | null {
  if (!code) return null;
  return list.find((m) => m.code === code) ?? null;
}

/** "BB — Walk" style label for pickers. Falls back to the raw code. */
export function codeLabel(list: ReadonlyArray<CodeMeaning>, code?: string | null): string {
  const m = lookup(list, code);
  if (!m) return code ?? "—";
  return `${m.code} — ${m.plain}`;
}

export const abResultLabel = (c?: string | null) => codeLabel(AB_RESULTS, c);
export const contactLabel = (c?: string | null) => codeLabel(CONTACT_QUALITY, c);
export const directionLabel = (c?: string | null) => codeLabel(DIRECTIONS, c);
export const pitchResultLabel = (c?: string | null) => codeLabel(PITCH_RESULTS, c);

export const abResultHelp = (c?: string | null) => lookup(AB_RESULTS, c)?.help ?? null;
export const abResultPlain = (c?: string | null) => lookup(AB_RESULTS, c)?.plain ?? null;
export const directionPlain = (c?: string | null) => lookup(DIRECTIONS, c)?.plain ?? null;
export const pitchResultPlain = (c?: string | null) => lookup(PITCH_RESULTS, c)?.plain ?? null;

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
export function ordinalInning(n?: number | null): string | null {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  return ORDINALS[n] ?? `${n}th`;
}

/**
 * Plain sentence describing a saved at-bat, e.g.
 * "3rd inning — Single to left field". Missing pieces are simply omitted:
 * nothing is invented.
 */
export function describeAtBat(row: {
  inning?: number | null;
  result?: string | null;
  exit_direction?: string | null;
}): string {
  const parts: string[] = [];
  const inn = ordinalInning(row.inning);
  if (inn) parts.push(`${inn} inning`);
  const res = abResultPlain(row.result);
  const dir = directionPlain(row.exit_direction);
  if (res && dir) parts.push(`${res} to ${dir.toLowerCase()}`);
  else if (res) parts.push(res);
  else parts.push("at-bat started (no result yet)");
  return parts.join(" — ");
}

/** Plain sentence describing a saved pitch inside an at-bat. */
export function describePitch(row: {
  result?: string | null;
  pitch_type_full?: string | null;
  zone?: number | string | null;
}): string {
  const parts: string[] = [];
  const res = pitchResultPlain(row.result);
  if (res) parts.push(res);
  if (row.pitch_type_full) parts.push(`on a ${row.pitch_type_full.toLowerCase()}`);
  if (row.zone != null) parts.push(`in zone ${row.zone}`);
  return parts.length ? parts.join(" ") : "Pitch recorded";
}

/** Which optional detail fields an at-bat already has filled in. */
export interface DetailField {
  key: string;
  label: string;
}

export const AB_DETAIL_FIELDS: ReadonlyArray<DetailField> = [
  { key: "pitch_type", label: "Pitch type you saw" },
  { key: "pitch_velo", label: "How fast the pitch was" },
  { key: "contact_quality", label: "How well you hit it" },
  { key: "exit_direction", label: "Where the ball went" },
  { key: "runners_on", label: "Runners already on base" },
  { key: "outs", label: "Outs when you came up" },
  { key: "rbi", label: "Runs you drove in" },
  { key: "lob", label: "Runners you left on base" },
  { key: "h1_time_sec", label: "Home-to-first run time" },
  { key: "notes", label: "Your own notes" },
];

export function detailStatus(row: Record<string, any> | null | undefined) {
  const filled: DetailField[] = [];
  const empty: DetailField[] = [];
  for (const f of AB_DETAIL_FIELDS) {
    const v = row?.[f.key];
    const has = v !== null && v !== undefined && v !== "" && !(typeof v === "number" && v === 0);
    (has ? filled : empty).push(f);
  }
  return { filled, empty, total: AB_DETAIL_FIELDS.length };
}
