// _shared/wic/content/programContent.ts — Step 8 content batches (owner approved all 8, 2026-10-07).
// Pure: facts in, rows out. Content fits INSIDE the slot HT already built:
// - never adds or removes a card, never changes slug, sets, reps, load or duration;
// - attaches one labelled option (`why_payload.program_content`) to at most one row per card;
// - an option may never be harder than the row it sits on (hard options only on rows that are
//   already hard-run / high-jump days; easy rows only get easy options);
// - every option carries its own age, growth, phase, pain, equipment, game and start-day rules;
// - weighted / overload balls never appear here (they live only in the Power Primer, which
//   counts every throw in the arm ledger); nothing over 7 oz, ever.
// Batch 3 (windmill) lives in pitching/windmillProgram.ts.

export const PROGRAM_CONTENT_VERSION = "program_content_v1";

export type BatchKey =
  | "content_speed_lab" | "content_heat_factory" | "content_explosive_pitcher"
  | "content_softball_conditioning" | "content_lift_notes" | "content_base_stealer" | "content_barefoot_items";

export const BATCH_KEYS: BatchKey[] = [
  "content_speed_lab", "content_heat_factory", "content_explosive_pitcher",
  "content_softball_conditioning", "content_lift_notes", "content_base_stealer", "content_barefoot_items",
];

type Pain = "arm" | "leg" | "back";
export interface ContentItem {
  slug: string; batch: BatchKey; name: string; cue: string;
  kind: "drill" | "note" | "check";
  slots: string[];              // card slots it may sit on
  hard: boolean;                // max-intent running / jumping
  minAge: number;
  growthOk: boolean;
  phases: string[] | "all";
  painBlocks: Pain[];
  equipment: string[];          // all required; [] = none
  minSpeedSessions?: number;    // Speed Lab: resisted from 7, downhill from 10
  rest?: string;                // shown with the option
  pattern?: RegExp;             // lift notes: which lift pattern it belongs to
}

const OFF = ["os_q1", "os_q2", "os_q3", "os_q4"];
const NOT_POST = [...OFF, "pre_season", "in_season"];
const REST_10YD = "Full rest: 1 minute for every 10 yards.";

