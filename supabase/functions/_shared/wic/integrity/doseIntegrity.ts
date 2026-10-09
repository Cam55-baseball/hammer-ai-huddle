/**
 * Prescription double-check (owner round 2, 2026-10-09).
 *
 * One pure module used in two places:
 *   - wk-generate-daily, right before a plan is saved
 *   - the app, every time a card's text is shown
 * It checks the numbers, units, text-vs-dose agreement, sets/reps presence,
 * equipment direction and one-action-per-rep, repairs what it can, and returns
 * every catch so it can be logged for the owner. It never adds work.
 */

export interface IntegrityRow {
  movement_slug?: string | null;
  movement_name?: string | null;
  slot?: string | null;
  sets?: number | null;
  reps?: number | null;
  distance_feet?: number | null;
  duration_seconds?: number | null;
  total_reps?: number | null;
  dosage_unit?: string | null;
  why_payload?: Record<string, unknown> | null;
}

export interface IntegrityCatch {
  rule:
    | "nonpositive_number"
    | "distance_vs_name"
    | "missing_sets"
    | "text_distance_mismatch"
    | "text_time_mismatch"
    | "bad_plural"
    | "missing_direction"
    | "mixed_actions";
  field: string;
  detail: string;
}

const UNIT_FT: Record<string, number> = {
  ft: 1, foot: 1, feet: 1, "'": 1,
  y: 3, yd: 3, yds: 3, yard: 3, yards: 3,
  m: 3.28084, meter: 3.28084, meters: 3.28084, metre: 3.28084, metres: 3.28084,
};

