/**
 * Canonical measure type for every exercise in the library.
 *
 * Round 3 item D: every exercise resolves to exactly one measure type, and the
 * entry fields in the log must match it. The build-failing check lives in
 * measureType.test.ts — any library slug that does not resolve fails the suite.
 *
 * Rules (owner-stated):
 * - Broad Jump logs DISTANCE (ft + in), never seconds or plain reps.
 * - Vertical-style jumps log HEIGHT (in).
 * - Dry throws are logged as REPS (a throw count), never seconds.
 * - Sprints log ss.hh time at a fixed distance.
 * - Holds/planks log seconds; longer efforts log duration.
 * - Lifts log weight × reps; band/body-weight work logs reps only.
 * - Velo work logs mph; bat speed / exit velocity log mph; tee/toss work logs swing count.
 * - Hydrate / soreness-note style tasks are check-offs.
 */

export type MeasureType =
  | "weight_reps" // weight × reps (barbell / dumbbell / kettlebell / sled / med-ball load)
  | "reps" // reps only (body weight, bands, dry throws, jumps by count)
  | "hold_seconds" // static holds, planks, iso
  | "duration" // mm:ss / h:mm:ss efforts (mobility flows, recovery, conditioning by time)
  | "sprint_time" // ss.hh at a fixed distance
  | "jump_distance" // ft + in (broad jump, standing long jump)
  | "jump_height" // in (vertical jump)
  | "throws" // throw count by type (feeds the arm ledger)
  | "velocity" // mph (throw / pitch velocity)
  | "bat_speed" // mph
  | "exit_velocity" // mph
  | "swing_count" // number of swings (tee, front toss, dry swings)
  | "checkoff"; // done / not done (hydrate, soreness note, …)

export type MeasureInput = {
  slug: string;
  name?: string | null;
  slot?: string | null;
  dosage_unit?: string | null;
  distance_feet?: number | null;
  duration_seconds?: number | null;
  total_reps?: number | null;
};

const norm = (s: string) => s.toLowerCase().replace(/[_-]+/g, " ");

/** Dry throws and every arm-ledger throw type log a throw count (reps), never seconds. */
const THROW_RE =
  /\bthrow|throws|throwing|pitch|bullpen|catch play|long toss|plyo ?ball|pulldown|crow hop|rocker|step behind|roll[- ]in|walk[- ]in|pickoff|flat ?ground/;

const JUMP_DISTANCE_RE = /\bbroad jump\b|\bstanding long jump\b|\bstanding broad\b/;
const JUMP_HEIGHT_RE = /\bvertical jump\b|\bvert jump\b|\bcountermovement jump\b|\bcmj\b/;
const JUMP_COUNT_RE = /\bjump|bound|hop|pogo|plyo|skip|hurdle hop|depth jump|box jump|tuck jump/;

const SPRINT_RE =
  /\bsprint|dash|\b\d{1,3}\s?(yd|yard|m|meter|ft|foot)\b|60 ?yd|40 ?yd|30 ?yd|10 ?yd|home to first|home-to-first|steal|base run|baserun|shuttle|pro ?agility|5-10-5|300 ?yd/;

const HOLD_RE = /\bhold|plank|iso(lometric)?\b|wall sit|dead hang|hollow|l[- ]?sit|side bridge|pallof/;

const DURATION_RE =
  /\bmobility|flow|stretch|foam roll|breath|meditat|walk|jog|bike|row erg|recovery|flush|cool ?down|warm ?up circuit|yoga|soft tissue|massage/;

const VELOCITY_RE = /\bvelo\b|velocity|radar|mph/;
const BAT_SPEED_RE = /bat speed/;
const EXIT_VELO_RE = /exit velo|exit velocity|\bev\b/;
const SWING_RE = /\bswing|tee work|front toss|soft toss|bp\b|batting practice|dry hack|hitting/;

