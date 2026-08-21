/**
 * ingestParsers — deterministic CSV → gp_* ledger mapping.
 *
 * Supported exports (auto-detected from the header row):
 *  - Trackman  (pitch-level: RelSpeed, TaggedPitchType, PlateLocSide/Height…)
 *  - Rapsodo   (pitch-level: "Velocity", "Pitch Type", "Spin Rate"…)
 *  - HitTrax   (batted-ball level: "Velo", "LA", "Type", "Res"…)
 *  - GameChanger (play-by-play export: "Inning", "Batter", "Result"…)
 *
 * No AI, no network: parsing is pure and replayable, so a re-import of the
 * same file always produces the same ledger rows. Everything lands in a
 * review buffer first — nothing is written to the ledger until the athlete
 * presses Commit.
 */

export type IngestSource =
  | "trackman"
  | "rapsodo"
  | "hittrax"
  | "gamechanger"
  | "manual_paste"
  | "other";

export interface ParsedPitch {
  kind: "pitch";
  inning: number | null;
  pitch_no: number | null;
  pitch_type: string | null;
  pitch_velo: number | null;
  result: string | null;
  location: { zone: number | null; outZone: string | null } | null;
  pitch_movement: Record<string, number> | null;
  pitcher_throws: string | null;
  batter_handedness: string | null;
  count_balls: number | null;
  count_strikes: number | null;
  opponent_hitter_name: string | null;
}

export interface ParsedAtBat {
  kind: "at_bat";
  inning: number | null;
  result: string | null;
  exit_velo: number | null;
  launch_angle: number | null;
  exit_direction: string | null;
  contact_quality: string | null;
  pitch_type: string | null;
  pitch_velo: number | null;
  notes: string | null;
}

export type ParsedRow = ParsedPitch | ParsedAtBat;

export interface ParseResult {
  source: IngestSource;
  /** true when the header row was recognised for a known vendor */
  recognized: boolean;
  rows: ParsedRow[];
  /** rows the parser saw but could not map (kept for the review UI) */
  skipped: number;
  warnings: string[];
  headers: string[];
}

/* ------------------------------------------------------------------ CSV */

/** RFC4180-ish CSV splitter: handles quotes, embedded commas and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      /* skip */
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function indexHeaders(headers: string[]) {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const k = norm(h);
    if (k && !map.has(k)) map.set(k, i);
  });
  return map;
}

function pick(map: Map<string, number>, row: string[], ...names: string[]): string | null {
  for (const n of names) {
    const i = map.get(norm(n));
    if (i != null) {
      const v = (row[i] ?? "").trim();
      if (v !== "" && v.toLowerCase() !== "null" && v.toLowerCase() !== "na") return v;
    }
  }
  return null;
}