// "10 yards", "15-20y", "60 ft", "30-yard", "20 m". Hyphenated ranges count.
const DIST_RE = /\b(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*-?\s*(feet|foot|ft|yards|yard|yds|yd|y|meters|metres|meter|metre|m)\b/gi;
const TIME_RE = /\b(\d+)\s*(?:-\s*)?(seconds|second|secs|sec|s)\b/gi;

function plural(n: number, one: string, many: string) { return `${n} ${n === 1 ? one : many}`; }

/** Say a prescribed distance in the unit the text used, if it divides cleanly; else feet. */
function sayDistance(feet: number, unit: string): string {
  const u = unit.toLowerCase();
  if (UNIT_FT[u] === 3 && feet % 3 === 0) return plural(feet / 3, "yard", "yards");
  return plural(feet, "foot", "feet");
}

/** A distance that describes spacing, a lead or a size — not how far the rep goes. */
function isSpacing(all: string, at: number, len: number): boolean {
  const around = all.slice(Math.max(0, at - 24), at + len + 24).toLowerCase();
  return /apart|spacing|spaced|\blead\b|off the bag|between|wide|tall|high|away from|from the (wall|bag|plate)|radius|square|box/.test(around);
}

/** Repair any distance/time numbers in `text` that disagree with the dose. */
export function repairDoseText(text: string, row: IntegrityRow, field = "text", catches: IntegrityCatch[] = []): string {
  if (!text) return text;
  let out = text;
  const feet = row.distance_feet && row.distance_feet > 0 ? row.distance_feet : null;
  if (feet) {
    out = out.replace(DIST_RE, (m, a, b, unit, at: number, all: string) => {
      if (isSpacing(all, at, m.length)) return m;
      const mult = UNIT_FT[String(unit).toLowerCase()];
      if (!mult) return m;
      const lo = Number(a) * mult, hi = (b ? Number(b) : Number(a)) * mult;
      if (feet >= lo - 0.5 && feet <= hi + 0.5 && !b) return m;
      catches.push({ rule: "text_distance_mismatch", field, detail: `"${m}" vs prescribed ${feet} ft` });
      return sayDistance(feet, String(unit));
    });
  } else if (row.slot === "speed" || row.slot === "conditioning") {
    // No distance prescribed: never let text invent one.
    out = out.replace(DIST_RE, (m, _a, _b, _u, at: number, all: string) => {
      if (isSpacing(all, at, m.length)) return m;
      catches.push({ rule: "text_distance_mismatch", field, detail: `"${m}" with no prescribed distance` });
      return "the prescribed distance";
    });
  }
  const secs = row.duration_seconds && row.duration_seconds > 0 ? row.duration_seconds : null;
  if (secs && String(row.dosage_unit ?? "").toLowerCase() === "seconds") {
    out = out.replace(TIME_RE, (m, a) => {
      if (Number(a) === secs) return m;
      if (/rest/i.test(out.slice(Math.max(0, out.indexOf(m) - 12), out.indexOf(m)))) return m; // rest times are not the work dose
      catches.push({ rule: "text_time_mismatch", field, detail: `"${m}" vs prescribed ${secs} s` });
      return plural(secs, "second", "seconds");
    });
  }
  const fixed = out.replace(/\b1 feet\b/g, "1 foot").replace(/\b([02-9]|\d{2,}) foot\b(?! per)/g, "$1 feet")
    .replace(/\b1 yards\b/g, "1 yard").replace(/\b1 seconds\b/g, "1 second").replace(/\b1 reps\b/g, "1 rep").replace(/\b1 sets\b/g, "1 set");
  if (fixed !== out) catches.push({ rule: "bad_plural", field, detail: "unit plural corrected" });
  return fixed;
}

const MIXED_ACTION_RE = /comebacker[^.]*\b(and|then|,|\+)\s*(cover|back(?:ing)? up)\b/i;
const MIXED_FIX = "One play per rep: on odd reps field a comebacker and throw to first; on even reps cover first on a ground ball to the right side.";

/** Repair a free-text instruction: dose numbers, plurals, one action per rep. */
export function repairInstruction(text: string | null | undefined, row: IntegrityRow, field: string, catches: IntegrityCatch[] = []): string | null {
  if (text == null) return null;
  let t = repairDoseText(String(text), row, field, catches);
  if (MIXED_ACTION_RE.test(t)) {
    catches.push({ rule: "mixed_actions", field, detail: t.slice(0, 120) });
    t = MIXED_FIX;
  }
  return t;
}

/** Distance written in an activity's name or slug, in feet (one only). */
export function nameDistanceFeet(text: string): number | null {
  const hits = [...text.matchAll(/\b(\d{2,3})[-_ ]?(foot|feet|ft|yard|yards|yd|y)\b/gi)];
  const vals = [...new Set(hits.map((h) => Number(h[1]) * (UNIT_FT[h[2].toLowerCase()] ?? 1)))];
  // Ambiguous names ("Fly 20 (30y build)", "Hill 30-40y") are never auto-fixed.
  const name = text.split(" ")[0] === text ? text : text;
  const numbers = (name.replace(/\b\d+\s*%/g, "").match(/\d+/g) ?? []);
  const distinct = new Set(numbers);
  return vals.length === 1 && hits.length >= 1 && distinct.size <= 1 + (distinct.has(String(hits[0][1])) ? 0 : 1) && distinct.size === 1 ? vals[0] : null;
}

/** Full check of one prescription row. Returns a repaired copy + catches. */
export function checkPrescription<T extends IntegrityRow>(row: T): { row: T; catches: IntegrityCatch[] } {
  const catches: IntegrityCatch[] = [];
  const r: any = { ...row };
  for (const k of ["sets", "reps", "distance_feet", "duration_seconds", "total_reps"] as const) {
    if (r[k] != null && !(Number(r[k]) > 0)) {
      catches.push({ rule: "nonpositive_number", field: k, detail: `${k}=${r[k]}` });
      r[k] = null;
    }
  }
  // The activity's own name states its distance ("Repeated 90-Foot Sprints"):
  // the saved distance must match it (live bug: 90-ft sprints saved as 1 ft).
  const named = nameDistanceFeet(`${r.movement_name ?? ""} ${r.movement_slug ?? ""}`);
  if (named && r.distance_feet !== named && /feet|yards/.test(String(r.dosage_unit ?? "feet").toLowerCase())) {
    catches.push({ rule: "distance_vs_name", field: "distance_feet", detail: `${r.distance_feet} → ${named} ft` });
    r.distance_feet = named;
  }
  if (r.reps && !r.sets && (r.slot === "lift" || r.slot === "supplemental" || r.slot === "speed")) {
    catches.push({ rule: "missing_sets", field: "sets", detail: "reps without sets → 1 set" });
    r.sets = 1;
  }
  const name = `${r.movement_name ?? ""} ${r.movement_slug ?? ""}`.toLowerCase();
  if (r.why_payload && typeof r.why_payload === "object") {
    const wp: any = { ...r.why_payload };
    for (const f of ["cue", "setup", "why", "description"]) {
      if (typeof wp[f] === "string") wp[f] = repairInstruction(wp[f], r, `why_payload.${f}`, catches);
    }
    if (/\bsled\b/.test(name) && !/push|pull|drag|march|press|row|punch|catch|sprint/.test(name + " " + String(wp.cue ?? ""))) {
      catches.push({ rule: "missing_direction", field: "why_payload.cue", detail: "sled without push or pull" });
    }
    r.why_payload = wp;
  }
  if (MIXED_ACTION_RE.test(String(r.movement_name ?? ""))) {
    catches.push({ rule: "mixed_actions", field: "movement_name", detail: String(r.movement_name) });
  }
  return { row: r as T, catches };
}
