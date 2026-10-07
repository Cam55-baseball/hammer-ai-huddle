// Power Primer (PAP) block — owner approved 2026-10-07.
// Pure. Builds ONE primer block for a lift card: primer set → rest → max-intent
// action, repeated until the stop rule or the cap; then the lift ALWAYS continues.
// The primer uses the lift's OWN first sets when that fits, so HT's sets, reps
// and % never change. Never a dose change, never a new card, never a hard-run day.
export const PAP_VERSION = "pap_v1";

export type PapTarget = "throw" | "bat_speed" | "first_step" | "jump";
export type PapRole = "pitcher" | "windmill" | "two_way" | "hitter" | "position" | "catcher";
export type LiftPattern = "hinge" | "squat" | "lunge" | "pull" | "press" | "other";
export type PainArea = "arm" | "leg" | "back";

export interface LibraryItem {
  slug: string;
  name: string;
  use: "primer" | "action";
  targets: PapTarget[];
  heavy: boolean;            // heavy lifting primer (under-16 / growth: never)
  minAge: number;
  growthOk: boolean;
  painBlocks: PainArea[];
  equipment: string[];       // any one of these; [] = bodyweight
  /** Throwing implement weight, ounces (balls) — never over 7, never under 4. */
  oz?: number;
  /** Med-ball weight, pounds. */
  lb?: number;
  /** Pitch-equivalents per rep (PAP max throw 1.5, med ball 0). */
  countWeight: number;
  realThrow?: boolean;
  constrainedOnly?: boolean; // 6–7 oz: constrained positions only
  isPress?: boolean;
  isHinge?: boolean;
  isSprint?: boolean;
  isSwing?: boolean;
  cue: string;
}

const P = (x: Omit<LibraryItem, "use" | "countWeight"> & { countWeight?: number }): LibraryItem => ({ use: "primer", countWeight: 0, ...x });
const A = (x: Omit<LibraryItem, "use">): LibraryItem => ({ use: "action", ...x });