const toNum = (v: string | null): number | null => {
  if (v == null) return null;
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toInt = (v: string | null): number | null => {
  const n = toNum(v);
  return n == null ? null : Math.round(n);
};

/* -------------------------------------------------------- vocab mapping */

/** Vendor pitch-type strings → Hammers pitch codes. */
export function mapPitchType(raw: string | null): string | null {
  if (!raw) return null;
  const k = norm(raw);
  const table: Record<string, string> = {
    fastball: "FB",
    fourseamfastball: "FB",
    fourseamfastball4: "FB",
    fourseam: "FB",
    ff: "FB",
    twoseamfastball: "SI",
    twoseam: "SI",
    sinker: "SI",
    ft: "SI",
    si: "SI",
    cutter: "CT",
    fc: "CT",
    slider: "SL",
    sl: "SL",
    sweeper: "SW",
    slurve: "SL",
    curveball: "CB",
    curve: "CB",
    cu: "CB",
    knucklecurve: "CB",
    changeup: "CH",
    change: "CH",
    ch: "CH",
    splitter: "SP",
    split: "SP",
    fs: "SP",
    screwball: "SC",
    knuckleball: "KN",
    riseball: "RI",
    rise: "RI",
    dropball: "DR",
    drop: "DR",
    dropcurve: "DC",
    screw: "SC",
    peeldrop: "DR",
  };
  return table[k] ?? raw.trim().slice(0, 12).toUpperCase();
}

/** Vendor pitch-call strings → ledger result codes. */
export function mapPitchResult(raw: string | null): string | null {
  if (!raw) return null;
  const k = norm(raw);
  const table: Record<string, string> = {
    ballcalled: "ball",
    ball: "ball",
    ballinDirt: "ball",
    strikecalled: "called_strike",
    calledstrike: "called_strike",
    strikeswinging: "swinging_strike",
    swingingstrike: "swinging_strike",
    strikeswingingblocked: "swinging_strike",
    foulball: "foul",
    foul: "foul",
    foulballnotfieldable: "foul",
    inplay: "in_play",
    hitbypitch: "hbp",
    hbp: "hbp",
  };
  return table[k] ?? null;
}

export function mapHand(raw: string | null): string | null {
  if (!raw) return null;
  const k = norm(raw);
  if (k.startsWith("r")) return "R";
  if (k.startsWith("l")) return "L";
  if (k.startsWith("s") || k.startsWith("b")) return "S";
  return null;
}

/**
 * Trackman plate location (feet) → 9-zone id + out-of-zone band.
 * Strike zone: |side| <= 0.83 ft, height 1.5–3.5 ft (catcher's view).
 */
export function locationToZone(
  side: number | null,
  height: number | null,
): { zone: number | null; outZone: string | null } | null {
  if (side == null || height == null) return null;
  const inSide = Math.abs(side) <= 0.83;
  const inHeight = height >= 1.5 && height <= 3.5;
  if (!inSide || !inHeight) {
    if (!inHeight) return { zone: null, outZone: height > 3.5 ? "UP" : "DN" };
    return { zone: null, outZone: side < 0 ? "IN" : "OUT" };
  }
  const col = side < -0.277 ? 0 : side <= 0.277 ? 1 : 2; // catcher's view left→right
  const rowIdx = height > 2.833 ? 0 : height >= 2.167 ? 1 : 2; // high→low
  return { zone: rowIdx * 3 + col + 1, outZone: null };
}

/** Batted-ball contact quality from exit velo + launch angle. */
export function contactQuality(ev: number | null, la: number | null): string | null {
  if (ev == null) return null;
  if (ev >= 95 && la != null && la >= 8 && la <= 32) return "barrel";
  if (ev >= 90) return "solid";
  if (ev >= 75) return la != null && la > 45 ? "popup" : "flare";
  return la != null && la < 5 ? "topped" : "weak";
}

/* ------------------------------------------------------------ detection */

export function detectSource(headers: string[]): IngestSource {
  const k = new Set(headers.map(norm));
  if (k.has("taggedpitchtype") || (k.has("relspeed") && k.has("platelocheight"))) return "trackman";
  if ((k.has("pitchtype") || k.has("type")) && (k.has("spinrate") || k.has("totalspin")) && (k.has("velocity") || k.has("speed")))
    return "rapsodo";
  if (k.has("exitvelocity") || (k.has("velo") && k.has("la")) || k.has("distance") && k.has("la"))
    return "hittrax";
  if (k.has("inning") && (k.has("batter") || k.has("play")) && (k.has("result") || k.has("event")))
    return "gamechanger";
  return "other";
}

/* -------------------------------------------------------------- parsers */

function parseTrackman(headers: string[], body: string[][]): ParseResult {
  const map = indexHeaders(headers);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const pitchType = mapPitchType(pick(map, r, "TaggedPitchType", "AutoPitchType", "PitchType"));
    const velo = toNum(pick(map, r, "RelSpeed", "PitchVelo", "Velocity"));
    if (!pitchType && velo == null) {
      skipped++;
      continue;
    }
    const hb = toNum(pick(map, r, "HorzBreak"));
    const ivb = toNum(pick(map, r, "InducedVertBreak", "VertBreak"));
    const spin = toNum(pick(map, r, "SpinRate"));
    const movement: Record<string, number> = {};
    if (hb != null) movement.horz_break_in = Math.round(hb * 10) / 10;
    if (ivb != null) movement.induced_vert_break_in = Math.round(ivb * 10) / 10;
    if (spin != null) movement.spin_rpm = Math.round(spin);
    rows.push({
      kind: "pitch",
      inning: toInt(pick(map, r, "Inning")),
      pitch_no: toInt(pick(map, r, "PitchofPA", "PitchNo")),
      pitch_type: pitchType,
      pitch_velo: velo == null ? null : Math.round(velo * 10) / 10,
      result: mapPitchResult(pick(map, r, "PitchCall")),
      location: locationToZone(
        toNum(pick(map, r, "PlateLocSide")),
        toNum(pick(map, r, "PlateLocHeight")),
      ),
      pitch_movement: Object.keys(movement).length ? movement : null,
      pitcher_throws: mapHand(pick(map, r, "PitcherThrows")),
      batter_handedness: mapHand(pick(map, r, "BatterSide")),
      count_balls: toInt(pick(map, r, "Balls")),
      count_strikes: toInt(pick(map, r, "Strikes")),
      opponent_hitter_name: pick(map, r, "Batter"),
    });
  }
  return { source: "trackman", recognized: true, rows, skipped, warnings: [], headers };
}