export const CONTENT_LIBRARY: ContentItem[] = [
  // ---- Batch 1: Speed Lab ----
  { slug: "sl_wall_drive_switch", batch: "content_speed_lab", name: "Wall drive switches", cue: "Lean into a wall, switch legs fast, punch the ground under your hips.", kind: "drill", slots: ["speed"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: ["leg"], equipment: [] },
  { slug: "sl_a_skip_build", batch: "content_speed_lab", name: "A-skip into build-up", cue: "Tall, quick A-skips for 10 yards, then build to 80% for 10 more.", kind: "drill", slots: ["speed"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: ["leg"], equipment: [] },
  { slug: "sl_falling_start_10", batch: "content_speed_lab", name: "Falling start, 10 yards", cue: "Lean until you have to step, then explode for 10 yards.", kind: "drill", slots: ["speed"], hard: true, minAge: 11, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },
  { slug: "sl_resisted_sprint_band", batch: "content_speed_lab", name: "Band-resisted sprint, 10 yards", cue: "Partner holds the band lightly. Drive the knees, stay low for the first steps.", kind: "drill", slots: ["speed"], hard: true, minAge: 13, growthOk: false, phases: OFF.concat("pre_season"), painBlocks: ["leg", "back"], equipment: ["band"], minSpeedSessions: 6, rest: REST_10YD },
  { slug: "sl_downhill_sprint", batch: "content_speed_lab", name: "Gentle downhill sprint, 20 yards", cue: "Very slight slope only. Stay tall and relaxed, let the legs turn over fast.", kind: "drill", slots: ["speed"], hard: true, minAge: 15, growthOk: false, phases: OFF, painBlocks: ["leg"], equipment: [], minSpeedSessions: 9, rest: REST_10YD },

  // ---- Batch 2: Heat Factory (baseball Complete Pitcher / Golden 2Way) — no weighted balls here ----
  { slug: "hf_towel_drill", batch: "content_heat_factory", name: "Towel drill (dry throws)", cue: "Full delivery holding a towel. Snap it at a target out front. No ball.", kind: "drill", slots: ["ub_primer", "throwing"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: ["arm"], equipment: [] },
  { slug: "hf_rocker_command", batch: "content_heat_factory", name: "Rocker command throws (easy)", cue: "Rock back, rock forward, throw at 60% to a small target. Count each throw.", kind: "drill", slots: ["ub_primer", "throwing"], hard: false, minAge: 9, growthOk: true, phases: NOT_POST, painBlocks: ["arm"], equipment: ["baseball"] },
  { slug: "hf_band_arm_care", batch: "content_heat_factory", name: "Band arm-care circuit", cue: "Pull-aparts, external rotations, Ys. Light band, smooth, never to fatigue.", kind: "drill", slots: ["ub_primer", "throwing"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: [], equipment: ["band"] },
  { slug: "hf_hip_lead_drill", batch: "content_heat_factory", name: "Hip-lead dry drill", cue: "Lift, lead with the front hip toward the target, land and freeze. No ball.", kind: "drill", slots: ["ub_primer", "throwing"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: [], equipment: [] },

  // ---- Batch 4: Explosive-pitcher conditioning ----
  { slug: "ep_max_sprint_10", batch: "content_explosive_pitcher", name: "Max-intent 10-yard sprints", cue: "All-out for 10 yards, walk back. Quality over quantity.", kind: "drill", slots: ["conditioning"], hard: true, minAge: 11, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },
  { slug: "ep_repeat_accel", batch: "content_explosive_pitcher", name: "Repeat accelerations, 15 yards", cue: "Explode for 15 yards, full rest, repeat. Stop if you slow down.", kind: "drill", slots: ["conditioning"], hard: true, minAge: 13, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },
  { slug: "ep_start_day_flush", batch: "content_explosive_pitcher", name: "Start-day flush", cue: "Easy jog, leg swings, deep breathing. Feel looser, not tired.", kind: "drill", slots: ["conditioning"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: [], equipment: [] },
  { slug: "ep_primer_skips", batch: "content_explosive_pitcher", name: "Primer skips and pogo hops", cue: "Light skips and small hops to wake the legs up. Short and snappy.", kind: "drill", slots: ["conditioning"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: ["leg"], equipment: [] },

  // ---- Batch 5: Softball season conditioning (softball base paths: 60 ft) ----
  { slug: "sc_base_to_base", batch: "content_softball_conditioning", name: "Base-to-base acceleration (60 ft)", cue: "Explode out of the box or off the bag for one base, walk back.", kind: "drill", slots: ["conditioning", "speed"], hard: true, minAge: 10, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: "Full rest: about 2 minutes between runs." },
  { slug: "sc_repeat_sprint_short", batch: "content_softball_conditioning", name: "Repeat sprints, 20 yards", cue: "Fast for 20 yards, full walk-back rest. Stop if you slow down.", kind: "drill", slots: ["conditioning"], hard: true, minAge: 12, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },
  { slug: "sc_durability_circuit", batch: "content_softball_conditioning", name: "Durability circuit (easy)", cue: "Walking lunges, side planks, glute bridges. Smooth and controlled.", kind: "drill", slots: ["conditioning"], hard: false, minAge: 10, growthOk: true, phases: "all", painBlocks: [], equipment: [] },
  { slug: "sc_tournament_reset", batch: "content_softball_conditioning", name: "Tournament-weekend reset", cue: "Easy walk, mobility and breathing between games. Stay loose, stay light.", kind: "drill", slots: ["conditioning"], hard: false, minAge: 9, growthOk: true, phases: "all", painBlocks: [], equipment: [] },

  // ---- Batch 6: Lift exercise notes (notes only; HT schemes untouched) ----

  // ---- Batch 7: Base Stealer (5Tool; Golden 2Way on position days) ----
  { slug: "bs_lead_read", batch: "content_base_stealer", name: "Lead and read", cue: "Take your lead, read the pitcher's first move, go on first motion.", kind: "drill", slots: ["speed"], hard: true, minAge: 9, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },
  { slug: "bs_crossover_jump", batch: "content_base_stealer", name: "Crossover jump, 15 yards", cue: "Drop step and cross over in one move, low for the first three steps.", kind: "drill", slots: ["speed"], hard: true, minAge: 10, growthOk: true, phases: NOT_POST, painBlocks: ["leg"], equipment: [], rest: REST_10YD },

  // ---- Batch 8: Barefoot readiness test as library items ----
  { slug: "bf_readiness_check", batch: "content_barefoot_items", name: "Barefoot readiness check", cue: "Do the five guided steps on the Barefoot test screen. Any pain drops you one level.", kind: "check", slots: ["speed"], hard: false, minAge: 0, growthOk: true, phases: "all", painBlocks: [], equipment: [] },
];

export interface ContentRow {
  slot?: string | null; sequence_role?: string | null; movement_slug?: string | null; why_payload?: any;
}

export interface ContentContext {
  planDate: string;
  phase: string;
  sport: "baseball" | "softball";
  modules: readonly string[];
  isPitcher: boolean;
  age: number | null;
  growthMode: boolean;
  pain: Partial<Record<Pain, boolean>>;
  equipment: readonly string[] | null;   // null = unknown → only equipment-free items
  gameToday: boolean;
  gameTomorrow: boolean;
  startToday: boolean; startYesterday: boolean; startTomorrow: boolean;
  speedSessionsBefore: number;           // planned speed days before today
  u13ThrowBlock: boolean;                // under-13 no-throw day
  barefootThisWeek: boolean;             // check already offered this week
  enabled: Partial<Record<BatchKey, boolean>>;
  /** Is this row already a hard-run / high-jump row (from the final check's own rowKinds)? */
  isHardRow: (r: ContentRow) => boolean;
  /** Lift pattern text for a lift row (catalog movement_pattern / category / slug). */
  liftPatternOf: (r: ContentRow) => string;
}

const HITTER5 = /5tool|golden2way/;
const PITCH_MOD = /pitching|golden2way/;

/** Who sees each batch. */
export function batchAudience(b: BatchKey, c: ContentContext): boolean {
  const m = c.modules.join(" ");
  switch (b) {
    case "content_speed_lab": return true;
    case "content_heat_factory": return c.sport === "baseball" && c.isPitcher && /baseball_pitching|^pitching|baseball_golden2way/.test(m.split(" ").find((x) => PITCH_MOD.test(x)) ?? "");
    case "content_explosive_pitcher": return c.isPitcher && PITCH_MOD.test(m) && (!/golden2way/.test(m) || c.startToday || c.startYesterday);
    case "content_softball_conditioning": return c.sport === "softball";
    case "content_lift_notes": return true;
    case "content_base_stealer": return HITTER5.test(m) && (!/golden2way/.test(m) || !(c.startToday || c.startTomorrow));
    case "content_barefoot_items": return true;
  }
}

/** Every safety rule an option must pass for this player today. */
export function itemLegal(it: ContentItem, row: ContentRow, c: ContentContext): string | null {
  const age = c.age;
  if (age == null ? it.minAge > 13 : age < it.minAge) return "min_age";
  if (c.growthMode && !it.growthOk) return "growth_mode";
  if (it.phases !== "all" && !it.phases.includes(c.phase)) return "phase";
  if (it.painBlocks.some((p) => c.pain[p])) return "pain";
  if (it.equipment.length && (c.equipment == null || !it.equipment.every((e) => c.equipment!.includes(e)))) return "equipment";
  if (it.minSpeedSessions != null && c.speedSessionsBefore < it.minSpeedSessions) return "speed_progression";
  if (it.hard && !c.isHardRow(row)) return "harder_than_slot";
  if (it.hard && (c.gameTomorrow || c.gameToday)) return "game_day";
  if (it.batch === "content_heat_factory") {
    if (c.startToday || c.startTomorrow) return "start_day";
    if (c.u13ThrowBlock && it.equipment.includes("baseball")) return "u13_pitch_smart";
  }
  if (it.batch === "content_explosive_pitcher" && it.hard && (c.startToday || c.startYesterday || c.startTomorrow)) return "start_window";
  if (it.batch === "content_explosive_pitcher" && !it.hard && !(c.startToday || c.startYesterday)) return "flush_only_around_starts";
  if (it.batch === "content_softball_conditioning" && it.slug === "sc_tournament_reset" && !(c.gameToday || c.gameTomorrow)) return "tournament_only";
  return null;
}

const hash = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

export interface ContentResult<T> { rows: T[]; applied: { slug: string; batch: BatchKey; slot: string }[] }

export function applyProgramContent<T extends ContentRow>(rows: readonly T[], c: ContentContext): ContentResult<T> {
  const out = rows.map((r) => r);
  const applied: ContentResult<T>["applied"] = [];
  const live = BATCH_KEYS.filter((b) => c.enabled[b] === true && batchAudience(b, c));
  if (!live.length) return { rows: out, applied };
  const usedSlots = new Set<string>();
  const tag = (idx: number, it: ContentItem) => {
    const r = out[idx];
    out[idx] = { ...r, why_payload: { ...(r.why_payload ?? {}), program_content: { version: PROGRAM_CONTENT_VERSION, batch: it.batch, slug: it.slug, kind: it.kind, name: it.name, cue: it.cue, rest: it.rest ?? null } } } as T;
    applied.push({ slug: it.slug, batch: it.batch, slot: String(r.slot ?? "") });
  };

  // Lift notes: one per lift row whose pattern matches, at most 2 per card.
  if (live.includes("content_lift_notes")) {
    let n = 0;
    out.forEach((r, idx) => {
      if (n >= 2 || r.slot !== "lift" || !/compound|main|unilateral/.test(String(r.sequence_role ?? "")) || r.why_payload?.program_content) return;
      const pat = c.liftPatternOf(r).toLowerCase();
      const it = CONTENT_LIBRARY.find((x) => x.batch === "content_lift_notes" && x.pattern!.test(pat) && !itemLegal(x, r, c));
      if (it) { tag(idx, it); n++; }
    });
  }

  // Barefoot check: first speed row, once a week.
  if (live.includes("content_barefoot_items") && !c.barefootThisWeek) {
    const idx = out.findIndex((r) => r.slot === "speed" && !r.why_payload?.program_content);
    const it = CONTENT_LIBRARY.find((x) => x.slug === "bf_readiness_check")!;
    if (idx >= 0 && !itemLegal(it, out[idx], c)) { tag(idx, it); usedSlots.add("speed"); }
  }

  // Drill options: one per card slot, day-rotated, first legal row.
  for (const slot of ["speed", "conditioning", "ub_primer", "throwing"]) {
    if (usedSlots.has(slot)) continue;
    const pool = CONTENT_LIBRARY.filter((x) => x.kind === "drill" && live.includes(x.batch) && x.slots.includes(slot));
    if (!pool.length) continue;
    const start = hash(`${c.planDate}:${slot}`) % pool.length;
    const order = pool.slice(start).concat(pool.slice(0, start));
    done: for (let idx = 0; idx < out.length; idx++) {
      const r = out[idx];
      if (r.slot !== slot || r.why_payload?.program_content) continue;
      for (const it of order) if (!itemLegal(it, r, c)) { tag(idx, it); usedSlots.add(slot); break done; }
    }
  }
  return { rows: out, applied };
}

// ---- Ball-weight law (owner final 2026-10-07): 4 oz no age limit; 6–7 oz 16+; weighted/overload never under 16; nothing over 7 oz. ----
export const MAX_BALL_OZ = 7;
export const OVERLOAD_MIN_AGE = 16;
/** Ounces named in a slug (e.g. "throw_6oz"), or null. */
export function ozFromSlug(slug: string): number | null {
  const m = /(\d+(?:\.\d+)?)_?oz/i.exec(slug);
  return m ? Number(m[1]) : null;
}