/** Tagged library by target, safety and age. Examples, not limits — extend freely. */
export const PAP_LIBRARY: readonly LibraryItem[] = [
  // ---- primers: heavy (16+, no growth mode) ----
  P({ slug: "pap_p_trap_bar_heavy", name: "Trap bar deadlift (heavy, 1–3 reps)", targets: ["throw", "bat_speed", "first_step", "jump"], heavy: true, minAge: 16, growthOk: false, painBlocks: ["back", "leg"], equipment: ["trap_bar"], isHinge: true, cue: "Push the floor away hard. Stop 2–3 reps short of failure." }),
  P({ slug: "pap_p_pullup_heavy", name: "Weighted pull-up (1–3 reps)", targets: ["throw", "bat_speed"], heavy: true, minAge: 16, growthOk: false, painBlocks: ["arm"], equipment: ["pullup_bar"], cue: "Chest to the bar, smooth down. Never to failure." }),
  P({ slug: "pap_p_bss_heavy", name: "Rear-foot elevated split squat (heavy, 1–3 each leg)", targets: ["first_step", "jump"], heavy: true, minAge: 16, growthOk: false, painBlocks: ["leg"], equipment: ["db", "kb", "barbell"], cue: "Front knee travels forward, drive up fast." }),
  // ---- primers: moderate / light ----
  P({ slug: "pap_p_landmine_row_press", name: "Landmine row-to-press (2–3 each side)", targets: ["throw"], heavy: false, minAge: 13, growthOk: false, painBlocks: ["arm"], equipment: ["barbell", "landmine"], cue: "Row, then punch up and across through the hips." }),
  P({ slug: "pap_p_mb_rotational", name: "Rotational med-ball scoop toss (2–3 each side, 6–8 lb)", targets: ["throw", "bat_speed"], heavy: false, minAge: 11, growthOk: true, painBlocks: ["back"], equipment: ["med_ball"], lb: 6, cue: "Load the back hip, turn and let it fly." }),
  P({ slug: "pap_p_overload_bat", name: "Overload bat swings (≤20% heavier, 3 swings)", targets: ["bat_speed"], heavy: false, minAge: 13, growthOk: false, painBlocks: ["arm", "back"], equipment: ["overload_bat", "bat"], isSwing: true, cue: "Full swings, full intent. Never more than 20% heavier than your game bat." }),
  P({ slug: "pap_p_kot_split", name: "Knee-over-toe split squat (bodyweight, 3 each leg)", targets: ["first_step", "jump"], heavy: false, minAge: 9, growthOk: false, painBlocks: ["leg"], equipment: [], cue: "Front knee over the toes, heel down, tall chest." }),
  P({ slug: "pap_p_band_rot_press", name: "Band rotational press (3 each side)", targets: ["throw", "bat_speed"], heavy: false, minAge: 9, growthOk: true, painBlocks: [], equipment: ["band"], cue: "Turn from the back hip, punch the band across your body." }),
  P({ slug: "pap_p_band_pulldown", name: "Band straight-arm pull-down (3 reps, fast)", targets: ["throw"], heavy: false, minAge: 9, growthOk: true, painBlocks: [], equipment: ["band"], cue: "Snap the band down to the hips, arms long." }),
  P({ slug: "pap_p_band_march", name: "Band-resisted march (3 each leg)", targets: ["first_step"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["leg"], equipment: ["band"], cue: "Lean into the band, drive the knee, punch the ground." }),
  P({ slug: "pap_p_iso_push", name: "Wall push isometric (3 × 3 s hard)", targets: ["first_step", "jump"], heavy: false, minAge: 9, growthOk: true, painBlocks: [], equipment: [], cue: "Sprinter lean into a wall, push hard for 3 seconds." }),
  P({ slug: "pap_p_pogo_easy", name: "Easy pogo hops (2 × 10)", targets: ["throw", "bat_speed", "first_step", "jump"], heavy: false, minAge: 7, growthOk: true, painBlocks: ["leg"], equipment: [], cue: "Quiet, springy, small hops." }),
  // ---- actions: throwing ----
  A({ slug: "pap_a_mb_overhead", name: "2-hand overhead med-ball throw", targets: ["throw"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["arm"], equipment: ["med_ball"], lb: 3, countWeight: 0, cue: "Step and throw it as far as you can. 100% intent." }),
  A({ slug: "pap_a_mb_underhand_windmill", name: "Underhand med-ball whip toss (windmill side)", targets: ["throw"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["arm"], equipment: ["med_ball"], lb: 2, countWeight: 0, cue: "Drive off the back leg and whip it forward underhand. 100% intent." }),
  A({ slug: "pap_a_throw_4oz", name: "Max-effort throw, 4 oz ball", targets: ["throw"], heavy: false, minAge: 13, growthOk: false, painBlocks: ["arm"], equipment: ["plyo_balls", "baseball"], oz: 4, countWeight: 1.5, realThrow: true, cue: "Full throw, 100% intent, into a net or partner." }),
  A({ slug: "pap_a_throw_baseball", name: "Max-effort throw, baseball (5 oz)", targets: ["throw"], heavy: false, minAge: 13, growthOk: false, painBlocks: ["arm"], equipment: ["baseball"], oz: 5, countWeight: 1.5, realThrow: true, cue: "Full throw, 100% intent." }),
  A({ slug: "pap_a_throw_6oz_constrained", name: "Max-effort throw, 6 oz ball from a kneeling or rocker position", targets: ["throw"], heavy: false, minAge: 13, growthOk: false, painBlocks: ["arm"], equipment: ["plyo_balls"], oz: 6, countWeight: 1.5, realThrow: true, constrainedOnly: true, cue: "Constrained position only — kneeling or rocker." }),
  // ---- actions: bat speed ----
  A({ slug: "pap_a_swing_light", name: "Max swings, bat 20% lighter", targets: ["bat_speed"], heavy: false, minAge: 11, growthOk: true, painBlocks: [], equipment: ["light_bat", "bat"], countWeight: 0, isSwing: true, cue: "3–5 swings, all-out speed, full finish." }),
  A({ slug: "pap_a_swing_game", name: "Max swings, game bat", targets: ["bat_speed"], heavy: false, minAge: 9, growthOk: true, painBlocks: [], equipment: ["bat"], countWeight: 0, isSwing: true, cue: "3–5 swings, all-out speed, full finish." }),
  // ---- actions: first step ----
  A({ slug: "pap_a_10yd_steal", name: "10-yd start from a steal stance", targets: ["first_step"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["leg"], equipment: [], countWeight: 0, isSprint: true, cue: "Crossover and go. 100% intent. Walk back slowly." }),
  A({ slug: "pap_a_10yd_infield", name: "10-yd start from an infield ready stance", targets: ["first_step"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["leg"], equipment: [], countWeight: 0, isSprint: true, cue: "Drop step or crossover, explode out." }),
  A({ slug: "pap_a_sl_lateral_broad", name: "Single-leg lateral broad jump (stick it)", targets: ["first_step", "jump"], heavy: false, minAge: 11, growthOk: false, painBlocks: ["leg"], equipment: [], countWeight: 0, cue: "Push sideways off one leg, land soft and hold." }),
  // ---- actions: jump / med ball (no doubling fallback) ----
  A({ slug: "pap_a_broad_jump", name: "Standing broad jump (stick it)", targets: ["jump"], heavy: false, minAge: 9, growthOk: false, painBlocks: ["leg"], equipment: [], countWeight: 0, cue: "Swing, jump far, land soft." }),
  A({ slug: "pap_a_mb_scoop", name: "Med-ball scoop toss for height", targets: ["jump"], heavy: false, minAge: 9, growthOk: true, painBlocks: ["back"], equipment: ["med_ball"], lb: 6, countWeight: 0, cue: "Hips back, then throw it straight up." }),
  A({ slug: "pap_a_easy_box_jump", name: "Easy jump onto a low box (step down)", targets: ["jump"], heavy: false, minAge: 7, growthOk: true, painBlocks: ["leg"], equipment: [], countWeight: 0, cue: "Low box, quiet landing, step down." }),
];

export interface PapInput {
  sport: "baseball" | "softball";
  role: PapRole;
  age: number | null;
  growthMode: boolean;
  /** 0–100. null = no check-in (treated as full). */
  readiness: number | null;
  pain: Partial<Record<PainArea, boolean>>;
  dayHas: { velocityThrow: boolean; batSpeed: boolean; hardRun: boolean };
  gameTomorrow: boolean;
  daysSinceStart: number | null;
  daysUntilStart: number | null;
  realThrowDaysThisWeek: number;
  /** Real-throw logging available (PAP throw types accepted by the arm ledger). */
  realThrowsEnabled: boolean;
  /** Ranked top goals (e.g. ["throwing","speed"]). */
  goals: readonly string[];
  /** null = unknown equipment → bodyweight/band/med-ball/bat assumed. */
  equipment: readonly string[] | null;
  firstLift: { slug: string; name: string; pattern: LiftPattern; heavy: boolean } | null;
}

export interface PapBlock {
  version: string;
  target: PapTarget;
  primer: { source: "lift" | "library"; slug: string; name: string; reps: [number, number]; heavy: boolean; cue: string };
  action: { slug: string; name: string; reps: [number, number]; oz: number | null; lb: number | null; count_weight: number; real_throw: boolean; cue: string };
  rest_s: [number, number];
  max_sets: number;
  /** Real baseball/4 oz/plyo throws: hard per-session total. */
  max_total_reps: number | null;
  half_volume: boolean;
  stop: { kind: "throw_swing"; drop_pct: 5; in_a_row: 2 } | { kind: "sprint"; drop_pct: 3 } | { kind: "feel" };
  stop_buttons: string[];
  requires_throwing_warmup: boolean;
  warmup_count_weight: number;
  reasons: string[];
}

const UNKNOWN_EQUIP = new Set(["band", "med_ball", "bat", "baseball"]);
function hasEquip(item: LibraryItem, eq: readonly string[] | null): boolean {
  if (item.equipment.length === 0) return true;
  if (eq == null) return item.equipment.some((e) => UNKNOWN_EQUIP.has(e));
  const have = new Set(eq.map((e) => e.toLowerCase()));
  return item.equipment.some((e) => have.has(e) || (e === "db" && have.has("dumbbells")) || (e === "med_ball" && have.has("medicine_ball")) || (e === "band" && have.has("bands")));
}

function allowed(item: LibraryItem, i: PapInput, heavyOk: boolean): boolean {
  const age = i.age ?? 0;
  if (age < item.minAge) return false;
  if (item.heavy && !heavyOk) return false;
  if (i.growthMode && !item.growthOk) return false;
  if (item.painBlocks.some((a) => i.pain[a])) return false;
  if (item.oz != null && (item.oz > 7 || item.oz < 4)) return false;
  if (item.oz != null && item.oz >= 6 && age < 13) return false;
  return hasEquip(item, i.equipment);
}

/** Goal → preferred target order (no goal = role default). */
function targetOrder(i: PapInput): PapTarget[] {
  const g = i.goals.map((x) => x.toLowerCase());
  const want = (t: PapTarget) => {
    const idx = g.findIndex((x) =>
      t === "throw" ? /throw|velo|pitch|arm/.test(x)
      : t === "bat_speed" ? /hit|bat|swing|power/.test(x)
      : /speed|run|steal|first/.test(x));
    return idx < 0 ? 99 : idx;
  };
  const base: PapTarget[] =
    i.role === "pitcher" || i.role === "windmill" ? ["throw", "bat_speed", "first_step"]
    : i.role === "two_way" ? ["throw", "bat_speed", "first_step"]
    : i.role === "catcher" ? ["bat_speed", "throw", "first_step"]
    : ["bat_speed", "first_step", "throw"];
  // Pitchers keep their throw lead; goals reorder within the rest.
  return [...base].sort((a, b) => {
    if (i.role === "pitcher" || i.role === "windmill") {
      if (a === "throw") return -1;
      if (b === "throw") return 1;
    }
    return want(a) - want(b) || base.indexOf(a) - base.indexOf(b);
  });
}

export function liftPrimerFits(target: PapTarget, pattern: LiftPattern): boolean {
  if (target === "throw") return pattern === "pull" || pattern === "hinge";
  if (target === "bat_speed") return pattern === "hinge" || pattern === "pull";
  if (target === "first_step") return pattern === "lunge" || pattern === "squat" || pattern === "hinge";
  return pattern !== "press" && pattern !== "other";
}

export function planPowerPrimer(i: PapInput): { block: PapBlock | null; reasons: string[] } {
  const reasons: string[] = [];
  if (!i.firstLift) return { block: null, reasons: ["no_lift"] };
  if (i.readiness != null && i.readiness < 40) return { block: null, reasons: ["readiness_under_40"] };
  const half = i.readiness != null && i.readiness < 60;
  if (half) reasons.push("readiness_40_59_half_volume");
  const age = i.age ?? 0;
  const heavyOk = age >= 16 && !i.growthMode;

  const blocked = new Set<PapTarget>();
  // Never double up a quality already trained today.
  if (i.dayHas.velocityThrow) { blocked.add("throw"); reasons.push("velo_card_today"); }
  if (i.dayHas.batSpeed) { blocked.add("bat_speed"); reasons.push("bat_speed_card_today"); }
  if (i.dayHas.hardRun) { blocked.add("first_step"); reasons.push("hard_run_today"); }
  if (i.pain.arm) { blocked.add("throw"); reasons.push("arm_pain"); }
  if (i.pain.leg) { blocked.add("first_step"); reasons.push("leg_pain"); }
  if (i.role === "pitcher" || i.role === "two_way") {
    if (i.daysSinceStart === 0 || i.daysSinceStart === 1) { blocked.add("throw"); reasons.push("day_after_start"); }
    if (i.daysUntilStart != null && i.daysUntilStart >= 0 && i.daysUntilStart <= 2) { blocked.add("throw"); reasons.push("start_within_2_days"); }
  }
  if (i.gameTomorrow) { blocked.add("first_step"); reasons.push("game_tomorrow_no_sprints"); }

  const doubled = i.dayHas.velocityThrow && i.dayHas.batSpeed && i.dayHas.hardRun;
  let order: PapTarget[] = doubled ? ["jump"] : [...targetOrder(i).filter((t) => !blocked.has(t)), "jump"];
  if (i.growthMode) { order = ["jump"]; reasons.push("growth_mode_easy_jumps"); }

  for (const target of order) {
    const block = build(target, i, heavyOk, half, reasons);
    if (block) return { block, reasons: [...reasons, `target_${target}`] };
  }
  return { block: null, reasons: [...reasons, "no_safe_action"] };
}

function build(target: PapTarget, i: PapInput, heavyOk: boolean, half: boolean, reasons: string[]): PapBlock | null {
  const age = i.age ?? 0;
  const lift = i.firstLift!;
  // ---- action ----
  let actions = PAP_LIBRARY.filter((x) => x.use === "action" && x.targets.includes(target) && allowed(x, i, heavyOk));
  if (i.growthMode) actions = actions.filter((x) => x.slug === "pap_a_easy_box_jump" || x.slug === "pap_a_mb_scoop");
  if (target === "throw") {
    const realOk = i.realThrowsEnabled && i.sport === "baseball" && i.role !== "windmill" && age >= 13
      && !i.gameTomorrow && i.realThrowDaysThisWeek < 2;
    if (!realOk) actions = actions.filter((x) => !x.realThrow);
    if (i.role === "windmill") actions = actions.filter((x) => x.slug === "pap_a_mb_underhand_windmill");
    else actions = actions.filter((x) => x.slug !== "pap_a_mb_underhand_windmill");
    // Prefer real throws on the 1–2 allowed days; the constrained 6 oz is never the default.
    actions.sort((a, b) => Number(!!b.realThrow) - Number(!!a.realThrow) || (a.oz ?? 0) - (b.oz ?? 0));
    actions = actions.filter((x) => !x.constrainedOnly);
  }
  if (target === "first_step" && i.gameTomorrow) actions = actions.filter((x) => !x.isSprint);
  const action = actions[0];
  if (!action) return null;

  // ---- primer: the lift's own first sets when it fits and is legal ----
  const ownHeavyBlocked = lift.heavy && (!heavyOk || (i.pain.back && lift.pattern === "hinge"));
  const pressBeforeThrow = target === "throw" && lift.pattern === "press";
  let primer: PapBlock["primer"] | null = null;
  if (!i.growthMode && !ownHeavyBlocked && !pressBeforeThrow && liftPrimerFits(target, lift.pattern)) {
    primer = { source: "lift", slug: lift.slug, name: `${lift.name} — your first sets`, reps: [1, 3], heavy: lift.heavy, cue: "Use your first working sets. 1–3 crisp reps, never to failure." };
  } else {
    const lib = PAP_LIBRARY.filter((x) => x.use === "primer" && x.targets.includes(target) && allowed(x, i, heavyOk)
      && !(target === "throw" && x.isPress && !x.slug.includes("landmine"))
      && !(i.pain.back && x.isHinge && x.heavy)
      && !(target === "bat_speed" && x.isSwing && i.dayHas.batSpeed));
    const pick = (i.growthMode ? lib.filter((x) => x.slug === "pap_p_pogo_easy") : lib)
      .sort((a, b) => Number(b.heavy) - Number(a.heavy))[0];
    if (!pick) return null;
    primer = { source: "library", slug: pick.slug, name: pick.name, reps: [1, 3], heavy: pick.heavy, cue: pick.cue };
    if (lift.heavy && !heavyOk) reasons.push("under_16_or_growth_light_primer");
  }

  const heavyPrimer = primer.heavy;
  const rest: [number, number] = !heavyPrimer ? [60, 90] : action.isSprint ? [180, 240] : [120, 180];
  const realThrow = !!action.realThrow;
  let maxSets: number, reps: [number, number];
  if (action.isSprint) { maxSets = 4; reps = [2, 3]; }
  else if (action.isSwing) { maxSets = 5; reps = [3, 5]; }
  else if (target === "throw") { maxSets = 4; reps = [3, 5]; }
  else { maxSets = 4; reps = [2, 3]; }
  if (half) maxSets = Math.max(1, Math.ceil(maxSets / 2));
  const maxTotal = realThrow ? (half ? 3 : 5) : null;

  return {
    version: PAP_VERSION,
    target,
    primer,
    action: { slug: action.slug, name: action.name, reps, oz: action.oz ?? null, lb: action.lb ?? null, count_weight: action.countWeight, real_throw: realThrow, cue: action.cue },
    rest_s: rest,
    max_sets: maxSets,
    max_total_reps: maxTotal,
    half_volume: half,
    stop: action.isSprint ? { kind: "sprint", drop_pct: 3 } : (action.isSwing || target === "throw") ? { kind: "throw_swing", drop_pct: 5, in_a_row: 2 } : { kind: "feel" },
    stop_buttons: ["Lost snap", "Mechanics changed", "Ground feels soft"],
    requires_throwing_warmup: realThrow,
    warmup_count_weight: 0.25,
    reasons: [],
  };
}

/** Stop rule for recorded speeds. Higher-is-better for throws/swings (mph), lower for sprints (s). */
export function shouldStop(block: Pick<PapBlock, "stop" | "max_sets" | "max_total_reps">, values: number[], setsDone: number, totalReps: number): boolean {
  if (setsDone >= block.max_sets) return true;
  if (block.max_total_reps != null && totalReps >= block.max_total_reps) return true;
  if (values.length === 0) return false;
  if (block.stop.kind === "throw_swing") {
    const best = Math.max(...values);
    const n = block.stop.in_a_row;
    if (values.length < n) return false;
    return values.slice(-n).every((v) => v <= best * (1 - (block.stop as { drop_pct: number }).drop_pct / 100));
  }
  if (block.stop.kind === "sprint") {
    const best = Math.min(...values);
    return values[values.length - 1] >= best * (1 + (block.stop as { drop_pct: number }).drop_pct / 100);
  }
  return false;
}

/** Map catalog movement fields → lift pattern. */
export function liftPatternOf(slug: string, pattern?: string | null, category?: string | null): LiftPattern {
  const s = `${slug} ${pattern ?? ""} ${category ?? ""}`.toLowerCase();
  if (/lunge|split|step_up|single_leg|bulgarian|rfess/.test(s)) return "lunge";
  if (/deadlift|hinge|rdl|trap_bar|clean|hip_thrust|good_morning/.test(s)) return "hinge";
  if (/squat/.test(s)) return "squat";
  if (/row|pull|chin/.test(s)) return "pull";
  if (/press|bench|push|dip/.test(s)) return "press";
  return "other";
}

export function painAreasFromInjuries(slugs: Iterable<string>): Partial<Record<PainArea, boolean>> {
  const out: Partial<Record<PainArea, boolean>> = {};
  for (const s0 of slugs) {
    const s = s0.toLowerCase();
    if (/shoulder|elbow|ucl|rotator|labr|bicep|forearm|wrist|arm/.test(s)) out.arm = true;
    if (/hamstring|knee|ankle|calf|quad|groin|achilles|shin|foot|hip|acl|leg/.test(s)) out.leg = true;
    if (/back|lumbar|spine|disc|spondy/.test(s)) out.back = true;
  }
  return out;
}