const CHECKOFF_RE = /\bhydrate|hydration|soreness|sleep|journal|note|check[- ]?in|survey|plan tomorrow|pack bag|vault/;

const NO_WEIGHT_RE =
  /\bband|banded|bodyweight|body weight|push[- ]?up|pull[- ]?up|chin[- ]?up|bird[- ]?dog|dead[- ]?bug|arm[- ]care|plank|stretch|mobility/;

/**
 * Resolve the measure type. Slot/dosage hints win over slug patterns; slug
 * patterns alone must resolve every library exercise (the test proves it).
 */
export function measureTypeFor(input: MeasureInput): MeasureType {
  const slug = norm(input.slug);
  const text = norm(`${input.slug} ${input.name ?? ""}`);
  const unit = (input.dosage_unit ?? "").toLowerCase();
  const slot = (input.slot ?? "").toLowerCase();

  // Explicit dosage units win.
  if (unit === "throws" || unit === "pitches") return "throws";
  if (unit === "seconds" && HOLD_RE.test(text)) return "hold_seconds";
  if (unit === "seconds" || unit === "minutes") return "duration";

  // Check-offs and self-report tasks.
  if (CHECKOFF_RE.test(text)) return "checkoff";

  // Arm work: throws by type (dry throws included — logged as a count).
  if (THROW_RE.test(text)) return "throws";

  // Measured velocities.
  if (BAT_SPEED_RE.test(text)) return "bat_speed";
  if (EXIT_VELO_RE.test(text)) return "exit_velocity";
  if (VELOCITY_RE.test(text)) return "velocity";

  // Swings by count.
  if (SWING_RE.test(text)) return "swing_count";

  // Jumps: distance or height when that is the measured quality, else counted reps.
  if (JUMP_DISTANCE_RE.test(text)) return "jump_distance";
  if (JUMP_HEIGHT_RE.test(text)) return "jump_height";
  if (JUMP_COUNT_RE.test(text)) return "reps";

  // Sprints: ss.hh at a fixed distance.
  if (slot === "speed" || SPRINT_RE.test(text)) return "sprint_time";

  // Holds and longer efforts.
  if (HOLD_RE.test(text)) return "hold_seconds";
  if (DURATION_RE.test(text)) return "duration";

  // Lifts.
  if (slot === "lift" || slot === "supplemental") {
    return NO_WEIGHT_RE.test(text) ? "reps" : "weight_reps";
  }

  // Everything else is counted work.
  return "reps";
}

/** Entry fields for a measure type — the log grid must render exactly these. */
export type MeasureField = { key: string; label: string; unit?: string };

export function fieldsForMeasure(type: MeasureType): MeasureField[] {
  switch (type) {
    case "weight_reps":
      return [
        { key: "reps", label: "Reps" },
        { key: "weight", label: "Weight", unit: "lb" },
      ];
    case "reps":
      return [{ key: "reps", label: "Reps" }];
    case "hold_seconds":
      return [{ key: "time", label: "Seconds", unit: "s" }];
    case "duration":
      return [{ key: "time", label: "Time", unit: "mm:ss" }];
    case "sprint_time":
      return [
        { key: "distance", label: "Distance", unit: "ft" },
        { key: "time", label: "Time", unit: "ss.hh" },
      ];
    case "jump_distance":
      return [{ key: "distance", label: "Jump distance", unit: "ft + in" }];
    case "jump_height":
      return [{ key: "height", label: "Jump height", unit: "in" }];
    case "throws":
      return [{ key: "throws", label: "Throws" }];
    case "velocity":
      return [{ key: "velocity", label: "Velocity", unit: "mph" }];
    case "bat_speed":
      return [{ key: "bat_speed", label: "Bat speed", unit: "mph" }];
    case "exit_velocity":
      return [{ key: "exit_velo", label: "Exit velocity", unit: "mph" }];
    case "swing_count":
      return [{ key: "swings", label: "Swings" }];
    case "checkoff":
      return [{ key: "done", label: "Done" }];
  }
}