function parseRapsodo(headers: string[], body: string[][]): ParseResult {
  const map = indexHeaders(headers);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const pitchType = mapPitchType(pick(map, r, "Pitch Type", "PitchType", "Type"));
    const velo = toNum(pick(map, r, "Velocity", "Speed", "Velo"));
    if (!pitchType && velo == null) {
      skipped++;
      continue;
    }
    const spin = toNum(pick(map, r, "Spin Rate", "SpinRate", "Total Spin"));
    const hb = toNum(pick(map, r, "HB (trajectory)", "Horizontal Break", "HB"));
    const vb = toNum(pick(map, r, "VB (trajectory)", "Vertical Break", "VB"));
    const movement: Record<string, number> = {};
    if (spin != null) movement.spin_rpm = Math.round(spin);
    if (hb != null) movement.horz_break_in = Math.round(hb * 10) / 10;
    if (vb != null) movement.induced_vert_break_in = Math.round(vb * 10) / 10;
    rows.push({
      kind: "pitch",
      inning: toInt(pick(map, r, "Inning")),
      pitch_no: toInt(pick(map, r, "No", "Pitch")),
      pitch_type: pitchType,
      pitch_velo: velo == null ? null : Math.round(velo * 10) / 10,
      result: mapPitchResult(pick(map, r, "Result", "Pitch Call")),
      location: locationToZone(
        toNum(pick(map, r, "Strike Zone Side", "PlateLocSide")),
        toNum(pick(map, r, "Strike Zone Height", "PlateLocHeight")),
      ),
      pitch_movement: Object.keys(movement).length ? movement : null,
      pitcher_throws: mapHand(pick(map, r, "Pitcher Handedness", "Throws")),
      batter_handedness: mapHand(pick(map, r, "Batter Handedness", "Bats")),
      count_balls: toInt(pick(map, r, "Balls")),
      count_strikes: toInt(pick(map, r, "Strikes")),
      opponent_hitter_name: pick(map, r, "Batter", "Hitter"),
    });
  }
  return { source: "rapsodo", recognized: true, rows, skipped, warnings: [], headers };
}

function parseHitTrax(headers: string[], body: string[][]): ParseResult {
  const map = indexHeaders(headers);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const ev = toNum(pick(map, r, "Velo", "Exit Velocity", "ExitVelocity", "EV"));
    const la = toNum(pick(map, r, "LA", "Launch Angle", "LaunchAngle"));
    if (ev == null && la == null) {
      skipped++;
      continue;
    }
    const dir = toNum(pick(map, r, "Dir", "Direction"));
    rows.push({
      kind: "at_bat",
      inning: toInt(pick(map, r, "Inning")),
      result: pick(map, r, "Res", "Result", "Type"),
      exit_velo: ev == null ? null : Math.round(ev * 10) / 10,
      launch_angle: la == null ? null : Math.round(la * 10) / 10,
      exit_direction:
        dir == null ? null : dir < -12 ? "LF" : dir < -4 ? "LCF" : dir <= 4 ? "CF" : dir <= 12 ? "RCF" : "RF",
      contact_quality: contactQuality(ev, la),
      pitch_type: mapPitchType(pick(map, r, "Pitch", "Pitch Type")),
      pitch_velo: toNum(pick(map, r, "Pitch Velo", "PitchVelo")),
      notes: pick(map, r, "Notes"),
    });
  }
  return { source: "hittrax", recognized: true, rows, skipped, warnings: [], headers };
}

function parseGameChanger(headers: string[], body: string[][]): ParseResult {
  const map = indexHeaders(headers);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const r of body) {
    const result = pick(map, r, "Result", "Event", "Play");
    if (!result) {
      skipped++;
      continue;
    }
    rows.push({
      kind: "at_bat",
      inning: toInt(pick(map, r, "Inning", "Inn")),
      result,
      exit_velo: toNum(pick(map, r, "Exit Velocity", "EV")),
      launch_angle: toNum(pick(map, r, "Launch Angle", "LA")),
      exit_direction: pick(map, r, "Hit Location", "Direction"),
      contact_quality: null,
      pitch_type: mapPitchType(pick(map, r, "Pitch Type")),
      pitch_velo: toNum(pick(map, r, "Pitch Velocity")),
      notes: pick(map, r, "Description", "Batter"),
    });
  }
  return { source: "gamechanger", recognized: true, rows, skipped, warnings: [], headers };
}

/** Parse raw CSV/TSV text into review-ready ledger rows. */
export function parseIngestText(text: string, forced?: IngestSource): ParseResult {
  const normalized = text.includes("\t") && !text.includes(",")
    ? text.replace(/\t/g, ",")
    : text;
  const grid = parseCsv(normalized);
  if (grid.length < 2) {
    return {
      source: forced ?? "other",
      recognized: false,
      rows: [],
      skipped: 0,
      warnings: ["The file needs a header row and at least one data row."],
      headers: grid[0] ?? [],
    };
  }
  const [headers, ...body] = grid;
  const source = forced && forced !== "other" ? forced : detectSource(headers);
  switch (source) {
    case "trackman":
      return parseTrackman(headers, body);
    case "rapsodo":
      return parseRapsodo(headers, body);
    case "hittrax":
      return parseHitTrax(headers, body);
    case "gamechanger":
      return parseGameChanger(headers, body);
    default:
      return {
        source: "other",
        recognized: false,
        rows: [],
        skipped: body.length,
        warnings: [
          "Couldn't recognise this export. Pick the source manually, or check that the header row is the first line.",
        ],
        headers,
      };
  }
}

export const SOURCE_LABELS: Record<IngestSource, string> = {
  trackman: "Trackman",
  rapsodo: "Rapsodo",
  hittrax: "HitTrax",
  gamechanger: "GameChanger",
  manual_paste: "Pasted data",
  other: "Unknown",
};
