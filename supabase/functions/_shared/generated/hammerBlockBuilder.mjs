// src/lib/hammer/prescription/warmupStages.ts
var WARMUP_STAGES = [
  { stage: 0, name: "Tissue prep", warmth: "Cold, straight from sitting \u2014 rolling and easy rhythmic bounces loosen stiff tissue first." },
  { stage: 1, name: "Breathe and reset", warmth: "Still cold \u2014 slow breathing calms the body and sets the ribs before you move more." },
  { stage: 2, name: "Joint circles", warmth: "Loose but not warm \u2014 slow, controlled circles wake up every joint." },
  { stage: 3, name: "Mobilize", warmth: "Starting to warm \u2014 joints move freely, so you can open up hips, back and shoulders." },
  { stage: 4, name: "Activate", warmth: "Warm and mobile \u2014 now switch on glutes, trunk, shoulder blades and arm care." },
  { stage: 5, name: "Coordinate", warmth: "Muscles switched on \u2014 light catches and taps sharpen hands and eyes." },
  { stage: 6, name: "Movement prep", warmth: "Warm all over \u2014 skips, quick feet and rhythm drills, still well under full speed." },
  { stage: 7, name: "Build-ups", warmth: "Moving well \u2014 sprints, throws or swings that climb from about 60% to 80%." },
  { stage: 8, name: "Elastic hops", warmth: "Built up to 80% \u2014 single-leg hops, bounds and sticks that need a fully warm body." },
  { stage: 9, name: "Prime", warmth: "Fully ready \u2014 short, high-intent efforts so you finish sharp and ready to dominate." }
];
var MAX_STAGE = WARMUP_STAGES.length - 1;
var BUILD_UP_STAGE = 7;
var HIGH_INTENT_ROLES = /* @__PURE__ */ new Set(["single_leg_twitch", "ground_force", "fast_twitch"]);
var STAGE_BY_ROLE = {
  tissue_prep: 0,
  breathwork: 1,
  cars: 2,
  fascial_rotation: 3,
  mobility_joint: 3,
  activation: 4,
  stability: 4,
  arm_care: 4,
  weightless_coordination: 5,
  neural_priming: 6,
  ladder_quickness: 6,
  movement_bridge: 7,
  single_leg_twitch: 8,
  ground_force: 9,
  fast_twitch: 9
};
var FIXED_ORDER = {
  wu_tissue_prep_roll_and_rhythm: 1,
  wu_tissue_prep_rhythmic_shake: 2,
  "hpi-breath-primer": 0
};
var FIXED_STAGE = { "hpi-breath-primer": 1 };
var overrides = null;
function loadOverrides() {
  if (overrides) return overrides;
  overrides = /* @__PURE__ */ new Map();
  try {
    const raw = false ? (void 0).getItem(LS_KEY) : null;
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) overrides.set(k, v);
  } catch {
  }
  return overrides;
}
function setWarmupStageOverrides(map) {
  overrides = new Map(Object.entries(map ?? {}));
}
var clamp = (n) => Math.max(0, Math.min(MAX_STAGE, Math.round(n)));
var ROLE_BY_SLUG = /* @__PURE__ */ new Map();
function registerWarmupRoles(entries) {
  for (const e of entries) ROLE_BY_SLUG.set(e.slug, e.role);
}
function stageFor(slug, role) {
  if (slug in FIXED_STAGE) return FIXED_STAGE[slug];
  const r = role ?? ROLE_BY_SLUG.get(slug);
  if (r === "tissue_prep" || slug.startsWith("wu_tissue_prep")) return 0;
  const o = loadOverrides().get(slug);
  let s = o ? clamp(o.stage) : r && r in STAGE_BY_ROLE ? STAGE_BY_ROLE[r] : null;
  if (s === null) return null;
  if (s === 0) s = 1;
  if (r && HIGH_INTENT_ROLES.has(r) && s <= BUILD_UP_STAGE) s = BUILD_UP_STAGE + 1;
  return s;
}
function orderWithinStage(slug) {
  if (slug in FIXED_ORDER) return FIXED_ORDER[slug];
  return loadOverrides().get(slug)?.order ?? null;
}
function sortByWarmupStage(items, slugOf, roleOf) {
  let prev = 0;
  const keyed = items.map((it, i) => {
    const slug = slugOf(it);
    const known = stageFor(slug, roleOf?.(it) ?? null);
    const stage = known ?? prev;
    prev = stage;
    return { it, i, stage, ord: orderWithinStage(slug) };
  });
  keyed.sort((a, b) => a.stage - b.stage || (a.ord ?? Number.POSITIVE_INFINITY) - (b.ord ?? Number.POSITIVE_INFINITY) || a.i - b.i);
  return keyed.map((k) => k.it);
}

// src/lib/hammer/prescription/planSanity.ts
var ORDER = { prep: 0, drills: 1, full_go: 2, log: 3 };
function enforceSkillStageOrder(blocks) {
  return blocks.map((block) => {
    if (block.status !== "ready" || !["hitting", "throwing", "defense", "baserunning"].includes(block.modality) || block.drills.some((drill) => !drill.stage || drill.ownerDrillId || drill.prescriptionOrigin === "owner")) return block;
    const drills = [...block.drills].sort((a, b) => (a.stage ? ORDER[a.stage] : 0) - (b.stage ? ORDER[b.stage] : 0));
    if (drills.every((drill, index) => drill === block.drills[index])) return block;
    return { ...block, drills, steps: drills.map((d2) => d2.setup ? `${d2.name} \u2014 ${d2.dosage} (${d2.setup})` : `${d2.name} \u2014 ${d2.dosage}`) };
  });
}

// src/lib/hammer/prescription/recoveryDrills.ts
function recoveryDrills(elevated) {
  return [
    {
      name: "Mobility + foam roll",
      dosage: elevated ? "15 min full body" : "10 min focus areas",
      setup: "Use gentle mobility in a comfortable range. Foam roll only if you have a roller.",
      cue: "Use light pressure and breathe slowly.",
      stopIf: "Stop if movement causes sharp pain. Follow your professional\u2019s injury instructions.",
      guide: {
        what: "Gentle mobility and optional foam rolling.",
        setup: "Choose a comfortable space. A roller is optional.",
        goodRep: ["Move slowly through a comfortable range.", "If using a roller, use light pressure rather than forcing a sore spot."],
        badRep: ["Forcing a painful range or pressing hard into an injured area."],
        feel: "Comfortable movement, not a hard workout.",
        whyToday: "Easy movement after your session.",
        nextLink: "Continue with your evening breathing.",
        stopIf: "Stop if movement causes sharp pain. Follow your professional\u2019s injury instructions."
      }
    },
    {
      name: "Evening down-regulation breath (post-session)",
      dosage: elevated ? "10 min" : "5 min",
      setup: "Sit or lie comfortably after your session.",
      cue: "Breathe gently, with a relaxed exhale longer than your inhale. Do not hold your breath.",
      stopIf: "Return to normal breathing if you feel dizzy or uncomfortable.",
      guide: {
        what: "Gentle evening breathing.",
        setup: "Sit or lie comfortably.",
        goodRep: ["Let your shoulders relax.", "Breathe gently in, then exhale a little longer without forcing it.", "Keep breathing normally between breaths; do not hold your breath."],
        badRep: ["Straining, holding your breath or breathing so deeply that you feel dizzy."],
        feel: "Easy and relaxed.",
        whyToday: "A quiet finish to your session.",
        nextLink: "Finish your evening check-in.",
        stopIf: "Return to normal breathing if you feel dizzy or uncomfortable."
      }
    }
  ];
}

// src/lib/hammer/prescription/masteryFocus.ts
var masteryModality = (pillar) => pillar === "contact" || pillar === "power" ? "hitting" : pillar === "arm" ? "throwing" : pillar === "defense" ? "defense" : pillar === "speed" ? "speed" : null;
function masteryGoalWeights(goals, focus) {
  if (!goals || !focus?.observedFocus || !focus.sourceIds.length) return goals;
  const category = focus.observedFocus === "contact" || focus.observedFocus === "power" ? "hitting" : focus.observedFocus === "arm" ? "throwing" : focus.observedFocus === "defense" ? "fielding" : focus.observedFocus === "speed" ? "speed" : null;
  if (!category) return goals;
  const ordered = [...goals.goals].sort((a, b) => a.rank - b.rank);
  ordered.sort((a, b) => Number(b.category === category) - Number(a.category === category));
  return { ...goals, goals: ordered.map((g, i) => ({ ...g, rank: i + 1 })) };
}
function applyMasteryFocus(blocks, focus) {
  if (!focus) return blocks;
  const withSteal = focus.leftPowerStealEmphasis ? blocks.map((b) => b.modality === "baserunning" && b.status === "ready" ? { ...b, because: [...b.because ?? [], "Left-handed power guidance: focus on steal jumps, reads, Royal timing and baserunning inside this existing work. Source: owner Bunting Mastery. No added reps or days."] } : b) : blocks;
  if (!focus.sourceIds.length || !focus.observedFocus) return withSteal;
  const target = masteryModality(focus.observedFocus);
  if (!target) return blocks;
  const slots = withSteal.map((b, i) => ["hitting", "defense", "throwing", "speed", "baserunning"].includes(b.modality) && b.status === "ready" ? i : -1).filter((i) => i >= 0);
  const skill = slots.map((i) => withSteal[i]);
  if (!skill.some((b) => b.modality === target)) return withSteal;
  skill.sort((a, b) => Number(b.modality === target) - Number(a.modality === target));
  const out = [...withSteal];
  slots.forEach((i, n) => {
    const b = skill[n];
    out[i] = b.modality === target ? { ...b, because: [...b.because ?? [], `${focus.reason} Source: Coaching Console standards and ${focus.sourceIds.length} canonical evidence records.`] } : b;
  });
  return out;
}

// supabase/functions/_shared/wic/buntingMastery.ts
var BUNT_TYPES = ["squeeze", "sac_3b", "sac_1b", "drag", "push", "hit"];
var BUNT_WORDING = {
  R: {
    squeeze: "Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)",
    sac_3b: "Sac bunt toward 3B (man on second)",
    sac_1b: "Sac bunt toward 1B (man on 1B)",
    drag: "Drag bunt (toward 3B)",
    push: "Push bunt (LHP only: beyond pitcher to the position of second baseman)",
    hit: "Bunt for a hit (Softly down 1B line)"
  },
  L: {
    squeeze: "Squeeze bunt (softly on 1B side of pitcher angled so pitcher grabs it instead of 1B)",
    sac_3b: "Sac bunt toward 3B (man on second)",
    sac_1b: "Sac bunt toward 1B (man on 1B)",
    drag: "Drag bunt (toward 3B)",
    push: "Push bunt (LHP only/ not for Switch hitters: Beyond pitcher to the position of second baseman)",
    hit: "Bunt for a hit (Softly down 1B line)"
  }
};
var DRAG_BUNT_GUIDANCE = "The drag bunt is a bunt for a hit toward the 3B line, as close to the line as possible. The acceptable miss is a foul ball. Use it early in the count, never with two strikes: a foul bunt with two strikes is a strikeout.";
var LEFT_POWER_GUIDANCE = "Bunting for hits against the shift and base-stealing mastery: steal jumps, reads, Royal timing on jumps and baserunning sessions. Your existing plan and safety rules decide the work; this guidance adds no reps or days.";
function buntGuidance(side, type) {
  return type === "drag" ? DRAG_BUNT_GUIDANCE : BUNT_WORDING[side][type];
}

// supabase/functions/_shared/wic/buntingProgram.ts
function validBuntOutcome(outcome) {
  return ["R", "L"].includes(outcome.side) && BUNT_TYPES.includes(outcome.type) && Number.isInteger(outcome.attempts) && outcome.attempts > 0 && Number.isInteger(outcome.successes) && outcome.successes >= 0 && outcome.successes <= outcome.attempts;
}
function buntingProgram(facts) {
  const included = facts.modules.some((module) => [`${facts.sport}_5tool`, `${facts.sport}_golden2way`].includes(module));
  const games = (facts.battingGames ?? []).filter((game) => Number.isInteger(game.hits) && Number.isInteger(game.atBats) && game.atBats > 0 && game.hits >= 0 && game.hits <= game.atBats);
  const atBats = games.reduce((sum, game) => sum + game.atBats, 0);
  const hits = games.reduce((sum, game) => sum + game.hits, 0);
  const window2 = facts.battingWindow;
  const validWindow = window2 != null && Number.isInteger(window2.start) && window2.start >= 1 && Number.isInteger(window2.end) && window2.end >= window2.start && Number.isInteger(window2.atBats) && window2.atBats === window2.end - window2.start + 1 && Number.isInteger(window2.hits) && window2.hits >= 0 && window2.hits <= window2.atBats;
  const lowAverage = facts.lowAverage ?? 0.3;
  const under300 = facts.battingWindow !== void 0 ? validWindow && window2.hits / window2.atBats < lowAverage : games.length >= 2 && games.every((game) => game.hits / game.atBats < lowAverage);
  const sides = facts.bats === "S" ? ["R", "L"] : facts.bats ? [facts.bats] : [];
  const wantedSessions = facts.speedy === true || facts.lacksPower === true ? 3 : 2;
  const weekdays = [...new Set(facts.legalWeekdays)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort((a, b) => a - b).slice(0, 6);
  const scheduled = included && sides.length ? weekdays.slice(0, wantedSessions) : [];
  const dose = (side, type) => {
    const floor = under300 || side === "L" && (facts.leftPower === true || facts.powerGoal === true) ? 7 : 5;
    const logs = (facts.outcomes ?? []).filter((outcome) => outcome.side === side && outcome.type === type && validBuntOutcome(outcome));
    const attempts = logs.reduce((sum, log) => sum + log.attempts, 0);
    const successes = logs.reduce((sum, log) => sum + log.successes, 0);
    return {
      reps: attempts ? Math.min(20, floor + Math.round((20 - floor) * (1 - successes / attempts))) : floor,
      floor,
      attempts,
      successes,
      successRate: attempts ? successes / attempts : null
    };
  };
  const typesFor = (side) => BUNT_TYPES.filter((type) => type !== "push" || facts.opponentThrows === "L" && !(side === "L" && facts.bats === "S"));
  return {
    included,
    sides,
    scheduled,
    wantedSessions,
    constrained: scheduled.length < wantedSessions,
    canTrainToday: included && sides.length > 0 && !facts.restDay && !facts.gameDay,
    battingSample: { games: games.length, atBats: validWindow ? window2.atBats : atBats, hits: validWindow ? window2.hits : hits, average: validWindow ? window2.hits / window2.atBats : atBats ? hits / atBats : null, under300, window: validWindow ? window2 : null },
    dose,
    typesFor
  };
}

// supabase/functions/_shared/wic/season.ts
var OS_ONLY_ECCENTRIC_SLUGS = /* @__PURE__ */ new Set([
  "back_squat_double_ecc",
  "front_squat_double_ecc",
  "bench_press_double_ecc",
  "incline_bench_double_ecc",
  "hip_thrust_double_ecc",
  "rdl_double_ecc",
  "trap_bar_dl_double_ecc",
  "weighted_pullup_double_ecc",
  "nordic_curl",
  "reverse_nordic",
  "copenhagen_adduction_ecc",
  "plyo_depth_jump"
]);
var IN_SEASON_BLOCKED_SLUGS = /* @__PURE__ */ new Set([
  ...OS_ONLY_ECCENTRIC_SLUGS,
  "atg_split_squat",
  "sissy_squat",
  "slide_lunge"
]);

// supabase/functions/_shared/planSwap/simpleSwap.ts
var key = (v) => v.trim().toLowerCase().replace(/[\s-]+/g, "_");
var IGNORED = /* @__PURE__ */ new Set(["none", "bodyweight", ""]);
var ALIASES = { bat: "gamer_bat", cable: "cable_stack", band: "bands", dumbbells: "dumbbell", db: "dumbbell", kb: "kettlebell", medicine_ball: "med_ball", plate: "plates", rack: "squat_rack", pins: "safety_pins", smith: "smith_machine", light_bat: "underload_bat", pullup_bar: "pull_up_bar" };
var gearKey = (value) => ALIASES[key(value)] ?? key(value);
function equipmentGroups(row) {
  const value = row.equipment_alternatives;
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  if (value.some((group) => !Array.isArray(group) || !group.length || group.some((g) => typeof g !== "string" || !g.trim()))) return null;
  return value.map((group) => group.map(gearKey));
}
function mandatoryGear(row) {
  const arrays = [row.equipment_requirements ?? [], row.equipment ?? []];
  if (arrays.some((value) => !Array.isArray(value) || value.some((g) => typeof g !== "string" || !g.trim()))) return null;
  return [...new Set(arrays.flat().map(gearKey))].filter((g) => !IGNORED.has(g));
}
function ownsAllGear(row, owned, universal = []) {
  const have = new Set([...owned, ...universal].map(gearKey));
  const groups = equipmentGroups(row);
  const mandatory = mandatoryGear(row);
  return groups !== null && mandatory !== null && mandatory.every((g) => have.has(g)) && (groups.length === 0 || groups.some((group) => group.every((g) => IGNORED.has(g) || have.has(g))));
}

// supabase/functions/_shared/planSwap/commonGear.ts
var COMMON_SWAP_GEAR = ["barbell", "dumbbell", "bands", "pitching_machine", "net", "tee", "open_field", "hill", "sled", "foam_roller", "baseballs", "softballs", "gamer_bat"];
var SAME_GEAR = {
  bands: ["band", "resistance_band", "mini_band", "light_band", "sprint_band"],
  dumbbell: ["dumbbells", "db"],
  open_field: ["field", "open_space", "space"],
  baseballs: ["baseball", "ball"],
  softballs: ["softball", "ball"],
  pitching_machine: ["machine"],
  gamer_bat: ["bat", "game_bat"]
};
function swapGearList(known) {
  return [.../* @__PURE__ */ new Set([...known, ...COMMON_SWAP_GEAR])];
}
function missingGearAnswer(checked, note, known) {
  const allowed = new Set(swapGearList(known));
  const selected = checked.filter((item) => allowed.has(item));
  for (const item of [...selected]) for (const k of known) if (SAME_GEAR[item]?.includes(k)) selected.push(k);
  const other = note?.trim();
  return [.../* @__PURE__ */ new Set([...selected, ...other ? [other] : []])];
}

// src/lib/hammer/prescription/buntingPlan.ts
function buntIdentity(slug) {
  const match = /^bunt_([rl])_(squeeze|sac_3b|sac_1b|drag|push|hit)$/.exec(slug);
  return match ? { side: match[1] === "r" ? "R" : "L", type: match[2] } : null;
}
function applyBuntingPlan(blocks, facts, options) {
  const program = buntingProgram(facts);
  const owned = new Set(options.owned);
  for (const token of COMMON_SWAP_GEAR) if (missingGearAnswer([token], void 0, options.owned).some((g) => options.owned.includes(g))) owned.add(token);
  const sportBall = facts.sport === "softball" ? "softballs" : "baseballs";
  if (!owned.has(sportBall)) return blocks;
  if (!program.canTrainToday || !program.scheduled.includes(options.weekday)) return blocks;
  return blocks.map((block) => {
    if (block.modality !== "hitting" || block.status !== "ready" || block.phase === "recover" || block.phase === "deload") return block;
    const side = block.side ?? (facts.bats === "R" || facts.bats === "L" ? facts.bats : null);
    if (!side || !program.sides.includes(side)) return block;
    const eligible = options.catalog.filter((row) => {
      const identity2 = buntIdentity(row.slug);
      return identity2?.side === side && program.typesFor(side).includes(identity2.type) && row.is_active && row.dosage_unit === "attempts" && (row.sport_scope === facts.sport || row.sport_scope === "both") && (!row.visible_to?.length || Boolean(options.userId && row.visible_to.includes(options.userId))) && options.age !== null && row.min_age_years !== null && options.age >= row.min_age_years && (row.season_eligibility?.includes(options.phase) || options.phase === "off_season" && ["os_q1", "os_q2", "os_q3", "os_q4"].every((p) => row.season_eligibility?.includes(p))) && ownsAllGear(row, owned);
    }).sort((a, b) => BUNT_TYPES.indexOf(buntIdentity(a.slug)?.type ?? "hit") - BUNT_TYPES.indexOf(buntIdentity(b.slug)?.type ?? "hit"));
    if (!eligible.length) return block;
    const index = ((options.weekIndex * program.scheduled.length + program.scheduled.indexOf(options.weekday)) % eligible.length + eligible.length) % eligible.length;
    const pick = eligible[index];
    const identity = pick ? buntIdentity(pick.slug) : null;
    if (!pick || !identity) return block;
    const dose = program.dose(side, identity.type);
    const slot = block.drills.findIndex((d2) => d2.stage === "drills" && d2.prescriptionOrigin !== "owner" && /^\d+ swings(?:\s|$)/i.test(d2.dosage));
    const original = block.drills[slot];
    const budget = original ? Number(/^(\d+) swings/i.exec(original.dosage)?.[1]) : 0;
    if (!original || budget < dose.floor) return block;
    const attempts = Math.min(dose.reps, budget, 20);
    const drill = {
      name: pick.name,
      slug: pick.slug,
      stage: "drills",
      dosage: `${attempts} attempts`,
      cue: pick.cue,
      setup: `Use your saved bat, ball and safe space. Record attempts and successful bunts for this side and type only. ${buntGuidance(side, identity.type)}${side === "L" && (facts.leftPower === true || facts.powerGoal === true) ? ` ${LEFT_POWER_GUIDANCE}` : ""}`,
      stopIf: "Pain, dizziness, fatigue or unsafe space \u2014 stop.",
      bunt: { side, type: identity.type, attempts, sourceAttempts: dose.attempts, sourceSuccesses: dose.successes }
    };
    const drills = [...block.drills.slice(0, slot), drill, ...budget > attempts ? [{ ...original, dosage: `${budget - attempts} swings` }] : [], ...block.drills.slice(slot + 1)];
    const sample = program.battingSample;
    const because = `${attempts} ${side === "R" ? "right" : "left"}-handed bunt attempts replace ${attempts} swings from today's skill work.${sample.under300 ? sample.window ? ` Completed batting window ${sample.window.start}\u2013${sample.window.end}: ${sample.hits} hits in ${sample.atBats} at-bats, below ${(facts.lowAverage ?? 0.3).toFixed(3)}; source: entered game at-bats.` : ` Entered batting sample: ${sample.hits} hits in ${sample.atBats} at-bats across ${sample.games} games; each entered game was below ${(facts.lowAverage ?? 0.3).toFixed(3)}.` : ""}${dose.attempts ? ` This bunt: ${dose.successes} successful out of ${dose.attempts} entered attempts.` : ""}`;
    return { ...block, drills, steps: drills.map((d2) => `${d2.name} \u2014 ${d2.dosage}`), because: [...block.because ?? [], because], gamePlanTemplate: block.gamePlanTemplate ? { ...block.gamePlanTemplate, checklist: drills.map((d2) => `${d2.name} \u2014 ${d2.dosage}`) } : null };
  });
}

// supabase/functions/_shared/wic/schedule/softRecovery.ts
var SOFT_RECOVERY_SLUGS = /* @__PURE__ */ new Set([
  "rc_breathing_reset",
  "ac_recovery_belly_breathing",
  "wu_crocodile_breathing",
  "wu_9020_reset",
  "wu_foam_roll_tspine",
  "thoracic_foam_roll",
  "plantar_fascia_release",
  "wu_lacrosse_ball_pec",
  "wu_lacrosse_ball_glute",
  "wu_calf_softball_pin",
  "wu_tspine_open_book",
  "wu_thoracic_windmill",
  "wu_thread_the_needle_slow",
  "wu_lateral_line_reach",
  "wu_ankle_cars",
  "wu_wrist_cars",
  "wu_90_90_switch"
]);
function isSoftRecovery(slug) {
  return typeof slug === "string" && SOFT_RECOVERY_SLUGS.has(slug);
}

// src/lib/hammer/goals/subGoalCatalog.ts
var SPEED = [
  { id: "first_step", label: "Quicker first step", helpText: "Explode out of your stance \u2014 the first 10 feet decide most plays.", weightHints: { speed_acceleration: 0.7, strength_lower: 0.3 } },
  { id: "top_end", label: "Higher top-end speed", helpText: "Run faster once you're already moving \u2014 gap-to-gap, first-to-third.", weightHints: { speed_max_velocity: 0.8, strength_lower: 0.2 } },
  { id: "base_stealing", label: "Steal more bases", helpText: "Better reads, jumps, and slides on the bases.", weightHints: { speed_baserunning: 0.8, speed_acceleration: 0.2 } },
  { id: "conditioning", label: "Stay fast late in games", helpText: "Maintain speed in inning 7 the way you had it in inning 1.", weightHints: { speed_conditioning: 0.7, strength_lower: 0.3 } }
];
var POWER_POSITION = [
  { id: "bat_speed", label: "Faster bat speed", helpText: "Swing the bat harder through the zone.", weightHints: { hitting_bat_speed: 0.7, strength_rotational: 0.3 } },
  { id: "rotational_horsepower", label: "Rotational horsepower", helpText: "Turn your hips and torso harder \u2014 the engine behind every swing and throw.", weightHints: { strength_rotational: 0.7, hitting_bat_speed: 0.3 } },
  { id: "contact_strength", label: "Strength at contact", helpText: "Hold the barrel through contact instead of getting knocked back.", weightHints: { strength_grip: 0.5, strength_upper: 0.3, hitting_contact: 0.2 } },
  { id: "lower_half_drive", label: "Lower-half drive", helpText: "Push the ground harder so your swing and sprint start from the floor up.", weightHints: { strength_lower: 0.7, speed_acceleration: 0.3 } },
  { id: "explosive_jump", label: "Explosive jump / vertical", helpText: "More vertical pop \u2014 translates to first step and rotational power.", weightHints: { strength_lower: 0.5, speed_acceleration: 0.5 } }
];
var POWER_PITCHER = [
  { id: "mound_explosiveness", label: "Mound explosiveness", helpText: "More force off the rubber so velocity climbs without overthrowing.", weightHints: { strength_lower: 0.5, strength_rotational: 0.3, pitching_velocity: 0.2 } },
  { id: "rotational_horsepower", label: "Rotational horsepower", helpText: "Turn the hips harder against a firm front side.", weightHints: { strength_rotational: 0.7, pitching_velocity: 0.3 } },
  { id: "lower_half_drive", label: "Lower-half drive", helpText: "Push the ground harder so your delivery stops leaking energy.", weightHints: { strength_lower: 0.7, pitching_velocity: 0.3 } },
  { id: "upper_body_durability", label: "Upper-body durability", helpText: "Build the shoulders, scaps, and forearm so the arm survives volume.", weightHints: { strength_upper: 0.5, recovery_arm_care: 0.5 } }
];
var THROWING_POSITION = [
  { id: "arm_strength", label: "Arm strength", helpText: "Carry the ball longer with less effort \u2014 outfield throws, infield gun.", weightHints: { throwing_velocity: 0.6, throwing_long_toss: 0.4 } },
  { id: "on_line_accuracy", label: "On-line accuracy", helpText: "Hit the chest, every throw, every base.", weightHints: { throwing_accuracy: 0.8, throwing_footwork: 0.2 } },
  { id: "transfer_exchange", label: "Glove-to-hand transfer", helpText: "Cleaner, faster exchange so runners don't beat the throw.", weightHints: { throwing_transfer: 0.8, fielding_hands: 0.2 }, retired: true },
  { id: "footwork", label: "Footwork into the throw", helpText: "Get your feet right so the throw is online before the arm tries to save it.", weightHints: { throwing_footwork: 0.7, throwing_accuracy: 0.3 } },
  { id: "long_toss_capacity", label: "Long-toss capacity", helpText: "Build a durable, healthy arm with progressive distance.", weightHints: { throwing_long_toss: 0.7, recovery_arm_care: 0.3 }, retired: true },
  { id: "arm_health", label: "Arm health", helpText: "Keep your throwing arm comfortable and ready for the work you do.", weightHints: { recovery_arm_care: 1 } },
  { id: "throw_carry", label: "Improve throw carry", helpText: "Keep your throws carrying to the target without extra effort.", weightHints: { throwing_velocity: 0.6, throwing_accuracy: 0.4 } }
];
var HITTING = [
  { id: "barrel_control", label: "Barrel control", helpText: "Square up more pitches \u2014 get the barrel to the ball more often.", weightHints: { hitting_contact: 0.7, hitting_bat_speed: 0.3 } },
  { id: "plate_discipline", label: "Plate discipline", helpText: "Swing at strikes, take balls \u2014 own the zone.", weightHints: { hitting_plate_discipline: 0.9 } },
  { id: "two_strike_approach", label: "Contact Rate", helpText: "Put the ball in play more often \u2014 fewer swings and misses.", weightHints: { hitting_two_strike: 0.8, hitting_contact: 0.2 } },
  { id: "oppo_power", label: "Oppo / all-fields power", helpText: "Drive the ball to all fields, not just pull side.", weightHints: { hitting_oppo_power: 0.7, hitting_bat_speed: 0.3 }, retired: true },
  { id: "launch_consistency", label: "Consistent launch", helpText: "Quit hitting the top of the ball \u2014 line drives and lift, not chops.", weightHints: { hitting_contact: 0.5, hitting_bat_speed: 0.5 }, retired: true },
  { id: "in_game_power", label: "In-game power hitting", helpText: "Hit the ball hard in real games, not just in practice.", weightHints: { hitting_bat_speed: 0.6, hitting_contact: 0.4 } },
  { id: "all_fields", label: "Hitting to all fields", helpText: "Hit the ball where it's pitched \u2014 pull, middle and the other way.", weightHints: { hitting_oppo_power: 0.6, hitting_contact: 0.4 } },
  { id: "situational_hitting", label: "Situational hitting", helpText: "Do the job the moment needs \u2014 move runners, get them in.", weightHints: { hitting_contact: 0.6, hitting_plate_discipline: 0.4 } },
  { id: "plate_confidence", label: "Confidence at the plate", helpText: "Step in calm and ready to compete every at-bat.", weightHints: { hitting_plate_discipline: 0.5, hitting_contact: 0.5 } }
];
var FIELDING = [
  { id: "range", label: "Expand range", helpText: "Get to more balls \u2014 lateral and back-pedal coverage.", weightHints: { fielding_range: 0.7, fielding_first_step: 0.3 } },
  { id: "hands", label: "Clean hands (incl. glove-to-hand transfer)", helpText: "Receive the ball cleanly and move it smoothly from glove to hand.", weightHints: { fielding_hands: 0.8, throwing_transfer: 0.2 } },
  { id: "first_step", label: "First-step read", helpText: "Read the ball off the bat one step faster.", weightHints: { fielding_first_step: 0.8, fielding_pre_pitch: 0.2 }, retired: true },
  { id: "double_play", label: "Double-play turn", helpText: "Cleaner pivot, faster feed \u2014 middle-infield specialty.", weightHints: { fielding_double_play: 0.8, throwing_transfer: 0.2 }, retired: true },
  { id: "footwork", label: "Improve footwork", helpText: "Arrive balanced and put your feet in position for the play.", weightHints: { fielding_first_step: 0.6, fielding_range: 0.4 } },
  { id: "routine_plays", label: "Routine plays", helpText: "Make the everyday plays cleanly and consistently.", weightHints: { fielding_hands: 0.6, fielding_pre_pitch: 0.4 } },
  { id: "pre_pitch_routine", label: "Pre-pitch routine", helpText: "Set up early so the play is half-won before contact.", weightHints: { fielding_pre_pitch: 0.9 }, retired: true }
];
var PITCHING_BASEBALL = [
  { id: "command", label: "Command / zone %", helpText: "Hit your spots \u2014 strike one, edges, no give-up pitches.", weightHints: { pitching_command: 0.9 } },
  { id: "velocity", label: "Add velocity", helpText: "Climb the fastball \u2014 measured, replay-safe, never overthrown.", weightHints: { pitching_velocity: 0.7, strength_rotational: 0.3 } },
  { id: "secondary_pitch", label: "Develop a secondary pitch", helpText: "Build a true second weapon (curve, slider, change, split).", weightHints: { pitching_secondary: 0.9 } },
  { id: "pitch_mix", label: "Sequencing / pitch mix", helpText: "Use what you have on purpose \u2014 set up the put-away.", weightHints: { pitching_mix: 0.9 }, retired: true },
  { id: "stamina", label: "Stamina / pitch count", helpText: "Hold velo and command deeper into outings.", weightHints: { pitching_stamina: 0.7, speed_conditioning: 0.3 } },
  { id: "hold_runners", label: "Hold runners / pickoffs", helpText: "Vary times, hold the bag, take the running game away.", weightHints: { pitching_hold_runners: 0.9 } }
];
var PITCHING_SOFTBALL = [
  // Same as baseball MINUS hold_runners (no pickoffs in fastpitch).
  { id: "command", label: "Command / zone %", helpText: "Hit your spots \u2014 strike one, edges, no give-up pitches.", weightHints: { pitching_command: 0.9 } },
  { id: "velocity", label: "Add velocity", helpText: "Climb the fastball \u2014 measured, replay-safe, never overthrown.", weightHints: { pitching_velocity: 0.7, strength_rotational: 0.3 } },
  { id: "secondary_pitch", label: "Develop a secondary pitch", helpText: "Build a true second weapon (drop, rise, change, screw).", weightHints: { pitching_secondary: 0.9 } },
  { id: "pitch_mix", label: "Sequencing / pitch mix", helpText: "Use what you have on purpose \u2014 set up the put-away.", weightHints: { pitching_mix: 0.9 }, retired: true },
  { id: "stamina", label: "Stamina / pitch count", helpText: "Hold velo and command deeper into the circle.", weightHints: { pitching_stamina: 0.7, speed_conditioning: 0.3 } }
];
function subGoalsFor(sport, discipline, category) {
  if (category === "speed") return SPEED;
  if (category === "hitting") return HITTING;
  if (category === "fielding") return FIELDING;
  if (category === "throwing") {
    if (discipline === "pitcher") return [];
    return THROWING_POSITION;
  }
  if (category === "power") {
    return discipline === "pitcher" ? POWER_PITCHER : POWER_POSITION;
  }
  if (category === "pitching") {
    if (discipline !== "pitcher") return [];
    return sport === "softball" ? PITCHING_SOFTBALL : PITCHING_BASEBALL;
  }
  return [];
}
function legalSubGoalIds(sport, discipline, category) {
  return new Set(subGoalsFor(sport, discipline, category).map((g) => g.id));
}

// src/lib/hammer/goals/categoryGoals.ts
var CATEGORY_KEYS = ["speed", "power", "throwing", "hitting", "fielding"];
var CATEGORY_LABELS = {
  speed: "Speed",
  power: "Power",
  throwing: "Throwing",
  hitting: "Hitting",
  fielding: "Fielding"
};
var CATEGORY_INTENTS = {
  speed: [
    { id: "max_velocity", label: "Add top-end speed" },
    { id: "acceleration", label: "Sharper first 10 yards" },
    { id: "base_stealing", label: "Steal more bases" },
    { id: "conditioning", label: "Stay fast late in games" }
  ],
  power: [
    { id: "rotational_power", label: "Rotational power" },
    { id: "lower_body_strength", label: "Lower-body strength" },
    { id: "upper_body_strength", label: "Upper-body strength" },
    { id: "vertical_jump", label: "Vertical jump" }
  ],
  throwing: [
    { id: "velocity", label: "Add throwing velocity" },
    { id: "command", label: "Improve command" },
    { id: "arm_health", label: "Protect arm health" },
    { id: "pitching_arsenal", label: "Develop pitching arsenal" }
  ],
  hitting: [
    { id: "bat_speed", label: "Bat speed" },
    { id: "contact_quality", label: "Hard contact" },
    { id: "plate_discipline", label: "Plate discipline" },
    { id: "power_hitting", label: "Power / extra-base hits" }
  ],
  fielding: [
    { id: "range", label: "Expand range" },
    { id: "hands", label: "Cleaner hands" },
    { id: "footwork", label: "Footwork & first-step" },
    { id: "position_iq", label: "Position-specific IQ" }
  ]
};
var RANK_WEIGHT = { primary: 0.7, secondary: 0.3 };
function normalizePicks(sport, discipline, category, raw) {
  if (!Array.isArray(raw)) return [];
  const legal = legalSubGoalIds(sport, discipline, category);
  const seenIds = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item;
    if (typeof r.id !== "string" || !legal.has(r.id) || seenIds.has(r.id)) continue;
    const rank = r.rank === "secondary" ? "secondary" : "primary";
    const sideRaw = r.side;
    const side = sideRaw === "L" || sideRaw === "R" || sideRaw === "both" ? sideRaw : void 0;
    seenIds.add(r.id);
    out.push(side ? { id: r.id, rank, side } : { id: r.id, rank });
    if (out.length >= 2) break;
  }
  let primarySeen = false;
  return out.map((p) => {
    if (p.rank === "primary") {
      if (primarySeen) return { ...p, rank: "secondary" };
      primarySeen = true;
    }
    return p;
  });
}
function normalizeDiscipline(sport, discipline, raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  const out = {
    speed: normalizePicks(sport, discipline, "speed", r.speed),
    power: normalizePicks(sport, discipline, "power", r.power),
    throwing: normalizePicks(sport, discipline, "throwing", r.throwing),
    hitting: normalizePicks(sport, discipline, "hitting", r.hitting),
    fielding: normalizePicks(sport, discipline, "fielding", r.fielding),
    pitching: normalizePicks(sport, discipline, "pitching", r.pitching)
  };
  const hasAny2 = Object.values(out).some((v) => Array.isArray(v) && v.length > 0);
  return hasAny2 ? out : null;
}
function normalizeCategoryGoalsV2(raw) {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw;
  if (obj.version !== 2) return null;
  const categoryOrder = normalizeCategoryOrder(obj.categoryOrder);
  const baseball = obj.baseball && typeof obj.baseball === "object" ? {
    position: normalizeDiscipline("baseball", "position", obj.baseball.position) ?? void 0,
    pitcher: normalizeDiscipline("baseball", "pitcher", obj.baseball.pitcher) ?? void 0
  } : void 0;
  const softball = obj.softball && typeof obj.softball === "object" ? {
    position: normalizeDiscipline("softball", "position", obj.softball.position) ?? void 0,
    pitcher: normalizeDiscipline("softball", "pitcher", obj.softball.pitcher) ?? void 0
  } : void 0;
  const hasAny2 = !!(baseball?.position || baseball?.pitcher || softball?.position || softball?.pitcher);
  if (!hasAny2 && !categoryOrder) return null;
  return {
    version: 2,
    ...baseball ? { baseball } : {},
    ...softball ? { softball } : {},
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : (/* @__PURE__ */ new Date()).toISOString(),
    ...categoryOrder ? { categoryOrder } : {}
  };
}
function normalizeCategoryOrder(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const x of raw) {
    if (CATEGORY_KEYS.includes(x) && !out.includes(x)) out.push(x);
  }
  return out.length === CATEGORY_KEYS.length ? out : null;
}
function normalizeV1Raw(raw) {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw;
  const list2 = Array.isArray(obj.goals) ? obj.goals : Array.isArray(raw) ? raw : null;
  if (!list2) return null;
  const seen = /* @__PURE__ */ new Set();
  const goals = [];
  for (const item of list2) {
    if (!item || typeof item !== "object") continue;
    const r = item;
    if (typeof r.category !== "string") continue;
    const cat = r.category;
    if (!CATEGORY_KEYS.includes(cat) || seen.has(cat)) continue;
    if (typeof r.rank !== "number" || !Number.isFinite(r.rank)) continue;
    const intentRaw = typeof r.intent === "string" ? r.intent : null;
    const intentLegal = intentRaw && CATEGORY_INTENTS[cat].some((p) => p.id === intentRaw) ? intentRaw : null;
    seen.add(cat);
    goals.push({
      category: cat,
      rank: Math.round(r.rank),
      intent: intentLegal,
      notes: typeof r.notes === "string" ? r.notes : null
    });
  }
  if (goals.length !== CATEGORY_KEYS.length) return null;
  goals.sort((a, b) => a.rank - b.rank);
  const canonical = goals.map((g, i) => ({ ...g, rank: i + 1 }));
  return {
    version: 1,
    goals: canonical,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}
function v2ToV1(v2) {
  const score = { speed: 0, power: 0, throwing: 0, hitting: 0, fielding: 0 };
  const firstIntent = {};
  const accept = (disc, sport, dg) => {
    if (!dg) return;
    const consume = (cat, picks) => {
      if (!picks) return;
      for (const p of picks) {
        score[cat] += RANK_WEIGHT[p.rank];
        if (!firstIntent[cat]) firstIntent[cat] = p.id;
      }
    };
    consume("speed", dg.speed);
    consume("power", dg.power);
    consume("hitting", dg.hitting);
    consume("fielding", dg.fielding);
    if (disc === "pitcher") {
      consume("throwing", dg.pitching);
    } else {
      consume("throwing", dg.throwing);
    }
    void sport;
  };
  if (v2.baseball) {
    accept("position", "baseball", v2.baseball.position);
    accept("pitcher", "baseball", v2.baseball.pitcher);
  }
  if (v2.softball) {
    accept("position", "softball", v2.softball.position);
    accept("pitcher", "softball", v2.softball.pitcher);
  }
  const ordered = v2.categoryOrder ? [...v2.categoryOrder] : Object.keys(score).sort((a, b) => {
    if (score[b] !== score[a]) return score[b] - score[a];
    return CATEGORY_KEYS.indexOf(a) - CATEGORY_KEYS.indexOf(b);
  });
  const goals = ordered.map((cat, i) => ({
    category: cat,
    rank: i + 1,
    intent: firstIntent[cat] ?? null
  }));
  return { version: 1, goals, updatedAt: v2.updatedAt };
}
function normalizeCategoryGoals(raw) {
  const v2 = normalizeCategoryGoalsV2(raw);
  if (v2) return v2ToV1(v2);
  return normalizeV1Raw(raw);
}
function rankedCategories(payload) {
  if (!payload) return [];
  return payload.goals.slice().sort((a, b) => a.rank - b.rank).map((g) => g.category);
}
function rankFor(payload, category) {
  if (!payload) return null;
  const g = payload.goals.find((x) => x.category === category);
  return g ? g.rank : null;
}
function intentFor(payload, category) {
  if (!payload) return null;
  const g = payload.goals.find((x) => x.category === category);
  return g?.intent ?? null;
}
function modalityToCategory(modality) {
  switch (modality) {
    case "speed":
    case "baserunning":
      return "speed";
    case "strength":
      return "power";
    case "throwing":
      return "throwing";
    case "hitting":
      return "hitting";
    case "defense":
      return "fielding";
    default:
      return null;
  }
}

// src/lib/hammer/positions/positionNormalizer.ts
var POSITION_TOKEN_SEPARATOR = /[,;/|\n]+/;
var OBJECT_POSITION_KEYS = [
  "value",
  "label",
  "position",
  "code",
  "name",
  "id",
  "primary_position",
  "secondary_position"
];
function pushToken(tokens, seen, raw) {
  const cleaned = raw.trim();
  if (!cleaned) return;
  const key2 = cleaned.toUpperCase();
  if (seen.has(key2)) return;
  seen.add(key2);
  tokens.push(cleaned);
}
function coercePositionTokens(value) {
  const tokens = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (input, depth) => {
    if (depth > 5 || input == null) return;
    if (typeof input === "string") {
      input.split(POSITION_TOKEN_SEPARATOR).forEach((part) => pushToken(tokens, seen, part));
      return;
    }
    if (typeof input === "number") {
      pushToken(tokens, seen, String(input));
      return;
    }
    if (Array.isArray(input)) {
      input.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof input === "object") {
      const record2 = input;
      for (const key2 of OBJECT_POSITION_KEYS) {
        if (key2 in record2) visit(record2[key2], depth + 1);
      }
    }
  };
  visit(value, 0);
  return tokens;
}
function firstPositionToken(value) {
  return coercePositionTokens(value)[0] ?? null;
}
function positionTokenIsPitcher(value) {
  return coercePositionTokens(value).some((token) => {
    const p = token.toLowerCase().trim();
    return p === "p" || p === "sp" || p === "rp" || p === "cp" || p.includes("pitch");
  });
}

// src/lib/hammer/roadmap/skillFrequencyLadder.ts
var SKILL_MODALITIES = [
  "hitting",
  "throwing",
  "defense",
  "baserunning"
];
var SKILL_DAYS_CEILING = 6;
var POSITION_LADDER = {
  hitting: { foundation: 3, build: 4, bridge: 5, peak: 6, sustain: 6 },
  throwing: { foundation: 3, build: 4, bridge: 5, peak: 6, sustain: 6 },
  defense: { foundation: 2, build: 3, bridge: 4, peak: 5, sustain: 6 },
  baserunning: { foundation: 1, build: 2, bridge: 3, peak: 4, sustain: 6 }
};
var PITCHER_THROWING_LADDER = {
  foundation: 3,
  build: 4,
  bridge: 4,
  peak: 5,
  sustain: 5
};
function isPitcher(position) {
  return positionTokenIsPitcher(position);
}
var LEG_INJURIES = /* @__PURE__ */ new Set(["hamstring", "ankle", "knee", "groin", "quad"]);
var ARM_INJURIES = /* @__PURE__ */ new Set(["shoulder", "ucl", "elbow", "labrum", "rotator"]);
function resolveSkillDaysTarget(rung, modality, position, injuryRegions = [], lifecycleBand = null, liftingAgeYears = null) {
  let target = modality === "throwing" && isPitcher(position) ? PITCHER_THROWING_LADDER[rung] : POSITION_LADDER[modality][rung];
  const youngBand = lifecycleBand === "u10" || lifecycleBand === "u12" || lifecycleBand === "u14";
  const lowLiftingAge = typeof liftingAgeYears === "number" && liftingAgeYears < 1;
  if (youngBand || lowLiftingAge) {
    const bridgeTarget = modality === "throwing" && isPitcher(position) ? PITCHER_THROWING_LADDER.bridge : POSITION_LADDER[modality].bridge;
    target = Math.min(target, bridgeTarget);
  }
  const hasLeg = injuryRegions.some((r) => LEG_INJURIES.has(r.trim().toLowerCase()));
  const hasArm = injuryRegions.some((r) => ARM_INJURIES.has(r.trim().toLowerCase()));
  if ((modality === "defense" || modality === "baserunning") && hasLeg) {
    target = Math.min(target, 2);
  }
  if (modality === "throwing" && hasArm) {
    target = Math.min(target, 2);
  }
  return Math.max(0, Math.min(SKILL_DAYS_CEILING, target));
}
function projectSkillLadder(rung, nextRung, proj, position, earnedDaysByModality) {
  return SKILL_MODALITIES.map((m) => {
    const target = resolveSkillDaysTarget(
      rung,
      m,
      position,
      proj.injuryRegions,
      proj.lifecycleBand,
      proj.liftingAgeYears
    );
    const nextTarget = nextRung === null ? null : resolveSkillDaysTarget(
      nextRung,
      m,
      position,
      proj.injuryRegions,
      proj.lifecycleBand,
      proj.liftingAgeYears
    );
    const earned = Math.max(0, Math.min(SKILL_DAYS_CEILING, earnedDaysByModality[m] ?? 0));
    const rationale = buildRationale(m, target, earned, nextTarget);
    return { modality: m, target, earned, nextRungTarget: nextTarget, rationale };
  });
}
function buildRationale(m, target, earned, nextTarget) {
  if (target === 0) {
    return `${label(m)} is fully suppressed today \u2014 safety-first floors are protecting you.`;
  }
  const base2 = `${label(m)}: aim for ${target}/wk \u2014 you've hit ${earned}/7 in the last week.`;
  if (nextTarget !== null && nextTarget > target) {
    return `${base2} Next rung targets ${nextTarget}/wk \u2014 stack the days first, intensity follows.`;
  }
  if (target === SKILL_DAYS_CEILING) {
    return `${base2} You're at the pro daily cadence \u2014 hold this rhythm and self-regulate intensity.`;
  }
  return base2;
}
function label(m) {
  return m === "baserunning" ? "Baserunning" : m.charAt(0).toUpperCase() + m.slice(1);
}

// src/lib/hammer/prescription/weeklyMicrocycle.ts
var SCHEDULABLE_MODALITIES = [
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning"
];
var ANCHOR_MODALITIES = [
  "warmup",
  "fueling",
  "recovery",
  "game_iq"
];
var DOW_SHORT = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};
var OFF_SEASON_5D = {
  id: "off_5d",
  label: "Off-season \xB7 5-day build",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [2, 5],
    // Tue, Fri
    strength: [1, 2, 4, 5],
    // Mon, Tue, Thu, Fri
    hitting: [1, 2, 4, 5, 6],
    // Mon, Tue, Thu, Fri, Sat
    throwing: [1, 2, 4, 5, 6],
    defense: [2, 4, 6],
    // Tue, Thu, Sat
    baserunning: [5, 6]
    // Fri, Sat
  },
  intensityOverrides: {
    hitting: { 6: "secondary" },
    // Sat: skill volume, not max
    throwing: { 6: "secondary" },
    speed: { 5: "secondary" }
    // Fri: accel base, not max-vel again
  },
  dayLabels: {
    strength: { 1: "Heavy lower", 2: "Upper push", 4: "Heavy upper", 5: "Lower dynamic" },
    speed: { 2: "Max velocity", 5: "Acceleration base" }
  },
  priorityDayOrder: {
    hitting: [1, 4, 6, 2, 5, 3, 0],
    throwing: [1, 4, 6, 2, 5, 3, 0],
    defense: [2, 4, 6, 1, 5, 3, 0],
    baserunning: [5, 6, 3, 1, 4, 2, 0]
  }
};
var OFF_SEASON_4D = {
  id: "off_4d",
  label: "Off-season \xB7 4-day build",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [2, 5],
    strength: [1, 2, 4, 5],
    hitting: [1, 2, 4, 5],
    throwing: [1, 2, 4, 5],
    defense: [2, 4],
    baserunning: [5]
  },
  dayLabels: {
    strength: { 1: "Heavy lower", 2: "Upper", 4: "Heavy upper", 5: "Lower dynamic" },
    speed: { 2: "Max velocity", 5: "Acceleration" }
  },
  priorityDayOrder: {
    hitting: [1, 4, 2, 5, 6, 3, 0],
    throwing: [1, 4, 2, 5, 6, 3, 0],
    defense: [2, 4, 6, 1, 5, 3, 0],
    baserunning: [5, 6, 3, 1, 4, 2, 0]
  }
};
var PRE_SEASON_5D = {
  id: "pre_5d",
  label: "Pre-season \xB7 sharpen",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [1, 3, 5],
    strength: [1, 3, 5],
    hitting: [1, 2, 3, 4, 5],
    throwing: [1, 2, 3, 4, 5],
    defense: [2, 4, 6],
    baserunning: [3, 6]
  },
  intensityOverrides: {
    strength: { 5: "secondary" },
    speed: { 5: "secondary" }
  },
  dayLabels: {
    strength: { 1: "Heavy full-body", 3: "Dynamic effort", 5: "Repetition effort" },
    speed: { 1: "Acceleration", 3: "Max velocity", 5: "Tempo / freshness" }
  },
  priorityDayOrder: {
    hitting: [1, 3, 5, 2, 4, 6, 0],
    throwing: [1, 3, 5, 2, 4, 6, 0],
    defense: [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0]
  }
};
var IN_SEASON = {
  id: "in_season",
  label: "In-season \xB7 preserve & compete",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [2],
    // Tue freshness only
    strength: [1, 4],
    // Mon + Thu maintenance
    hitting: [1, 2, 3, 4, 5, 6],
    throwing: [1, 2, 3, 4, 5],
    defense: [2, 4],
    baserunning: [3]
  },
  intensityOverrides: {
    hitting: {
      1: "secondary",
      2: "activation",
      3: "secondary",
      4: "activation",
      5: "secondary",
      6: "activation"
    },
    throwing: {
      1: "secondary",
      2: "activation",
      3: "secondary",
      4: "activation",
      5: "activation"
    },
    strength: { 1: "secondary", 4: "secondary" },
    speed: { 2: "activation" }
  },
  dayLabels: {
    strength: { 1: "Maintenance", 4: "Maintenance" },
    speed: { 2: "Freshness (short reps)" }
  },
  priorityDayOrder: {
    hitting: [1, 3, 5, 2, 4, 6, 0],
    throwing: [1, 3, 5, 2, 4, 6, 0],
    defense: [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0]
  }
};
var POST_SEASON = {
  id: "post_season",
  label: "Post-season \xB7 recover & rebuild base",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [3],
    strength: [2, 5],
    hitting: [2, 5],
    throwing: [3],
    defense: [5],
    baserunning: []
  },
  intensityOverrides: {
    strength: { 2: "secondary", 5: "secondary" },
    speed: { 3: "activation" },
    hitting: { 2: "activation", 5: "activation" },
    throwing: { 3: "activation" }
  },
  dayLabels: {
    strength: { 2: "Rebuild base", 5: "Rebuild base" }
  },
  priorityDayOrder: {
    hitting: [2, 5, 3, 1, 4, 6, 0],
    throwing: [3, 1, 5, 2, 4, 6, 0],
    defense: [5, 2, 4, 6, 1, 3, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0]
  }
};
var YOUTH = {
  id: "youth",
  label: "Youth \xB7 motor learning",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [2, 4],
    strength: [1, 4],
    // 2× only, movement quality
    hitting: [1, 2, 3, 4, 5],
    throwing: [1, 2, 3, 4, 5],
    defense: [2, 4, 6],
    baserunning: [3, 6]
  },
  intensityOverrides: {
    strength: { 1: "secondary", 4: "secondary" },
    speed: { 2: "activation", 4: "activation" }
  },
  dayLabels: {
    strength: { 1: "Movement quality", 4: "Movement quality" },
    speed: { 2: "Short ATP-CP", 4: "Short ATP-CP" }
  },
  priorityDayOrder: {
    hitting: [1, 3, 5, 2, 4, 6, 0],
    throwing: [1, 3, 5, 2, 4, 6, 0],
    defense: [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0]
  }
};
var PERMISSIVE_DAILY = {
  id: "permissive",
  label: "Everyday \xB7 unclassified",
  perModality: {
    warmup: [0, 1, 2, 3, 4, 5, 6],
    fueling: [0, 1, 2, 3, 4, 5, 6],
    recovery: [0, 1, 2, 3, 4, 5, 6],
    game_iq: [0, 1, 2, 3, 4, 5, 6],
    speed: [1, 3, 5],
    strength: [1, 2, 4, 5],
    hitting: [1, 2, 3, 4, 5, 6],
    throwing: [1, 2, 3, 4, 5, 6],
    defense: [2, 4, 6],
    baserunning: [3, 6]
  },
  priorityDayOrder: {
    hitting: [1, 3, 5, 2, 4, 6, 0],
    throwing: [1, 3, 5, 2, 4, 6, 0],
    defense: [2, 4, 6, 1, 3, 5, 0],
    baserunning: [3, 6, 1, 5, 2, 4, 0]
  }
};
function resolveWeeklyTemplate(proj) {
  const band = proj.lifecycleBand;
  const youngBand = band === "u10" || band === "u12" || band === "u14";
  const lowLiftingAge = typeof proj.liftingAgeYears === "number" && proj.liftingAgeYears < 1;
  if (youngBand || lowLiftingAge) return YOUTH;
  const phase = proj.seasonPhase;
  const days = proj.weeklyAvailabilityDays;
  if (phase === "in") return IN_SEASON;
  if (phase === "post") return POST_SEASON;
  if (phase === "pre") return PRE_SEASON_5D;
  if (phase === "off") {
    if (typeof days === "number" && days <= 4) return OFF_SEASON_4D;
    return OFF_SEASON_5D;
  }
  return PERMISSIVE_DAILY;
}
function nextScheduled(today, dows) {
  if (dows.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const d2 = (today + i) % 7;
    if (dows.includes(d2)) return d2;
  }
  return null;
}
function daysUntil(today, target) {
  return (target - today + 7) % 7 || 7;
}
function orderedFromToday(dows, today) {
  const sorted = [...new Set(dows)].sort((a, b) => a - b);
  const rotated = [...sorted.filter((d2) => d2 >= today), ...sorted.filter((d2) => d2 < today)];
  return rotated;
}
function todayPositionLabel(dows, today) {
  const uniq = [...new Set(dows)].sort((a, b) => a - b);
  const idx = uniq.indexOf(today);
  if (idx === -1) return "";
  return `Day ${idx + 1} of ${uniq.length}`;
}
function resolveSkillDays(template, modality, target) {
  const baselineArr = template.perModality[modality] ?? [];
  const baseline = [...new Set(baselineArr)].sort((a, b) => a - b);
  const priority = template.priorityDayOrder?.[modality] ?? baseline;
  const clamped = Math.max(0, Math.min(SKILL_DAYS_CEILING, target));
  const picked = [];
  for (const d2 of priority) {
    if (picked.length >= clamped) break;
    if (!picked.includes(d2)) picked.push(d2);
  }
  for (let d2 = 0; picked.length < clamped && d2 <= 6; d2 = d2 + 1) {
    if (!picked.includes(d2)) picked.push(d2);
    if (d2 === 6) break;
  }
  const baselineSet = new Set(baseline);
  const overflowDays = picked.filter((d2) => !baselineSet.has(d2));
  return { days: picked, baseline, overflowDays };
}
function applyMicrocycle(template, today, skillTargets = {}) {
  const dow = today.getDay();
  const perModality = {};
  const skillDays = {};
  const allKeys = [
    ...ANCHOR_MODALITIES,
    ...SCHEDULABLE_MODALITIES
  ];
  for (const m of allKeys) {
    const isSkill = SKILL_MODALITIES.includes(m);
    let dows;
    let overflowSet;
    if (isSkill && skillTargets[m] !== void 0) {
      const resolved = resolveSkillDays(template, m, skillTargets[m]);
      dows = resolved.days;
      overflowSet = new Set(resolved.overflowDays);
      skillDays[m] = resolved.days;
    } else {
      dows = template.perModality[m] ?? [];
      overflowSet = /* @__PURE__ */ new Set();
      if (isSkill) skillDays[m] = dows;
    }
    const isScheduled = dows.includes(dow);
    const isAnchor = ANCHOR_MODALITIES.includes(m);
    if (isAnchor) {
      perModality[m] = {
        scheduled: true,
        intensity: "primary",
        microcycleLabel: template.label,
        nextScheduledDow: dow,
        nextScheduledLabel: "Today",
        reason: template.label
      };
      continue;
    }
    if (!isScheduled) {
      const nxt2 = nextScheduled(dow, dows);
      const label2 = nxt2 === null ? "not scheduled this cycle" : (() => {
        const dd = daysUntil(dow, nxt2);
        return dd === 1 ? `tomorrow (${DOW_SHORT[nxt2]})` : `${DOW_SHORT[nxt2]} \xB7 in ${dd} days`;
      })();
      const dayList = orderedFromToday(dows, dow).map((d2) => DOW_SHORT[d2]).join(" \xB7 ");
      perModality[m] = {
        scheduled: false,
        intensity: "off",
        microcycleLabel: `${template.label} \u2014 off today`,
        nextScheduledDow: nxt2,
        nextScheduledLabel: nxt2 === null ? null : DOW_SHORT[nxt2],
        reason: nxt2 === null ? `Not scheduled this cycle in the ${template.label} template.` : `Next ${m}: ${label2}. Weekly slots: ${dayList || "none"}. CNS spacing keeps you fresh.`
      };
      continue;
    }
    const isOverflowToday = overflowSet.has(dow);
    const templateIntensity = template.intensityOverrides?.[m]?.[dow] ?? "primary";
    const intensity = isOverflowToday ? "activation" : templateIntensity;
    const accent = template.dayLabels?.[m]?.[dow];
    const position = todayPositionLabel(dows, dow);
    const overflowNote = isOverflowToday ? " \xB7 earned overflow (activation only)" : "";
    const microcycleLabel = accent ? `${position} \xB7 ${accent}${overflowNote}` : `${position}${overflowNote}`;
    const nxt = nextScheduled(dow, dows);
    const nxtLabel = nxt === null || nxt === dow ? null : (() => {
      const dd = daysUntil(dow, nxt);
      return dd === 1 ? `Next ${m}: tomorrow (${DOW_SHORT[nxt]})` : `Next ${m}: ${DOW_SHORT[nxt]} (in ${dd} days)`;
    })();
    perModality[m] = {
      scheduled: true,
      intensity,
      microcycleLabel,
      nextScheduledDow: nxt,
      nextScheduledLabel: nxt === null ? null : DOW_SHORT[nxt],
      reason: intensity === "primary" ? `${microcycleLabel}${nxtLabel ? ` \xB7 ${nxtLabel}.` : "."}` : `${microcycleLabel} \xB7 ${intensity === "activation" ? "activation dose (~30%)" : "secondary dose (~60%)"}${nxtLabel ? ` \xB7 ${nxtLabel}` : ""}.`
    };
  }
  return { template, today: dow, perModality, skillDays };
}
function projectWeeklyRoadmap(template, today, skillTargets = {}) {
  const todayDow = today.getDay();
  const skillDays = {};
  const skillOverflow = {};
  for (const sm of SKILL_MODALITIES) {
    if (skillTargets[sm] === void 0) continue;
    const r = resolveSkillDays(template, sm, skillTargets[sm]);
    skillDays[sm] = r.days;
    skillOverflow[sm] = new Set(r.overflowDays);
  }
  const days = [];
  for (let d2 = 0; d2 <= 6; d2 = d2 + 1) {
    const modalities = SCHEDULABLE_MODALITIES.flatMap((m) => {
      const isSkill = SKILL_MODALITIES.includes(m);
      const dows = isSkill && skillDays[m] !== void 0 ? skillDays[m] : template.perModality[m] ?? [];
      if (!dows.includes(d2)) return [];
      const isOverflow = isSkill && (skillOverflow[m]?.has(d2) ?? false);
      const intensity = isOverflow ? "activation" : template.intensityOverrides?.[m]?.[d2] ?? "primary";
      const accent = template.dayLabels?.[m]?.[d2] ?? null;
      return [{ key: m, intensity, accent }];
    });
    days.push({
      dow: d2,
      short: DOW_SHORT[d2],
      isToday: d2 === todayDow,
      modalities,
      restDay: modalities.length === 0
    });
    if (d2 === 6) break;
  }
  return days;
}

// src/lib/hammer/prescription/weeklyGoalBlocks.ts
function weeklyGoalBlocks(template, baseline, proj, position, included) {
  const targets = { ...baseline };
  const ranks = rankedCategories(proj.categoryGoals);
  const top = ranks[0];
  const modality = SKILL_MODALITIES.find((m) => modalityToCategory(m) === top && included.has(m));
  if (!top) return { template, targets, modality: null, reason: null };
  const label2 = CATEGORY_LABELS[top];
  if (!modality) return {
    template,
    targets,
    modality: null,
    reason: `${label2} is your top goal. No extra skill block fits this category; lifting stays unchanged.`
  };
  const current = baseline[modality];
  if (current === void 0) return { template, targets, modality, reason: null };
  const ceiling = resolveSkillDaysTarget("sustain", modality, position, proj.injuryRegions, proj.lifecycleBand, proj.liftingAgeYears);
  const existing = resolveSkillDays(template, modality, current).days;
  const trainingDays = new Set(SCHEDULABLE_MODALITIES.filter((m) => included.has(m)).flatMap((m) => {
    const skill = SKILL_MODALITIES.find((s) => s === m);
    return skill ? resolveSkillDays(template, skill, baseline[skill] ?? 0).days : template.perModality[m];
  }));
  const availability = proj.weeklyAvailabilityDays;
  const extra = template.perModality[modality].find((d2) => !existing.includes(d2) && trainingDays.has(d2));
  const protectedContext = proj.workloadHigh || proj.readinessScore !== null && proj.readinessScore < 0.5 || proj.parentSupremacyActive || proj.injuryRegions.length > 0;
  const allowed = current < ceiling && extra !== void 0 && !protectedContext && availability !== null && trainingDays.size <= availability && proj.seasonPhase !== "post";
  if (!allowed) return {
    template,
    targets,
    modality,
    reason: `${label2} is your top goal. An extra weekly skill block cannot fit the current phase, rest or day limits; your baseline stays.`
  };
  targets[modality] = current + 1;
  const next = {
    ...template,
    priorityDayOrder: { ...template.priorityDayOrder, [modality]: [...existing, extra] },
    intensityOverrides: {
      ...template.intensityOverrides,
      [modality]: { ...template.intensityOverrides?.[modality], [extra]: "activation" }
    }
  };
  return {
    template: next,
    targets,
    modality,
    reason: `${label2} is your top goal: one extra light skill block this week, inside your existing training days. Rest and throwing limits still win.`
  };
}
function secondGoalFirst(blocks, proj) {
  const second = rankedCategories(proj.categoryGoals)[1];
  if (!second) return blocks;
  const skillSet = new Set(SKILL_MODALITIES);
  const slots = blocks.map((b, i) => b.status === "ready" && skillSet.has(b.modality) ? i : -1).filter((i) => i >= 0);
  const shared = slots.map((i) => blocks[i]);
  if (shared.length < 2 || !shared.some((b) => modalityToCategory(b.modality) === second)) return blocks;
  shared.sort((a, b) => Number(modalityToCategory(b.modality) === second) - Number(modalityToCategory(a.modality) === second));
  const out = [...blocks];
  slots.forEach((slot, i) => {
    out[slot] = shared[i];
  });
  return out;
}

// src/utils/tierAccess.ts
function hasFeatureAccess(modules, feature) {
  return modules.some((m) => {
    switch (feature) {
      case "hitting":
        return m.includes("hitting") || m.includes("5tool") || m.includes("golden2way");
      case "pitching":
        return m.includes("pitching") || m.includes("pitcher") || m.includes("golden2way");
      case "throwing":
        return m.includes("throwing") || m.includes("5tool") || m.includes("golden2way");
      default:
        return false;
    }
  });
}

// supabase/functions/_shared/analysisTypes.ts
var ANALYSIS_TYPES = ["hitting", "pitching", "throwing"];

// src/lib/assessment/initialAssessment.ts
function requiredAnalyses(modules) {
  const m = [...modules];
  return ANALYSIS_TYPES.filter((f) => hasFeatureAccess(m, f));
}

// src/lib/hammer/priorityAccess.ts
function priorityAccess(modules, sport) {
  const included = requiredAnalyses(modules.filter((module) => module.startsWith(`${sport}_`)));
  return {
    hasPitching: included.includes("pitching"),
    hasHitting: included.includes("hitting"),
    hasThrowing: included.includes("throwing")
  };
}

// src/lib/hammer/prescription/skillSessionStructure.ts
function structureSkillSession(steps, options) {
  if (!steps.length) return [];
  const rank = { prep: 0, drills: 1, full_go: 2, log: 3 };
  const sort = (rows2) => rows2.map((step, index) => ({ step, index })).sort((a, b) => rank[a.step.stage ?? "drills"] - rank[b.step.stage ?? "drills"] || a.index - b.index).map(({ step }) => step);
  if (options.skill === "hitting") return sort([...steps]);
  const clearSpace = options.owned.has("field") || options.owned.has("open_space");
  const canExecute = clearSpace && !options.recoveryDay && options.injuryRegions.length === 0;
  const eligible = (step) => step.prescriptionOrigin !== "owner" && (options.skill === "baserunning" ? step.executionKind === "baserunning_scenarios" : options.owned.has("glove") && options.owned.has("ball") && step.executionKind === "fielding_reads");
  let executionIndex = -1;
  if (canExecute && (options.skill === "baserunning" || options.skill === "defense")) {
    executionIndex = steps.findIndex((step, index) => index > 0 && eligible(step));
    if (executionIndex === -1 && steps.length > 1 && eligible(steps[0])) executionIndex = 0;
  }
  const prepIndex = executionIndex === 0 ? 1 : 0;
  const structured = steps.map((step, index) => {
    if (index !== executionIndex) return { ...step, stage: index === prepIndex ? "prep" : "drills" };
    const executionCue = options.skill === "baserunning" ? options.sport === "softball" ? "Use these same scenario reps at game speed on a safe field. Leave the base only when the pitch is released; read the ball, then commit. No extra sprints or slides." : "Use these same scenario reps at game speed on a safe field. Read the pitcher and the ball, then commit to your jump or tag-up. No extra sprints or slides." : "Use these same reps for live reads: a partner rolls or tosses the ball; alone, use self-rolls or self-tosses. Read, move, field and exchange at game speed. Do not add throws; any throw stays inside today\u2019s throwing plan.";
    return {
      ...step,
      stage: "full_go",
      setup: [step.setup, executionCue].filter(Boolean).join(" "),
      cue: [step.cue, "Every rep with intent; reset fully between reps."].filter(Boolean).join(" "),
      stopIf: [step.stopIf, "Pain, slipping, slower reactions or loss of control \u2014 stop the game-speed round."].filter(Boolean).join(" ")
    };
  });
  return sort(structured);
}

// src/lib/hammer/prescription/practiceDoseAdjustment.ts
function reducedSetsWithinFloor(sets, minimumSets) {
  const floor = minimumSets !== null && Number.isInteger(minimumSets) && minimumSets >= 1 ? minimumSets : 0;
  return Math.max(floor, Math.ceil(sets * 0.5), Math.round(sets * 0.7));
}

// src/lib/hammer/prescription/practicePlanContext.ts
function reduceDosageForPractice(dosage) {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = parseInt(m[1], 10);
  const reduced = reducedSetsWithinFloor(sets, null);
  if (reduced >= sets) return dosage;
  return dosage.replace(/^(\d+)/, String(reduced));
}
function reduceDrill(step) {
  const stage = step.stage ?? "drills";
  if (stage !== "drills") return step;
  const dosage = reduceDosageForPractice(step.dosage);
  return dosage === step.dosage ? step : { ...step, dosage };
}
function applyPracticePlanContext(blocks, loads) {
  return blocks.map((block) => {
    if (block.status !== "ready" || block.modality === "strength" || block.modality === "recovery") return block;
    const category = block.modality === "defense" ? "fielding" : block.modality;
    const module = new URL(block.route, "https://local.invalid").searchParams.get("module");
    const exactCategory = category === "throwing" && module === "pitching" ? "pitching" : category;
    const load = loads.find((row) => row.category === exactCategory);
    if (!load) return block;
    if (!load.heavyStretch) {
      return { ...block, practiceContext: {
        category: load.category,
        sourceIds: [...load.sourceIds],
        sessions: load.sessions,
        minutes: load.minutes,
        intensityMinutes: load.intensityMinutes,
        missingMinutes: load.missingMinutes,
        missingIntensity: load.missingIntensity,
        consecutiveDays: load.consecutiveDays,
        doseChanged: false
      } };
    }
    const drills = block.drills.map(reduceDrill);
    const doseChanged = drills.some((drill, i) => drill.dosage !== block.drills[i]?.dosage);
    return {
      ...block,
      drills,
      practiceContext: {
        category: load.category,
        sourceIds: [...load.sourceIds],
        sessions: load.sessions,
        minutes: load.minutes,
        intensityMinutes: load.intensityMinutes,
        missingMinutes: load.missingMinutes,
        missingIntensity: load.missingIntensity,
        consecutiveDays: load.consecutiveDays,
        doseChanged
      },
      because: [...block.because ?? [], doseChanged ? `Because you logged ${load.consecutiveDays} ${exactCategory} practice days in a row, today's ${exactCategory} drills are lighter \u2014 never below half the prescribed sets. Full-go work and today's rest and stop rules still apply.` : `Because you logged ${load.consecutiveDays} ${exactCategory} practice days in a row. Today's existing rest and stop rules still apply.`],
      roadmapReason: doseChanged ? `${block.roadmapReason} Logged ${exactCategory} practice streak; drill sets cut about 30% within their floors.` : `${block.roadmapReason} Logged ${exactCategory} practice streak checked; dose unchanged because this row has no declared minimum.`
    };
  });
}

// src/lib/hammer/prescription/categoryPracticeLoad.ts
var CATEGORIES = ["hitting", "pitching", "throwing", "fielding", "baserunning", "speed"];
var dayNumber = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const n = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date ? Math.floor(n / 864e5) : NaN;
};
function categoryPracticeLoads(records, today, sport) {
  const now = dayNumber(today);
  if (!Number.isFinite(now)) return [];
  const unique = /* @__PURE__ */ new Map();
  const conflicts = /* @__PURE__ */ new Set();
  for (const record2 of records) {
    if (!record2.id.trim()) continue;
    const previous = unique.get(record2.id);
    if (previous && (previous.date !== record2.date || previous.sport !== record2.sport || previous.category !== record2.category || previous.minutes !== record2.minutes || previous.intensity !== record2.intensity || Boolean(previous.deleted) !== Boolean(record2.deleted))) {
      conflicts.add(record2.id);
    }
    unique.set(record2.id, record2);
  }
  for (const [id, record2] of unique) {
    const age = now - dayNumber(record2.date);
    if (conflicts.has(id) || record2.deleted || record2.sport !== sport || !record2.category || !CATEGORIES.includes(record2.category) || !(age >= 1 && age <= 7)) unique.delete(id);
  }
  return CATEGORIES.flatMap((category) => {
    const rows2 = [...unique.values()].filter((row) => row.category === category);
    if (!rows2.length) return [];
    const days = new Set(rows2.map((row) => dayNumber(row.date)));
    let consecutiveDays = 0;
    while (days.has(now - consecutiveDays - 1)) consecutiveDays++;
    let minutes = 0, intensityMinutes = 0, missingMinutes = 0, missingIntensity = 0;
    for (const row of rows2) {
      const validMinutes = row.minutes !== null && Number.isFinite(row.minutes) && row.minutes > 0;
      const validIntensity = row.intensity !== null && Number.isFinite(row.intensity) && row.intensity >= 1 && row.intensity <= 10;
      if (validMinutes) minutes += row.minutes ?? 0;
      else missingMinutes++;
      if (!validIntensity) missingIntensity++;
      if (validMinutes && validIntensity) intensityMinutes += (row.minutes ?? 0) * (row.intensity ?? 0);
    }
    return [{ category, sessions: rows2.length, minutes, intensityMinutes, missingMinutes, missingIntensity, consecutiveDays, heavyStretch: consecutiveDays >= 3, sourceIds: rows2.map((row) => row.id) }];
  });
}

// src/lib/hammer/context/normalizers.ts
function normalizeInjuryHistory(raw) {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "no") return [];
    return [{ note: s }];
  }
  if (Array.isArray(raw)) {
    const out = [];
    for (const entry of raw) {
      if (entry == null) continue;
      if (typeof entry === "string") {
        const s = entry.trim();
        if (s !== "") out.push({ note: s });
        continue;
      }
      if (typeof entry === "object") {
        const o = entry;
        const note = typeof o.note === "string" ? o.note : typeof o.region === "string" ? o.region : "";
        const trimmed = note.trim();
        if (trimmed === "") continue;
        out.push({
          note: trimmed,
          reported_at: typeof o.reported_at === "string" ? o.reported_at : void 0,
          region: typeof o.region === "string" ? o.region : void 0,
          severity: typeof o.severity === "string" ? o.severity : void 0,
          recovery_status: typeof o.recovery_status === "string" ? o.recovery_status : void 0
        });
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    const o = raw;
    if (typeof o.note === "string" && o.note.trim() !== "") {
      return [{ note: o.note.trim() }];
    }
  }
  return [];
}
function injuryHistoryToText(raw) {
  const entries = normalizeInjuryHistory(raw);
  if (entries.length === 0) return "";
  return entries.map(
    (e) => [e.note, e.region, e.severity, e.recovery_status].filter(Boolean).join(" ")
  ).join(" ").toLowerCase();
}

// src/lib/hammer/context/decisionFilters.ts
var MINOR_BANDS = /* @__PURE__ */ new Set(["u10", "u12", "u14", "u16", "u18"]);
var KNOWN_INJURY_REGIONS = [
  "shoulder",
  "ucl",
  "elbow",
  "wrist",
  "hand",
  "hip",
  "knee",
  "ankle",
  "foot",
  "back",
  "lumbar",
  "neck",
  "hamstring",
  "quad",
  "groin",
  "calf",
  "achilles"
];
function normalizeInjuryToText(raw) {
  const txt = injuryHistoryToText(raw);
  return txt === "" ? null : txt;
}
var VENUE_EQUIPMENT_TOKENS = /* @__PURE__ */ new Set([
  "full_gym",
  "commercial_gym",
  "home_gym",
  "bodyweight",
  "bands",
  "hotel",
  "field",
  "open_space",
  "cage",
  "garage",
  "school_gym"
]);
function projectEnvelope(ctx) {
  const entry = ctx.envelope?.equipment_effective ?? null;
  const eq = ctx.get("equipment_effective")?.value ?? entry?.value ?? null;
  const inventoryRaw = Array.isArray(eq) || typeof eq === "string" ? eq : typeof eq === "object" && eq !== null ? eq.equipment ?? null : null;
  const equipmentList = Array.isArray(inventoryRaw) ? inventoryRaw.map((e) => String(e)) : typeof inventoryRaw === "string" && inventoryRaw !== "" ? [inventoryRaw] : [];
  const eqObj = typeof eq === "object" && eq !== null && !Array.isArray(eq) ? eq : null;
  const venueFromEntry = eqObj?.venue ?? entry?.venue ?? null;
  const equipmentVenue = typeof venueFromEntry === "string" ? venueFromEntry : null;
  const equipment = equipmentVenue ?? equipmentList.find((t) => VENUE_EQUIPMENT_TOKENS.has(t)) ?? null;
  const scopeRaw = eqObj?.scope ?? entry?.scope ?? null;
  const equipmentScope = typeof scopeRaw === "string" ? scopeRaw : null;
  const injury = normalizeInjuryToText(ctx.get("injury_history")?.value);
  const injuryRegions = injury ? KNOWN_INJURY_REGIONS.filter((r) => injury.includes(r)) : [];
  const readinessRaw = ctx.get("readiness")?.value;
  const readinessScore = typeof readinessRaw === "number" ? readinessRaw : typeof readinessRaw?.score === "number" ? readinessRaw.score : null;
  const devPriorities = ctx.get("development_priorities")?.value ?? [];
  const workloadVal = ctx.get("workload")?.value;
  const workloadHigh = typeof workloadVal === "object" && workloadVal?.status === "high" || typeof workloadVal === "number" && workloadVal > 0.75;
  const asymVal = ctx.get("asymmetry_pct")?.value;
  const freshnessVal = ctx.get("speed_freshness")?.value;
  const missing2 = ctx.missing.map((v) => v.key);
  const lifecycleBand = ctx.get("lifecycle_band")?.value ?? null;
  const dob = ctx.get("date_of_birth")?.value;
  let isMinor = null;
  if (lifecycleBand) {
    isMinor = MINOR_BANDS.has(lifecycleBand);
  } else if (dob) {
    const ageMs = Date.now() - new Date(dob).getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1e3);
    isMinor = Number.isFinite(ageYears) ? ageYears < 18 : null;
  }
  const parentLink = ctx.get("parent_link_active")?.value;
  const parentSupremacyActive = typeof parentLink === "object" && parentLink !== null && parentLink.status === "active" || parentLink === "active" || parentLink === true;
  const parentConcerns = ctx.get("parent_concerns")?.value ?? [];
  return {
    equipment,
    equipmentScope,
    equipmentList,
    equipmentVenue,
    injury,
    injuryRegions,
    liftingAgeYears: ctx.get("lifting_age_years")?.value ?? null,
    lifecycleBand,
    seasonPhase: ctx.get("season_phase")?.value ?? null,
    developmentPriorities: devPriorities,
    weeklyAvailabilityDays: ctx.get("weekly_availability_days")?.value ?? null,
    goalSummary: ctx.get("goal_summary")?.value ?? null,
    goalHorizon: ctx.get("goal_horizon")?.value ?? null,
    categoryGoals: normalizeCategoryGoals(ctx.get("category_goals")?.value),
    readinessScore,
    workloadHigh,
    asymmetryPct: asymVal ?? null,
    speedFreshness: freshnessVal ?? null,
    isMinor,
    parentSupremacyActive: !!parentSupremacyActive,
    parentConcerns,
    missing: missing2
  };
}
function selectSpeedFocus(proj) {
  if (proj.isMinor === true && proj.parentConcerns.includes("speed_max")) {
    return {
      focus: "tempo_recovery",
      rationale: "minor + parent concern (speed_max) \u2014 max-effort sprints suppressed",
      maxEffortAllowed: false,
      recommendedReps: 4
    };
  }
  if (proj.injuryRegions.some((r) => ["hamstring", "ankle", "knee", "groin"].includes(r))) {
    return {
      focus: "tempo_recovery",
      rationale: `injury (${proj.injuryRegions.join(",")}) \u2014 max-effort sprints suppressed`,
      maxEffortAllowed: false,
      recommendedReps: 4
    };
  }
  if (proj.workloadHigh || proj.readinessScore !== null && proj.readinessScore < 0.4) {
    return {
      focus: "deload",
      rationale: "high workload / low readiness \u2014 deload",
      maxEffortAllowed: false,
      recommendedReps: 3
    };
  }
  if (proj.asymmetryPct !== null && proj.asymmetryPct > 10) {
    return {
      focus: "unilateral_symmetry",
      rationale: `asymmetry ${proj.asymmetryPct.toFixed(1)}% > 10% \u2014 unilateral focus`,
      maxEffortAllowed: true,
      recommendedReps: 6
    };
  }
  if (proj.seasonPhase === "in") {
    return {
      focus: "inseason_freshness",
      rationale: "in-season \u2014 preserve freshness",
      maxEffortAllowed: true,
      recommendedReps: 4
    };
  }
  if (proj.seasonPhase === "off") {
    return {
      focus: "offseason_volume",
      rationale: "off-season \u2014 volume + base",
      maxEffortAllowed: true,
      recommendedReps: 8
    };
  }
  if (proj.developmentPriorities.includes("speed") || proj.developmentPriorities.includes("power")) {
    return {
      focus: "max_velocity",
      rationale: "development priority: speed/power",
      maxEffortAllowed: true,
      recommendedReps: 5
    };
  }
  return {
    focus: "acceleration_base",
    rationale: "default \u2014 acceleration base",
    maxEffortAllowed: true,
    recommendedReps: 5
  };
}

// src/lib/hammer/anthro/profile.ts
var EMPTY = {
  apeIndex: null,
  lowerLegFlag: null,
  forearmFlag: null,
  torsoFlag: null,
  footFlag: null,
  archetype: "unknown",
  flags: [],
  missing: [
    "height_in",
    "wingspan_in",
    "femur_in",
    "tibia_in",
    "forearm_in",
    "arm_total_in",
    "torso_in",
    "foot_length_in"
  ]
};
function num(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function buildAnthroProfile(raw) {
  if (!raw || typeof raw !== "object") return EMPTY;
  const a = raw;
  const height = num(a.height_in);
  const wingspan = num(a.wingspan_in);
  const femur = num(a.femur_in);
  const tibia = num(a.tibia_in);
  const forearm = num(a.forearm_in);
  const armTotal = num(a.arm_total_in);
  const torso = num(a.torso_in);
  const foot = num(a.foot_length_in);
  const missing2 = [];
  if (height == null) missing2.push("height_in");
  if (wingspan == null) missing2.push("wingspan_in");
  if (femur == null) missing2.push("femur_in");
  if (tibia == null) missing2.push("tibia_in");
  if (forearm == null) missing2.push("forearm_in");
  if (armTotal == null) missing2.push("arm_total_in");
  if (torso == null) missing2.push("torso_in");
  if (foot == null) missing2.push("foot_length_in");
  const flags = [];
  const apeIndex = height && wingspan ? wingspan / height : null;
  if (apeIndex != null) {
    if (apeIndex >= 1.05) flags.push("long_arms");
    else if (apeIndex <= 0.97) flags.push("short_arms");
  }
  let lowerLegFlag = null;
  if (femur != null && tibia != null) {
    const ratio = tibia / femur;
    if (ratio >= 1.04) lowerLegFlag = "long_tibia";
    else if (ratio <= 0.92) lowerLegFlag = "long_femur";
    else lowerLegFlag = "balanced";
    if (lowerLegFlag !== "balanced") flags.push(lowerLegFlag);
  }
  let forearmFlag = null;
  if (forearm != null && armTotal != null && armTotal > forearm) {
    const ratio = forearm / armTotal;
    if (ratio >= 0.48) forearmFlag = "long_forearm";
    else if (ratio <= 0.42) forearmFlag = "short_forearm";
    else forearmFlag = "balanced";
    if (forearmFlag !== "balanced") flags.push(forearmFlag);
  }
  let torsoFlag = null;
  if (torso != null && height != null) {
    const ratio = torso / height;
    if (ratio >= 0.34) torsoFlag = "long_torso";
    else if (ratio <= 0.29) torsoFlag = "short_torso";
    else torsoFlag = "balanced";
    if (torsoFlag !== "balanced") flags.push(torsoFlag);
  }
  let footFlag = null;
  if (foot != null && height != null) {
    const ratio = foot / height;
    if (ratio >= 0.155) footFlag = "long_foot";
    else if (ratio <= 0.13) footFlag = "short_foot";
    else footFlag = "balanced";
    if (footFlag !== "balanced") flags.push(footFlag);
  }
  let archetype = "unknown";
  const longBias = apeIndex != null && apeIndex >= 1.04 || lowerLegFlag === "long_tibia" || lowerLegFlag === "long_femur" || forearmFlag === "long_forearm" || footFlag === "long_foot";
  const compactBias = apeIndex != null && apeIndex <= 0.98 || forearmFlag === "short_forearm" || torsoFlag === "short_torso" || footFlag === "short_foot";
  if (longBias && compactBias) archetype = "mixed";
  else if (longBias) archetype = "long_levers";
  else if (compactBias) archetype = "compact";
  else if (apeIndex != null || lowerLegFlag || forearmFlag || torsoFlag || footFlag)
    archetype = "balanced";
  return {
    apeIndex,
    lowerLegFlag,
    forearmFlag,
    torsoFlag,
    footFlag,
    archetype,
    flags,
    missing: missing2
  };
}
function hasAnyAnthroSignal(p) {
  return p.apeIndex != null || p.lowerLegFlag != null || p.forearmFlag != null || p.torsoFlag != null || p.footFlag != null;
}

// src/lib/hammer/prescription/strengthSelector.ts
function selectStrengthSwaps(profile) {
  const swaps = [];
  if (profile.lowerLegFlag === "long_femur" || profile.lowerLegFlag === "long_tibia") {
    swaps.push({
      pattern: "squat",
      preferred: profile.lowerLegFlag === "long_femur" ? "Heavy DB reverse lunge, split squat, or B-stance RDL" : "Front squat to box or safety-bar box squat",
      demote: "Conventional high-bar back squat (max load)",
      cue: profile.lowerLegFlag === "long_femur" ? "Vertical shin, sit between hips \u2014 split stance loads the hip without folding the torso." : "Heels stay down, torso stays tall \u2014 box gives you a depth anchor.",
      reason: profile.lowerLegFlag === "long_femur" ? "Long femurs collapse the torso forward under bilateral squats \u2014 split stance lets you load the hip without the dump." : "Long tibias make bilateral squats feel quad-dominant \u2014 a front/box squat keeps you vertical and patterning hips first.",
      citation: `anthro.lowerLegFlag=${profile.lowerLegFlag}`
    });
  }
  if (profile.torsoFlag === "long_torso") {
    swaps.push({
      pattern: "hinge",
      preferred: "Trap-bar deadlift + 45\xB0 back extension",
      demote: "Conventional barbell deadlift (max load)",
      cue: "Hips behind the bar, ribs stacked over pelvis.",
      reason: "Long torso increases moment arm on a conventional pull \u2014 trap-bar centers the load and protects the low back.",
      citation: "anthro.torsoFlag=long_torso"
    });
  }
  if (profile.forearmFlag === "long_forearm") {
    swaps.push({
      pattern: "press",
      preferred: "DB bench, Swiss-bar bench, or floor press",
      demote: "Straight-bar bench (max load)",
      cue: "Wrist stacked over elbow, elbows track ~45\xB0 \u2014 long forearms hate the locked wrist of a straight bar.",
      reason: "Long forearms put extra leverage demand on the wrist and shoulder during a fixed-grip bench. Neutral or DB pressing keeps the joint stack honest.",
      citation: "anthro.forearmFlag=long_forearm"
    });
  } else if (profile.forearmFlag === "short_forearm") {
    swaps.push({
      pattern: "press",
      preferred: "Straight-bar bench or Larsen press",
      cue: "Shorter forearm leverage favors fixed-grip pressing \u2014 use it.",
      reason: "Short forearms keep the bench bar path tight and stable \u2014 leverage favors straight-bar work.",
      citation: "anthro.forearmFlag=short_forearm"
    });
  }
  if (profile.apeIndex != null && profile.apeIndex >= 1.05) {
    swaps.push({
      pattern: "pull",
      preferred: "Chest-supported row, Meadows row, or ring row",
      demote: "Bent-over barbell row (max load)",
      cue: "Set the scap first, pull the elbow to the hip \u2014 long arms recruit the lower back fast if unsupported.",
      reason: "Long arm levers (ape index \u2265 1.05) overload the spinal erectors on free-standing rows. Chest-supported isolates the lats.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`
    });
  }
  if (swaps.length === 0) return { swaps: [], rationale: null };
  const rationale = swaps.length === 1 ? `Anthro-tuned: ${swaps[0].reason}` : `Anthro-tuned for your lever profile (${profile.archetype}): ${swaps.map((s) => s.preferred.split(",")[0]).join(" \xB7 ")}.`;
  return { swaps, rationale };
}

// src/lib/hammer/prescription/throwingSelector.ts
function selectThrowingAdaptations(profile) {
  const cues = [];
  const supplemental = [];
  if (profile.apeIndex != null && profile.apeIndex >= 1.05) {
    cues.push({
      cue: "Long arm action \u2014 let the lever play; do not shorten the back-side of the arc.",
      reason: "Ape index \u2265 1.05 \u2192 longer external moment arm; cutting the back-swing costs whip.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`
    });
    supplemental.push({
      name: "Bowler / towel arm-action drill",
      dosage: "2 rounds x 8 dry reps each arm slot",
      cue: "Feel the late launch \u2014 long levers reward patience.",
      reason: "Reinforces full arm-path mechanics for long-armed throwers.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`
    });
  } else if (profile.apeIndex != null && profile.apeIndex <= 0.98) {
    cues.push({
      cue: "Compact arm \u2014 speed up the tempo, snap the wrist, do not chase length.",
      reason: "Shorter levers reward tempo and wrist whip, not arm-action length.",
      citation: `anthro.apeIndex=${profile.apeIndex.toFixed(2)}`
    });
  }
  if (profile.forearmFlag === "long_forearm") {
    supplemental.push({
      name: "Wrist-weight pronation series",
      dosage: "3 x 10 each side",
      cue: "Finish out front, pronate fully \u2014 long forearms control spin if you train them.",
      reason: "Long forearms give a longer wrist lever \u2014 pronation control raises spin efficiency.",
      citation: "anthro.forearmFlag=long_forearm"
    });
  }
  if (profile.forearmFlag === "short_forearm") {
    supplemental.push({
      name: "Quick-tempo plyo throws (rocker / pivot pickoff)",
      dosage: "2 x 8 at 70%",
      cue: "Fast hands, fast feet \u2014 compact arms thrive on tempo.",
      reason: "Short-forearm leverage favors quick-tempo plyo work before max-intent throwing.",
      citation: "anthro.forearmFlag=short_forearm"
    });
  }
  if (cues.length === 0 && supplemental.length === 0) {
    return { cues: [], supplemental: [], rationale: null };
  }
  const rationale = `Throwing tuned to your lever profile (${profile.archetype})${profile.apeIndex != null ? ` \u2014 ape index ${profile.apeIndex.toFixed(2)}` : ""}.`;
  return { cues, supplemental, rationale };
}

// src/lib/hammer/prescription/movementGuide.ts
function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
var GUIDES = {
  cuff_scap_activation_low_intensity: {
    what: "Gentle shoulder rotation and shoulder-blade movement with a light band.",
    setup: "Use a light resistance band with a secure anchor. ER means rotate your forearm away from your body; IR means rotate it toward your body. Keep your elbow bent and close to your side. For scap pulls, gently draw your shoulder blades back without shrugging.",
    goodRep: ["Turn your forearm slowly away from your body for ER, then toward your body for IR.", "Keep your elbow close to your side and your shoulder relaxed.", "For scap pulls, gently draw your shoulder blades back without shrugging.", "Follow the sets and repetitions shown on your prescription."],
    badRep: ["Forcing the movement or working through pain.", "Adding resistance, repetitions or time beyond the prescription."],
    feel: "Easy, comfortable movement, not a hard shoulder workout.",
    whyToday: "Gentle movement on your arm-recovery day.",
    nextLink: "Continue with the next prescribed recovery item.",
    stopIf: "Stop for shoulder or elbow pain, pinching, numbness or tingling. Follow your professional\u2019s injury instructions."
  },
  wrist_forearm_mobility_flush: {
    what: "Slow wrist circles and gentle forearm massage.",
    setup: "Sit or stand comfortably with your forearm supported. Make slow wrist circles in each direction, then gently massage the forearm with your opposite hand.",
    goodRep: ["Circle your wrist slowly in each direction without forcing the range.", "Use your opposite hand to massage your forearm with light pressure.", "Follow each time and side shown on your prescription."],
    badRep: ["Forcing the movement or working through pain.", "Adding resistance, repetitions or time beyond the prescription."],
    feel: "Gentle movement and light pressure, not pain.",
    whyToday: "Easy wrist and forearm movement during recovery.",
    nextLink: "Continue with the next prescribed recovery item.",
    stopIf: "Stop for pain, numbness or tingling. Do not press into an injured or painful area."
  },
  sleeper_cross_body_stretch: {
    what: "Two gentle shoulder stretches, only within a comfortable range.",
    setup: "For the sleeper stretch, lie on your side with your elbow bent and gently guide your forearm toward the floor with your other hand. For cross-body, bring your arm across your chest and support it with your opposite hand. Use only a comfortable range.",
    goodRep: ["For the sleeper stretch, gently guide your forearm down without pushing into the shoulder.", "For cross-body, support your arm across your chest without pulling hard.", "Breathe gently and follow the holds and sides shown on your prescription."],
    badRep: ["Forcing the movement or working through pain.", "Adding resistance, repetitions or time beyond the prescription."],
    feel: "A comfortable stretch, never a pinch.",
    whyToday: "Gentle shoulder mobility during recovery.",
    nextLink: "Continue with the next prescribed recovery item.",
    stopIf: "Stop for shoulder pain, pinching, numbness or tingling. Never force the stretch; follow your professional\u2019s injury instructions."
  },
  // ============ Neural priming / reaction drills ============
  wu_reaction_ball_wall: {
    what: "A small, uneven rubber ball is thrown at a wall. Because it is uneven, it bounces back in an unpredictable direction, and your job is to catch it before it hits the ground a second time.",
    setup: "Stand facing a solid wall, 6\u201310 feet away, with a reaction ball (a lumpy rubber ball about the size of a baseball). If you don't have one, a small rubber pinky ball or a lacrosse ball works. Feet shoulder-width apart, knees slightly bent, weight on the balls of your feet, hands open in front of your chest.",
    goodRep: [
      "Eyes track the ball the whole time \u2014 no blinking away.",
      "Your first movement is your hands going toward the ball, not away from it.",
      "You stay balanced \u2014 you shuffle to the ball, you don't fall into it.",
      "Two hands make the catch, soft and quiet."
    ],
    badRep: [
      "Waiting flat-footed for the ball to come to you.",
      "Reaching with one hand and stabbing at it.",
      "Standing straight up \u2014 losing your athletic stance between throws."
    ],
    feel: "Light on your feet, alert, the same way you feel when a pitch is about to be thrown or a batted ball is coming your way. Your hands should feel quick and your eyes should feel busy.",
    whyToday: "Wakes up your hand-eye timing and fires your fast-twitch nervous system before you go into speed, throwing, or hitting work. Cheap on the body, big on alertness.",
    nextLink: "Go straight into your speed or throwing block \u2014 your nervous system is now switched on and will get more out of each rep.",
    stopIf: "You roll an ankle, your shoulder pinches, or you feel dizzy from tracking."
  },
  wu_reaction_drop_catch: {
    what: "A partner (or a wall drop) releases a ball without any warning and you catch it before the second bounce. Trains pure reaction time.",
    setup: "Partner stands 4\u20136 feet in front of you holding a tennis ball at shoulder height. You stand in an athletic stance \u2014 feet shoulder-width, knees soft, hands ready at chest height, eyes on the ball.",
    goodRep: [
      "You are still and quiet before the drop, but ready.",
      "First movement is a snap of the hand toward the ball.",
      "You catch it cleanly before it can bounce twice.",
      "Reset to stance immediately \u2014 no wasted movement."
    ],
    badRep: [
      "Trying to guess when the drop is coming (fake-starts).",
      "Body tense \u2014 you cannot react when you're tight.",
      "Lunging forward and losing balance."
    ],
    feel: "Relaxed but coiled \u2014 like a defender waiting to break on a ball.",
    whyToday: "Pure CNS wake-up. No load, big reaction benefit.",
    nextLink: "Move into fast-twitch work while the nervous system is hot."
  },
  // ============ Speed / rhythm ============
  wu_wickets_low: {
    what: "You run at a controlled 75% speed over a line of low hurdles that are spaced perfectly for your natural stride. The wickets don't get jumped \u2014 they get run through. This teaches your legs to cycle in a clean rhythm.",
    setup: "Line up 8 mini-hurdles (6\u20138 inches tall) in a straight line, exactly 5 feet apart \u2014 about 40 feet total. If you have no hurdles, use rolled towels, shoes, or cones as markers. Give yourself a 10-yard jog-in before the first hurdle so you build speed cleanly.",
    goodRep: [
      "Jog in and hit the first hurdle at about 75% speed.",
      "Stay tall \u2014 chest up, eyes forward, arms drive front-to-back.",
      "Each foot lands cleanly between the hurdles.",
      "Knees pick straight up and the foot cycles down under your hip."
    ],
    badRep: [
      "Reaching or stretching your stride to hit a hurdle.",
      "Looking down at your feet \u2014 always makes you slower.",
      "Landing on your heel, or landing on the hurdle itself."
    ],
    feel: "Rhythmic and light \u2014 like your feet are ticking a metronome. If you feel choppy or heavy, back off the speed until the rhythm returns.",
    whyToday: "Teaches clean sprint mechanics without you having to think about them \u2014 the hurdle spacing does the coaching for you.",
    nextLink: "Now go into your sprint or acceleration work \u2014 you have a rhythm to keep.",
    stopIf: "You clip a hurdle in a way that jars your ankle or hip, or a hamstring or calf grabs."
  },
  wu_a_skip: {
    what: "A running warm-up drill: you skip forward while driving one knee up to hip height and stepping down under your body. It's the shape of a good sprint stride, done at low speed.",
    setup: "Open space, 20 yards of turf or track. Feet under hips, tall posture.",
    goodRep: [
      "Skip rhythm \u2014 bounce-step, bounce-step.",
      "Front knee drives up to hip height, toe pulled up.",
      "Same-side arm swings up in sync (opposite arm on the down side).",
      "Foot lands directly under your hip, quiet and quick."
    ],
    badRep: [
      "Kicking your foot out in front of your body.",
      "Bending forward at the waist.",
      "Slapping the foot down loudly."
    ],
    feel: "Tall, springy, coordinated. Not a hard workout \u2014 a mechanics rehearsal.",
    whyToday: "Grooves the sprint stride cheap and clean.",
    nextLink: "Feeds directly into B-skip and sprint work."
  },
  wu_b_skip: {
    what: "Same rhythm as A-skip, but as the knee drives up, you extend the lower leg out and paw it back down and under your body \u2014 teaching the leg to actively pull the ground behind you at full sprint.",
    setup: "Same as A-skip. 20 yards of open space.",
    goodRep: [
      "Skip \u2192 knee up \u2192 leg extends out \u2192 paw the ground down and back.",
      "Tall posture the whole time.",
      "Land under your hip, not in front of your body."
    ],
    badRep: [
      "Kicking the foot out and letting it slap the ground.",
      "Losing the skip rhythm.",
      "Reaching forward with the foot instead of pawing back."
    ],
    feel: "You are 'pulling the ground' backward under your body.",
    whyToday: "Locks in the pawing action of top-speed running.",
    nextLink: "Move to falling starts or sprints."
  },
  wu_pogo_double: {
    what: "Short, stiff-ankled hops in place on two feet. Each hop is quick \u2014 the ground is 'hot' and you're only on it for a fraction of a second.",
    setup: "Feet hip-width, arms relaxed at your sides or bent at 90\xB0. Soft flat surface (turf, gym floor, or grass).",
    goodRep: [
      "Ankles stay stiff \u2014 most of the bounce comes from your calves and Achilles.",
      "Ground contact is less than 0.2 seconds (like the floor is hot).",
      "Land in the same spot you took off from.",
      "Chest up, eyes forward."
    ],
    badRep: [
      "Squatting between hops (that means the knees are absorbing, not the ankles).",
      "Long, floaty jumps.",
      "Landing on heels."
    ],
    feel: "Springy and quick, like your Achilles is a coiled spring.",
    whyToday: "Wakes up the elastic system in your ankles and calves \u2014 the same system that powers first-step quickness.",
    nextLink: "Go into sprint or lateral work while the calves are primed.",
    stopIf: "Sharp pain in the shin, calf, or Achilles."
  },
  wu_ankle_bounce_series: {
    what: "Rapid, low bounces on stiff ankles \u2014 a smaller and faster version of a pogo hop, meant purely to prime the ankle stiffness that makes you fast.",
    setup: "Feet hip-width, tall posture, arms relaxed.",
    goodRep: [
      "Bounces are tiny \u2014 1\u20132 inches off the ground.",
      "Ankles do all the work \u2014 knees and hips barely move.",
      "Rhythm is fast and constant."
    ],
    badRep: [
      "Big jumps.",
      "Bending the knees.",
      "Slow tempo."
    ],
    feel: "Your calves and the arch of your foot 'wake up' \u2014 light and springy.",
    whyToday: "Primes the same tissue you'll use for first-step acceleration.",
    nextLink: "Line hops, then pogos, then sprints."
  },
  // ============ ARM CARE (owned by throwing block on throwing days) ============
  wu_jband_full: {
    what: "A full circuit of light elastic-band exercises that wake up the rotator cuff and shoulder-blade muscles. This is the full arm-care band chart \u2014 the standard daily shoulder-prep circuit.",
    setup: "Anchor a light arm-care band (or a light resistance band) to a fence, pole, or door hinge at about chest height. Stand facing sideways so the band is level with your throwing arm.",
    goodRep: [
      "Go through the full chart \u2014 external rotation, internal rotation, scap pull, retractions, forward flexion.",
      "Every rep is slow, especially on the way back (the eccentric).",
      "Elbow stays at the correct height for each movement.",
      "Breathe out on the pull."
    ],
    badRep: [
      "Snapping the band back fast.",
      "Using a heavy band \u2014 this is a wake-up, not a workout.",
      "Rushing through reps."
    ],
    feel: "A gentle warmth in the back of the shoulder and the shoulder blade. You should never feel this in the front of the shoulder.",
    whyToday: "This is the entire arm-care allotment for your throwing day \u2014 the shoulder complex is now primed for real throws.",
    nextLink: "Straight into tennis-ball whip throws \u2192 underload \u2192 catch-play.",
    stopIf: "Sharp pain in the front of the shoulder or any elbow pinch \u2014 stop and message Hammer."
  },
  wu_crossover_symmetry_full: {
    what: "A branded chart of band exercises (band activation) that hits the rotator cuff and scap stabilizers in a specific order. Same purpose as arm-care band, different pattern.",
    setup: "Crossover bands anchored at chest height. Chest square to the anchor.",
    goodRep: [
      "Shoulder blades set FIRST \u2014 you feel them squeeze slightly \u2014 then the arms move.",
      "Slow, smooth reps, especially the return.",
      "Full range each rep \u2014 don't cheat the finish."
    ],
    badRep: [
      "Arms firing before the shoulder blade sets.",
      "Any shrug \u2014 shoulders stay away from the ears.",
      "Fast, snappy reps."
    ],
    feel: "The back of the shoulder and mid-back working. Front of the shoulder should stay quiet.",
    whyToday: "Complete arm-care activation before any throwing \u2014 this is your one and only arm-care block today.",
    nextLink: "Move into fast-object throws.",
    stopIf: "Any front-of-shoulder pain or elbow twinge."
  },
  wu_prone_tyw: {
    what: "You lie face-down on a bench or floor and make the letters T, Y, and W with your arms while holding a light weight or nothing. Trains the muscles between your shoulder blades that keep the shoulder joint centered when you throw.",
    setup: "Lie face-down on a bench (or on the floor with a rolled towel under your forehead so you can breathe). Arms hang toward the floor, thumbs pointing up.",
    goodRep: [
      "T: arms straight out to the sides, thumbs up, squeeze shoulder blades.",
      "Y: arms overhead in a Y shape, thumbs up.",
      "W: elbows bent, upper arms straight out, forearms up \u2014 squeeze blades together.",
      "Slow, controlled, thumbs stay up the whole time."
    ],
    badRep: [
      "Using momentum or arching your low back.",
      "Thumbs pointing down (loads the front of the shoulder wrong).",
      "Any weight over 3 lbs \u2014 this is activation, not strength."
    ],
    feel: "Small burn between the shoulder blades. That's exactly right.",
    whyToday: "Primes the mid-back so your shoulder joint sits in its healthy position when you throw.",
    nextLink: "Straight into scap push-ups or band pulls."
  },
  wu_er_at_90: {
    what: "You stand with your throwing-arm elbow bent to 90\xB0 and out to the side, and slowly rotate your forearm from parallel-to-the-ground up to overhead against light band tension. This trains the deep rotator cuff.",
    setup: "Anchor a light band at elbow height. Stand sideways so the band pulls across your body. Elbow bent 90\xB0, upper arm out to the side at shoulder height, forearm parallel to the ground.",
    goodRep: [
      "Elbow stays exactly at shoulder height.",
      "Forearm rotates up smoothly.",
      "Slow return \u2014 3 seconds on the way down."
    ],
    badRep: [
      "Elbow drops or drifts down.",
      "Shoulder shrugs up toward the ear.",
      "Snapping the band on the return."
    ],
    feel: "Deep in the back of the shoulder \u2014 small, controlled, warm.",
    whyToday: "Directly primes the muscles that decelerate your throwing arm \u2014 the ones that break down when you don't warm them up.",
    nextLink: "Feeds into T/Y/W or straight into throwing prep.",
    stopIf: "Any pinch in the front of the shoulder."
  },
  wu_scap_pushup: {
    what: "A push-up where you keep your elbows locked straight and only move your shoulder blades \u2014 squeezing them together, then pushing them apart. Trains the muscle that stabilizes the shoulder blade against your ribcage.",
    setup: "Standard push-up position \u2014 hands under shoulders, body in a straight line from head to heels.",
    goodRep: [
      "Elbows stay LOCKED \u2014 no bend.",
      "Shoulder blades pinch together (chest drops slightly toward the floor).",
      "Then push the floor away \u2014 shoulder blades spread wide and your upper back rounds slightly."
    ],
    badRep: [
      "Bending the elbows (that's a regular push-up).",
      "Hips sagging.",
      "Head dropping."
    ],
    feel: "The muscle just below your armpit (serratus) working. That's the money muscle for throwers.",
    whyToday: "Locks the shoulder blade to the ribcage so your arm has a stable base to fire from.",
    nextLink: "Straight into T/Y/W or band face pulls."
  },
  wu_face_pull_band: {
    what: "You pull a band at eye level toward your face while keeping your elbows high and rotating your hands so your thumbs point behind you. Trains the muscles that pull your shoulders into good posture.",
    setup: "Anchor a band at eye level. Grab both ends with palms facing down. Step back so the band is under light tension. Feet hip-width, tall posture.",
    goodRep: [
      "Elbows lead the pull and stay HIGH \u2014 at ear level.",
      "Hands finish by your ears with thumbs rotating back.",
      "Squeeze the back of your shoulders together at the end.",
      "Slow return."
    ],
    badRep: [
      "Elbows dropping toward your ribs.",
      "Pulling to your chest instead of your face.",
      "Yanking with your low back."
    ],
    feel: "Back of the shoulders and upper back working. Neck stays quiet.",
    whyToday: "Balances all the internal-rotation pull of throwing \u2014 protects your shoulder for the long haul.",
    nextLink: "Straight into throwing prep or arm-care cooldown."
  },
  wu_forearm_pump: {
    what: "High-rep flexion and extension of the wrist against light resistance to flush blood into the forearm \u2014 the last accelerator of every throw.",
    setup: "Sit or stand with a light dumbbell (2\u20135 lbs) or a band. Forearm rests on your thigh, palm up for flexion / palm down for extension.",
    goodRep: [
      "Slow, full range each rep.",
      "Wrist is the only thing that moves \u2014 forearm stays still.",
      "High reps (20+) \u2014 this is a flush, not a strength lift."
    ],
    badRep: [
      "Moving the elbow or shoulder.",
      "Heavy weight \u2014 that turns it into strength work."
    ],
    feel: "A pump in the forearm and a warmth in the wrist.",
    whyToday: "The wrist is the last thing that moves in every throw \u2014 warming it prevents forearm strains.",
    nextLink: "Straight into throwing prep."
  },
  // ============ Weightless coordination (WOST) ============
  wu_scarf_cross_body_catch: {
    what: "You toss a light silk scarf across your body from one hand to the other. Because a scarf floats slowly, your eyes and hands get a long moment to track and catch it \u2014 perfect for coordination.",
    setup: "Stand tall with one light silk scarf (or a napkin) in your RIGHT hand at hip level. Feet shoulder-width, hips facing forward. Hips STAY facing forward the entire drill \u2014 only the arms and ribcage rotate.",
    goodRep: [
      "Toss the scarf up and across your body toward your LEFT shoulder so it floats above your head.",
      "Reach across the midline of your body and catch it in your LEFT hand before it drops below your waist.",
      "Immediately toss it back across to the RIGHT.",
      "Slow and smooth \u2014 no missed catches."
    ],
    badRep: [
      "Hips turning with the arms \u2014 the whole point is to isolate the upper body.",
      "Throwing so high the scarf hits the ceiling.",
      "Dropping the scarf and rushing to grab it off the floor."
    ],
    feel: "Playful. This is a low-stress hand-eye drill \u2014 treat it like a game.",
    whyToday: "Trains cross-body coordination that transfers directly to hitting and throwing rhythm.",
    nextLink: "Move into a fast-twitch or throwing drill while the CNS is coordinated."
  },
  // ============ Tennis-ball throws (EASS Tier 1) ============
  eass_tennis_ball_whip_bb: {
    what: "Throwing a tennis ball at full arm speed to a partner or wall. Because the ball weighs almost nothing, your arm has nothing to fight \u2014 so you teach the arm to fire FAST.",
    setup: "Partner or wall at 20\u201330 feet. Standard throwing setup \u2014 glove-side leg forward, back foot loaded, arms in your normal arm slot.",
    goodRep: [
      "Full arm circle \u2014 no shortening the back-side of the arc.",
      "Whip finish out in front \u2014 your hand ends up chasing the ball.",
      "Ball leaves your fingers cleanly \u2014 no wobble.",
      "Full body works together \u2014 this isn't an arm-only throw even though the ball is light."
    ],
    badRep: [
      "Throwing at half-speed 'to save it' \u2014 the whole point is speed.",
      "Arm-only throwing \u2014 the ball is light so you can get away with it, but that defeats the drill.",
      "Short-arming the back-side of the throw."
    ],
    feel: "Fast, clean, effortless. The arm should feel free.",
    whyToday: "Teaches the nervous system what fast feels like without any load. First step in the EASS throwing hierarchy.",
    nextLink: "Move into underload plyo throws (3.5 or 4 oz).",
    stopIf: "Any elbow or shoulder pinch."
  },
  // Generic cool-down guide reused by arm-care cooldowns
  eass_cooldown_universal: {
    what: "A short arm-care cooldown after throwing: a stretch that opens the back of the shoulder (sleeper stretch), a cross-body stretch to lengthen the outside of the shoulder, and a light forearm massage to flush the working tissue.",
    setup: "Lie on your throwing-arm side (sleeper stretch), or stand tall for cross-body and forearm work. No equipment required.",
    goodRep: [
      "Sleeper stretch: lying on your throwing side, elbow bent 90\xB0, gently push forearm toward the floor with the other hand.",
      "Cross-body: pull throwing arm across your chest with the opposite hand, elbow at shoulder height.",
      "Forearm massage: 2 minutes, thumb-press along the meat of the forearm.",
      "Long, slow exhales the whole time."
    ],
    badRep: [
      "Forcing the sleeper stretch \u2014 you should feel a mild pull, never pain.",
      "Rushing \u2014 this is a downshift."
    ],
    feel: "Warmth spreads through the back of the shoulder. Breathing slows down.",
    whyToday: "Downshifts the nervous system and helps the shoulder recover so tomorrow's arm feels fresh.",
    nextLink: "You're done for the day \u2014 hydrate and refuel."
  },
  // ============ Pitcher & recovery conditioning (owner-authorised 2026-10-05) ============
  // Basis per drill lives in wk_movement_catalog.evidence_note. No drill sets an
  // arm slot or a "correct" shape — the athlete moves the way their body moves.
  pc_pretension_hold_bb: {
    what: "A standing hold where you stretch tall and press the floor away, to wake up the long lines of your body before you pitch.",
    setup: "Short split stance, glove-side foot forward. Reach both arms overhead like you're grabbing a bar.",
    goodRep: ["Press the floor away with both feet.", "Reach up and slightly back, long through the front of your body.", "Breathe slowly the whole time."],
    badRep: ["Arching your low back instead of getting long.", "Holding your breath.", "Forcing it into pain."],
    feel: "A stretch-tension line from your front foot, up through your stomach, to your fingers.",
    whyToday: "You pitch soon. This gets you loaded and springy without tiring anything. 20 seconds each stance, twice.",
    nextLink: "Straight into your pogos or ready series.",
    stopIf: "Pinching in your low back or shoulder."
  },
  pc_ankle_pogos_bb: {
    what: "Small, quick bounces off the balls of your feet. Your feet and calves work like springs.",
    setup: "Feet hip-width apart, knees soft, standing tall, arms relaxed.",
    goodRep: ["Ground touches short and quiet.", "Stay tall.", "Bounce, don't jump high."],
    badRep: ["Heavy landings or heels crashing down.", "Knees bending a lot.", "Going high instead of quick."],
    feel: "A bouncy rhythm in your feet and calves. Light, not tiring.",
    whyToday: "Springy legs drive a pitch. 15 bounces, twice. Stop the set as soon as the landings stop being quiet.",
    nextLink: "Walk a few steps, then your strides.",
    stopIf: "Any sharp pain in your foot, ankle, shin or knee."
  },
  pc_buildup_strides_bb: {
    what: "Relaxed runs where you build up speed smoothly and then float to a stop.",
    setup: "30 yards of flat ground.",
    goodRep: ["Start with a jog.", "Build smoothly to fast but relaxed by the middle.", "Float out the last third.", "Walk all the way back before the next one."],
    badRep: ["Turning it into a race.", "Tight shoulders and face.", "Starting the next one out of breath."],
    feel: "Quick, loose and ready, not tired.",
    whyToday: "Short fast runs keep you sharp. Long slow runs don't help a pitcher. 3 strides.",
    nextLink: "You're primed. Hydrate.",
    stopIf: "Any grab in your hamstring or calf."
  },
  rp_ready_series_bb: {
    what: "A short series that keeps a reliever switched on: a tall hold, a few pogos, and a couple of easy turns.",
    setup: "A small space and nothing else.",
    goodRep: ["20-second tall hold, reaching long.", "10 quiet pogos.", "4 easy turns side to side, letting your arms swing loose.", "Go through it twice."],
    badRep: ["Working hard, so you're tired if you get the call.", "Rushing through it."],
    feel: "Warm, loose and awake. Like you could go in right now.",
    whyToday: "You might pitch today. This keeps you ready without spending anything you need on the mound.",
    nextLink: "Stay warm and stay loose.",
    stopIf: "Any pain that changes how you move."
  },
  sp_drive_bounds_sb: {
    what: "Low, springy bounds pushing off one leg, to prime the push off your drive leg that starts every windmill pitch.",
    setup: "10 yards of space. Stand on your drive leg (the same side as your pitching arm).",
    goodRep: ["Push the ground away hard: hip, knee and ankle all straighten.", "Bound forward low, not high.", "Land softly on the other foot and reset."],
    badRep: ["Jumping up instead of driving forward.", "Knee caving in when you push.", "Doing lots of them. This is quality, not volume."],
    feel: "A strong push through your glute and the ball of your foot.",
    whyToday: "The windmill starts with your drive leg. 5 bounds, twice, full rest between.",
    nextLink: "Then your stride and stick.",
    stopIf: "Any pain in your knee, hip or low back."
  },
  sp_stride_stick_sb: {
    what: "Take your pitching stride, land, and hold it still. This builds a steady landing.",
    setup: "Flat ground. Your normal pitching stance, no ball.",
    goodRep: ["Drive out into your normal stride.", "Land and hold for a count of three.", "Knee stays in line over your foot."],
    badRep: ["Knee caving in when you land.", "Wobbling or stepping out.", "Changing your stride to look a certain way. Use the one that's yours."],
    feel: "Solid and balanced on your landing leg.",
    whyToday: "A steady landing lets every pitch land the same. 4 each, twice.",
    nextLink: "You're primed. Hydrate.",
    stopIf: "Any pain in your landing knee or ankle."
  },
  sp_arm_circle_rhythm_sb: {
    what: "Easy full arm circles, no ball, to warm up your windmill circle.",
    setup: "Stand in your pitching stance with plenty of space around your arm.",
    goodRep: ["Make slow, loose circles to start.", "Let them get a little quicker each time.", "Let your arm brush past your hip at the bottom with a relaxed snap."],
    badRep: ["Forcing a big or stiff circle.", "Trying to make it look like someone else's.", "Muscling it."],
    feel: "Loose, warm shoulder and a whippy finish.",
    whyToday: "Your circle is yours. This just wakes it up. 8 circles, twice.",
    nextLink: "Into your throwing warm-up.",
    stopIf: "Any pinching or pain in your shoulder or elbow."
  },
  rp_ready_series_sb: {
    what: "A short series that keeps a windmill reliever switched on: a drive-leg push, a stride and stick, and easy arm circles.",
    setup: "A small space and nothing else.",
    goodRep: ["3 easy drive-leg pushes.", "2 stride-and-sticks.", "6 loose arm circles.", "Go through it twice."],
    badRep: ["Working hard, so you're tired if you get the call.", "Rushing through it."],
    feel: "Warm, loose and awake. Like you could go in right now.",
    whyToday: "You might pitch today. This keeps you ready without spending anything you need in the circle.",
    nextLink: "Stay warm and stay loose.",
    stopIf: "Any pain that changes how you move."
  },
  rc_easy_flush: {
    what: "Easy biking or walking to get blood moving after a hard day.",
    setup: "A bike or a flat walk outside.",
    goodRep: ["Go at a pace where you can talk in full sentences.", "Keep it steady.", "Breathe through your nose if you can."],
    badRep: ["Turning it into a workout.", "Breathing hard or sweating a lot."],
    feel: "Warm, loose, and a bit better than when you started.",
    whyToday: "Today is about recovering, not adding work. About 9 minutes.",
    nextLink: "Then your long reach walk.",
    stopIf: "You feel dizzy or unwell."
  },
  rc_long_reach_walk: {
    what: "A slow walk where you reach the opposite arm up and long with every step.",
    setup: "10 yards of space.",
    goodRep: ["Take a slow walking step.", "Reach the opposite arm up and long.", "Feel the stretch run from your back foot to your reaching hand. Switch sides each step."],
    badRep: ["Pushing into pain to get loose.", "Rushing."],
    feel: "A gentle full-body stretch with no strain.",
    whyToday: "Easy length through your whole body after hard work. 10 yards, twice.",
    nextLink: "You're done. Eat and sleep well.",
    stopIf: "Pinching in your shoulder or back."
  },
  rc_breathing_reset: {
    what: "Slow breathing lying down to help your body switch off.",
    setup: "Lie on your back, knees bent, feet flat.",
    goodRep: ["Breathe in through your nose for 4.", "Breathe out slowly for 6.", "Let your ribs drop on every breath out."],
    badRep: ["Rushing.", "Forcing big breaths."],
    feel: "Calm and heavy on the floor.",
    whyToday: "Helps you settle after travel or a long day. 2 minutes.",
    nextLink: "You're done.",
    stopIf: "You feel dizzy. Breathe normally."
  },
  rc_postgame_flush: {
    what: "A short, easy cool-down the night of a game: walk, reach long, then breathe slowly.",
    setup: "Any space after the game, in uniform is fine.",
    goodRep: ["Walk easily and add comfortable long reaches as you go.", "Finish with gentle breathing and a relaxed, longer exhale; do not hold your breath.", "Follow the time shown on your prescription for the whole sequence."],
    badRep: ["Skipping it to sit straight down for the drive home.", "Turning it into extra running."],
    feel: "Your heart rate settles and your legs feel lighter.",
    whyToday: "You played tonight. A short easy cool-down tonight helps you feel better tomorrow.",
    nextLink: "Eat, drink water, and sleep.",
    stopIf: "Something hurts. Tell a coach or parent."
  },
  rc_travel_reset: {
    what: "Easy walking and long reaches to undo the stiffness of a long trip.",
    setup: "Any space when you arrive, or a rest stop on the way.",
    goodRep: ["Walk easily and reach overhead and to each side within a comfortable range.", "Keep your breathing gentle; do not force deep breaths or hold your breath.", "Follow the time shown on your prescription for the whole sequence."],
    badRep: ["Doing a hard workout after sitting for hours.", "Skipping it and staying stiff."],
    feel: "Looser hips and back, and more awake.",
    whyToday: "You're travelling, so today is about moving easy, not training hard.",
    nextLink: "Then your breathing reset.",
    stopIf: "Any pain that changes how you move."
  }
};
function guideFor(slugOrName) {
  if (!slugOrName) return null;
  const direct = GUIDES[slugOrName];
  if (direct) return direct;
  const n = norm(slugOrName);
  if (GUIDES[n]) return GUIDES[n];
  const aliases = {
    reaction_ball_vs_wall: "wu_reaction_ball_wall",
    low_wicket_runs_rhythm: "wu_wickets_low",
    a_skip: "wu_a_skip",
    b_skip: "wu_b_skip",
    pogo_hops_double_leg: "wu_pogo_double",
    ankle_bounce_series_stiff_ankles: "wu_ankle_bounce_series",
    j_band_full_arm_care_chart: "wu_jband_full",
    crossover_symmetry_activation_chart: "wu_crossover_symmetry_full",
    prone_t_y_w: "wu_prone_tyw",
    external_rotation_at_90: "wu_er_at_90",
    scapular_push_up: "wu_scap_pushup",
    band_face_pull: "wu_face_pull_band",
    forearm_flexor_extensor_pump: "wu_forearm_pump",
    scarf_cross_body_catch: "wu_scarf_cross_body_catch",
    tennis_ball_whip_throws_teach_fast_object_finish: "eass_tennis_ball_whip_bb",
    arm_care_cooldown: "eass_cooldown_universal"
  };
  const aliased = aliases[n];
  return aliased ? GUIDES[aliased] ?? null : null;
}

// src/lib/hammer/prescription/warmupLibrary.ts
var WARMUP_LIBRARY = [
  // Breathwork
  { slug: "wu_crocodile_breathing", name: "Crocodile breathing (prone diaphragm reset)", role: "breathwork", setup: "prone, forehead on hands", cue: "expand ribs 360\xB0, exhale twice as long", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "8 slow breaths" },
  { slug: "wu_9020_reset", name: "Feet-on-Wall Breathing Reset", role: "breathwork", setup: "back on floor, feet on wall, hips/knees 90\xB0", cue: "ribs down, exhale fully before inhaling", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "6 breaths" },
  // Tissue prep / ECM
  { slug: "wu_tissue_prep_roll_and_rhythm", name: "Tissue prep \u2014 rolling + rhythmic movement", role: "tissue_prep", setup: "Use a tennis ball or your hands for gentle pressure, then clear space for easy swings and bounces.", cue: "Roll the major areas, then use easy oscillations, bounces, and swings before faster work.", stopIf: "sharp pain, numbness, tingling, or bruising pressure", gameDayLegal: true, minLifecycle: "youth", source: "owner_tissue_prep_law", baseDose: "5 minutes total" },
  { slug: "wu_tissue_prep_rhythmic_shake", name: "Tissue prep 2 \u2014 bounces, swings and shake-outs", role: "tissue_prep", setup: "Open space; a wall or fence for balance on leg swings.", cue: "Small quick ankle bounces, then loose leg swings, arm swings and a shake-out.", stopIf: "sharp pain or a pinching joint", gameDayLegal: true, minLifecycle: "youth", source: "owner_tissue_prep_law", baseDose: "2 minutes total", equipment: [] },
  { slug: "wu_foam_roll_tspine", name: "T-spine foam roll extensions", role: "tissue_prep", setup: "roller under mid-back", cue: "small ranges, exhale into extension", stopIf: "pinch or sharp pain", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "8 slow reps" },
  { slug: "wu_lacrosse_ball_pec", name: "Lacrosse ball pec minor pin", role: "tissue_prep", setup: "ball against wall on pec minor", cue: "search-hold-move \u2014 arm slow figure-8", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "30-45 sec per side" },
  { slug: "wu_lacrosse_ball_glute", name: "Lacrosse ball glute pin-and-stretch", role: "tissue_prep", cue: "find a hotspot, then flex/extend hip", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "45 sec per side" },
  { slug: "wu_barefoot_towel_scrunch", name: "Barefoot towel scrunch (foot fascia)", role: "tissue_prep", setup: "towel under bare foot", cue: "drag toward you with toes \u2014 arch stays lifted", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "30 sec per foot" },
  { slug: "wu_calf_softball_pin", name: "Soleus ball pin (calf ECM hydration)", role: "tissue_prep", cue: "pin, then dorsiflex/plantarflex the ankle", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "45 sec per side" },
  // Fascial rotation
  { slug: "wu_spinal_wave_standing", name: "Standing spinal wave", role: "fascial_rotation", cue: "sequence segment by segment \u2014 no muscling", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "6 reps each direction", beginnerDose: "4 reps each direction" },
  { slug: "wu_arm_line_spiral", name: "Arm-line fascial spiral", role: "fascial_rotation", setup: "half-kneeling", cue: "reach across body, let ribcage rotate through", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "6 per side" },
  { slug: "wu_thoracic_windmill", name: "Thoracic windmill (side-lying open book)", role: "fascial_rotation", setup: "side-lying, knees stacked at 90\xB0", cue: "reach long, exhale into the twist", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "8 per side" },
  { slug: "wu_thread_the_needle_slow", name: "Thread-the-needle slow flow", role: "fascial_rotation", cue: "quadruped rotate \u2014 chase length not depth", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "6 per side" },
  { slug: "wu_lateral_line_reach", name: "Lateral line reach + side bend", role: "fascial_rotation", cue: "long from foot to fingertip \u2014 feel the whole side stretch", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "5 per side" },
  { slug: "wu_medball_rot_toss_wall", name: "Med-ball rotational toss (fascial spring)", role: "fascial_rotation", setup: "6-8 lb ball vs wall", cue: "load the back hip, let fascia snap through", stopIf: "any rib/oblique tweak", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 x 4 per side", beginnerDose: "2 x 3 per side", eliteDose: "3 x 5 per side max intent" },
  // CARs
  { slug: "wu_hip_cars", name: "Controlled hip circles", role: "cars", cue: "biggest circle you own \u2014 no compensations", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 per direction per side" },
  { slug: "wu_shoulder_cars", name: "Controlled shoulder circles", role: "cars", cue: "full end-range, no rib flare", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 per direction per side" },
  { slug: "wu_spine_cars", name: "Slow back bends and turns", role: "cars", cue: "cat-cow then side bend then rotation \u2014 one segment at a time", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 slow reps" },
  { slug: "wu_ankle_cars", name: "Seated ankle circles", role: "cars", cue: "maximum circle, keep shin still", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "5 per direction per side" },
  { slug: "wu_wrist_cars", name: "Controlled wrist circles", role: "cars", cue: "big circles, elbow locked", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "5 per direction per side" },
  { slug: "wu_scapular_cars", name: "Shoulder-blade circles", role: "cars", cue: "trace a square with the shoulder blade only", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "5 per direction per side" },
  // Mobility
  { slug: "wu_90_90_switch", name: "Seated Bent-Knee Hip Switches", role: "mobility_joint", cue: "sit tall, drive knees down slowly \u2014 no hands", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "8 per side" },
  { slug: "wu_shin_box_get_up", name: "Shin-box get-up", role: "mobility_joint", cue: "rise without hands \u2014 control both hips", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "4 per side" },
  { slug: "wu_cossack_squat", name: "Cossack squat flow", role: "mobility_joint", cue: "shift weight foot-to-foot \u2014 heel of extended leg stays down", stopIf: "knee or groin sharp pain", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "6 per side" },
  { slug: "wu_worlds_greatest_stretch", name: "World's greatest stretch", role: "mobility_joint", cue: "elbow to instep, then reach up to open thorax", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "5 per side" },
  { slug: "wu_spiderman_reach", name: "Spiderman + rotational reach", role: "mobility_joint", cue: "reach the top hand for the ceiling \u2014 eyes chase it", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "5 per side" },
  { slug: "wu_frog_rock", name: "Frog stretch rock-back", role: "mobility_joint", setup: "quadruped, knees wide", cue: "rock slow, keep back flat", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "8 slow rocks" },
  { slug: "wu_hip_airplane", name: "Hip airplanes (SL hinge + rotation)", role: "mobility_joint", cue: "square the hips, then open, then square \u2014 no wobble", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "5 per side", beginnerDose: "3 per side with wall support" },
  { slug: "wu_adductor_rock", name: "Adductor rock-back", role: "mobility_joint", setup: "half-kneeling, one leg extended lateral", cue: "hips back and down, chest tall", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "8 per side" },
  { slug: "wu_couch_stretch_active", name: "Active couch stretch + posterior tilt", role: "mobility_joint", setup: "rear foot elevated behind you", cue: "squeeze glute, tuck tail, breathe", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "30 sec + 5 reps per side" },
  { slug: "wu_tspine_open_book", name: "T-spine open book", role: "mobility_joint", cue: "reach long, follow with your eyes", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "6 per side" },
  { slug: "wu_wall_hip_flexor_slide", name: "Wall-assisted hip flexor slide", role: "mobility_joint", cue: "posterior tilt drives the stretch, not the lean", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "5 per side" },
  // Activation
  { slug: "wu_miniband_lat_walk", name: "Mini-band lateral walk", role: "activation", setup: "light mini-band above knees", cue: "knees track toes, hips stay level", stopIf: "knee tracking pain", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10 steps each way" },
  { slug: "wu_miniband_monster_walk", name: "Mini-band monster walk", role: "activation", setup: "band above knees", cue: "athletic stance, small steps, tension the whole time", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 8 forward + 8 back" },
  { slug: "wu_glute_bridge_walkout", name: "Glute bridge walkout", role: "activation", setup: "hips up, walk feet out then back in", cue: "hips stay level, don't let one side drop", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 6 steps" },
  { slug: "wu_deadbug_band_press", name: "Dead-bug w/ band overhead press iso", role: "activation", cue: "ribs locked down, exhale as leg extends", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 5 per side" },
  { slug: "wu_bird_dog_slow", name: "Bird-dog slow tempo", role: "activation", cue: "no hip shift when the leg extends", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 5 per side" },
  { slug: "wu_prone_hip_ext_iso", name: "Prone glute-only hip extension", role: "activation", cue: "lift the leg with the glute, not the low back", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 6 per side" },
  { slug: "wu_singleleg_glute_bridge", name: "Single-leg glute bridge", role: "activation", cue: "drive through the heel, keep hips level", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 6 per side" },
  // Stability
  { slug: "wu_pallof_press_iso", name: "Resist-Turning Press Hold", role: "stability", cue: "arms extend, ribs stay square to cable", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 20 sec per side" },
  { slug: "wu_copenhagen_short_lever", name: "Short-lever Copenhagen plank", role: "stability", cue: "top knee on bench, drive it down into the pad", stopIf: "groin pain", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "2 x 15 sec per side", eliteDose: "2 x 25 sec per side" },
  { slug: "wu_sl_rdl_reach", name: "Single-leg RDL balance reach", role: "stability", cue: "hips square, reach long, no wobble", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 5 per side" },
  { slug: "wu_split_stance_iso_hold", name: "Split-stance iso hold + march", role: "stability", cue: "vertical shin, ribs stacked over pelvis", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 20 sec per side" },
  { slug: "wu_serratus_wall_slide", name: "Serratus wall slide", role: "stability", setup: "forearms on wall", cue: "reach long at the top, don't shrug", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 8" },
  // Neural priming
  { slug: "wu_ankle_bounce_series", name: "Ankle bounce series (stiff ankles)", role: "neural_priming", cue: "ground is hot, minimum contact time", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 15 sec" },
  { slug: "wu_line_hops_forward_back", name: "Line hops forward-back", role: "neural_priming", cue: "quick feet, both directions clean", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 20 sec" },
  { slug: "wu_line_hops_lateral", name: "Line hops lateral", role: "neural_priming", cue: "stiff ankles, don't drift", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 20 sec" },
  { slug: "wu_a_skip", name: "A-skip", role: "neural_priming", cue: "tall posture, front-side mechanics \u2014 knee up, toe up", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 20 yards" },
  { slug: "wu_b_skip", name: "B-skip", role: "neural_priming", cue: "same as A, but paw the ground down and back", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "2 x 20 yards" },
  { slug: "wu_wickets_low", name: "Low wicket runs (rhythm)", role: "neural_priming", setup: "Line up 8 mini hurdles (6-8 inches tall) in a straight line, exactly 5 feet apart \u2014 about 40 feet total. If you have no hurdles, use rolled towels or shoes as markers.", cue: "Jog in and start running at 75% speed as you hit the first hurdle. Stay tall (chest up, eyes forward). Let each foot land BETWEEN the hurdles \u2014 pick the knee straight up and let it cycle down under your hip. Do not stride out to reach for a hurdle. Walk back to the start between reps.", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 runs through \u2014 walk back between each" },
  { slug: "wu_reaction_ball_wall", name: "Reaction ball vs wall", role: "neural_priming", setup: "Stand 6-10 ft from a solid wall with a reaction ball (lumpy rubber ball) or a lacrosse/pinky ball. Feet shoulder-width, athletic stance.", cue: "Throw the ball into the wall, then catch it with two hands before it bounces twice. The ball will kick unpredictably \u2014 react early, stay light on your feet, and reset your stance between throws.", stopIf: "rolled ankle, shoulder pinch, or dizziness", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 rounds of 20 sec \u2014 reset between" },
  // Fast-twitch primer
  { slug: "wu_pogo_double", name: "Pogo hops (double-leg)", role: "fast_twitch", axis: "bilateral", regions: ["ankle", "calf", "achilles"], setup: "Stand tall on a firm, flat surface with feet hip-width, shoes on. Arms bent at your sides \u2014 they stay quiet the whole set.", cue: "Bounce straight up and down off the balls of both feet, keeping the knees almost locked so the ankle does the work. The ground is hot \u2014 get off it fast. Each contact should sound short and crisp, not a thud. Stop the set the moment contacts start getting slow or loud.", stopIf: "shin or achilles pain", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 12 contacts", beginnerDose: "2 x 8 contacts" },
  { slug: "wu_pogo_single", name: "Single-leg pogo (symmetry)", role: "fast_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles", "knee"], setup: "Balance on one foot, other knee bent so the free foot is behind you. Fingertips can touch a wall for balance the first few reps.", cue: "Bounce in place on that one foot with a stiff ankle and a nearly straight knee. Hold the same spot on the floor \u2014 no drifting. Count the reps on each side and make the second side match the first in height and rhythm. If one side is clearly lower, that is the side telling you where your ground force is leaking.", stopIf: "any strain", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 6 per side" },
  { slug: "wu_pogo_lateral", name: "Lateral pogo (skater rhythm)", role: "fast_twitch", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Stand tall with about 6 feet of clear floor to each side.", cue: "Hop sideways foot to foot, covering roughly one foot of ground each hop. Land on the ball of the foot with a stiff ankle and immediately push back the other way \u2014 no pausing between hops. Chest stays up, hips stay level.", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 10 per side" },
  { slug: "wu_snap_jump", name: "Snap jump (rapid concentric)", role: "fast_twitch", axis: "bilateral", regions: ["knee", "hip"], setup: "Feet hip-width in an athletic stance with room overhead.", cue: "Drop fast into a quarter squat and reverse it instantly into a jump \u2014 the down and the up are one motion, not two. Land soft, reset your stance, then go again. Quality over count: end the set when the reversal stops feeling snappy.", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "3 x 4" },
  { slug: "wu_med_ball_scoop_toss", name: "Med-ball scoop toss (rear-hip explosive)", role: "fast_twitch", axis: "bilateral", equipment: ["med_ball"], fallbackSlug: "wu_sl_broad_hop_stick", regions: ["hip", "back"], setup: "6-8 lb med ball held low between the knees in an athletic stance, facing open space or a high wall.", cue: "Dip the hips, then rip them open and throw the ball straight up and forward like you are scooping it out of the ground. The arms are ropes \u2014 the hips do the work. Reset fully between reps.", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 x 4" },
  { slug: "wu_med_ball_shot_put", name: "Med-ball rotational shot-put", role: "fast_twitch", axis: "bilateral", equipment: ["med_ball", "wall"], fallbackSlug: "wu_dry_swing_burst", regions: ["hip", "back", "shoulder"], setup: "6-8 lb med ball at the chest, standing side-on about 8 feet from a solid wall.", cue: "Load into the back hip, then turn the back hip through and shove the ball into the wall at full intent. Small volume, maximum quality \u2014 every throw is meant to be your hardest.", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 3 per side" },
  { slug: "wu_broad_jump_prep", name: "Broad jump \u2014 60% intent primer", role: "fast_twitch", axis: "bilateral", regions: ["knee", "hip", "hamstring"], setup: "Clear 10-12 feet of flat ground in front of you.", cue: "Swing the arms back, hinge the hips, and jump forward at about 60% of your best \u2014 this is a primer, not a test. Land in an athletic stance and hold the landing for a beat before walking back.", gameDayLegal: false, minLifecycle: "beginner", source: "internal", baseDose: "4 x 1" },
  { slug: "wu_altitude_drop", name: "Altitude drop landing (RSI primer)", role: "fast_twitch", axis: "bilateral", equipment: ["box"], fallbackSlug: "wu_sl_curb_drop_stick", regions: ["knee", "ankle", "achilles"], setup: "Stand on a 6-12 inch box or sturdy step with the toes at the edge.", cue: "Step off \u2014 do not jump off \u2014 and land on both feet with stiff ankles and quiet knees. Absorb and freeze for two seconds. There is no rebound today; the goal is to teach the leg to accept force fast.", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "3 x 3" },
  { slug: "wu_falling_start", name: "Falling start (10 yd)", role: "fast_twitch", axis: "single_leg", regions: ["hamstring", "calf"], setup: "Stand tall at one end of 15 yards of clear, flat ground.", cue: "Stay straight as a board and let yourself tip forward from the ankles. The instant you feel like you would fall, punch one foot into the ground and sprint 10 yards. Fastest first step wins. Walk all the way back before the next rep.", gameDayLegal: true, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 10 yds" },
  { slug: "wu_split_snap_jump", name: "Split-stance snap-switch jump", role: "fast_twitch", axis: "single_leg", regions: ["knee", "hip", "groin"], setup: "Start in a split stance \u2014 one foot forward, one back, both knees soft.", cue: "Jump just high enough to switch the feet in the air and land back in a split stance. Land quiet, immediately switch again. Power comes from pushing the ground away, not from lifting the knees.", stopIf: "any knee pain", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "3 x 4 per side" },
  // ── Ladder quickness (Marinovich reflex canon / Zone28 · Pow3R Plus repeat bursts)
  { slug: "wu_ladder_one_in_each", name: "Ladder \u2014 one foot in each box", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_one_in_each", regions: ["ankle", "calf"], setup: "Lay an agility ladder flat on level ground and stand at one end with feet hip-width, weight on the balls of the feet, hands ready in front of your chest.", cue: "Run the ladder placing exactly one foot in every box \u2014 right, left, right, left \u2014 all the way to the far end. Stay tall, look up the ladder rather than down at your feet, and pump the arms in rhythm with the feet. Ground contacts should be light and fast, not stomps. Walk back to the start between runs and reset your posture before you go again.", stopIf: "ankle roll, shin pain, or feet losing their rhythm two runs in a row", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "4 runs \u2014 walk back between", beginnerDose: "3 runs \u2014 walk back between", eliteDose: "5 runs at maximum turnover" },
  { slug: "wu_ladder_two_in_each", name: "Ladder \u2014 two feet in each box (icky rhythm)", role: "ladder_quickness", axis: "bilateral", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_two_in_each", regions: ["ankle", "calf"], setup: "Ladder flat on the ground, standing at one end in an athletic stance with knees soft.", cue: "Put both feet into each box before moving to the next \u2014 right in, left in, right out, left out. Keep the hips low and square down the ladder and do not let the feet cross. Speed comes second: hit the pattern clean twice, then push the tempo on the remaining runs.", stopIf: "pattern breaks down or the feet start clipping the rungs", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "4 runs \u2014 walk back between", beginnerDose: "3 runs", eliteDose: "5 runs, last two at max turnover" },
  { slug: "wu_ladder_lateral_shuffle", name: "Ladder \u2014 lateral in-in-out-out", role: "ladder_quickness", axis: "bilateral", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_lateral", regions: ["ankle", "groin", "knee"], setup: "Stand side-on at one end of the ladder with the ladder running to your right, feet shoulder-width, hips low.", cue: "Step the lead foot in, the trail foot in, then the lead foot out beyond the ladder and the trail foot out \u2014 that is one box. Travel sideways down the whole ladder without ever turning the shoulders. Keep the chest up and the hips level; if you start bobbing up and down, slow down and reclaim the level hips. Run it down and back so both sides lead equally.", stopIf: "groin tightness or knees collapsing inward", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 trips down and back", beginnerDose: "2 trips down and back", eliteDose: "4 trips down and back" },
  { slug: "wu_ladder_single_leg_hop_through", name: "Ladder \u2014 single-leg hop through", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_sl_hop", regions: ["ankle", "calf", "achilles", "knee"], setup: "Stand on one foot at the end of the ladder, other knee bent behind you, arms ready to help with rhythm.", cue: "Hop forward on that one foot, landing once in each box, all the way to the end. Land on the ball of the foot with a stiff ankle and get off the ground instantly \u2014 you are looking for a machine-gun rhythm, not big hops. Complete the run on one leg, walk back, then run it on the other leg. Both sides get the same number of runs, always.", stopIf: "any achilles, shin, or knee pain, or the landing side collapsing inward", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 runs per leg \u2014 walk back between", beginnerDose: "2 runs per leg", eliteDose: "4 runs per leg at max turnover" },
  { slug: "wu_ladder_in_out_hops", name: "Ladder \u2014 single-leg in-out zig hops", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_sl_zig", regions: ["ankle", "knee", "groin"], setup: "Stand on one foot beside the first box of the ladder.", cue: "Hop diagonally into the box, then diagonally out to the other side of the ladder, then back in \u2014 zig-zagging down the ladder on that single leg. Land on the ball of the foot each time and keep the knee tracking over the toe. This is the drill that teaches the ankle and hip to redirect force sideways at speed. Same number of runs on each leg.", stopIf: "knee caving in, ankle pain, or any landing you cannot control", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "2 runs per leg", beginnerDose: "1 run per leg", eliteDose: "3 runs per leg" },
  { slug: "wu_chalk_line_one_in_each", name: "Line pattern \u2014 one foot in each space (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "calf"], setup: "Mark 8-10 short lines about 18 inches apart on the ground using chalk, tape, sticks, socks, or shoes \u2014 anything that gives you a visual box. Stand at one end in an athletic stance.", cue: "Run the pattern putting exactly one foot in each space \u2014 right, left, right, left. Look ahead, stay tall on the balls of the feet, and pump the arms in rhythm. The markers are only a guide: what matters is fast, light, accurate feet. Walk back between runs.", stopIf: "ankle roll, shin pain, or rhythm falling apart", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "4 runs \u2014 walk back between", beginnerDose: "3 runs", eliteDose: "5 runs at max turnover" },
  { slug: "wu_chalk_line_two_in_each", name: "Line pattern \u2014 two feet in each space (no ladder)", role: "ladder_quickness", axis: "bilateral", regions: ["ankle", "calf"], setup: "Mark 8-10 spaces about 18 inches apart with chalk, tape, or any flat markers. Athletic stance at one end.", cue: "Both feet touch down in each space before you move on \u2014 right in, left in, right out, left out. Hips stay low and square, feet never cross. Clean pattern first, then speed on the later runs.", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "4 runs \u2014 walk back between", beginnerDose: "3 runs", eliteDose: "5 runs" },
  { slug: "wu_chalk_line_lateral", name: "Line pattern \u2014 lateral in-in-out-out (no ladder)", role: "ladder_quickness", axis: "bilateral", regions: ["ankle", "groin", "knee"], setup: "Mark a straight line 10-15 feet long on the ground, or use a field chalk line, a seam in the floor, or a rope.", cue: "Stand side-on with the line to your right. Step both feet across the line, then both feet back \u2014 travelling down the line sideways without turning the shoulders. Chest up, hips level, quick and quiet feet. Travel down and back so both sides lead.", stopIf: "groin tightness or knees caving in", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 trips down and back", beginnerDose: "2 trips", eliteDose: "4 trips" },
  { slug: "wu_chalk_line_sl_hop", name: "Line pattern \u2014 single-leg hop through (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "calf", "achilles", "knee"], setup: "Mark 6-8 spaces about 18 inches apart, or simply use a straight line on the ground. Stand on one foot at one end.", cue: "Hop forward on that one foot, touching down once per space, all the way through. Stiff ankle, ball of the foot, off the ground immediately \u2014 quick machine-gun rhythm, not big hops. Walk back and repeat on the other leg for the same number of runs.", stopIf: "achilles, shin, or knee pain, or the landing leg collapsing", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 runs per leg", beginnerDose: "2 runs per leg", eliteDose: "4 runs per leg" },
  { slug: "wu_chalk_line_sl_zig", name: "Line pattern \u2014 single-leg zig-zag hops (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Use any straight line on the ground \u2014 a chalk line, floor seam, rope, or a row of markers 10-12 feet long. Stand on one foot beside one end.", cue: "Hop diagonally across the line, then diagonally back, zig-zagging down the line on that single leg. Land on the ball of the foot, knee tracking over the toe, and redirect instantly. Same number of runs on each leg.", stopIf: "knee caving in, ankle pain, or any landing you cannot control", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "2 runs per leg", beginnerDose: "1 run per leg", eliteDose: "3 runs per leg" },
  // ── Single-leg twitch (the majority of the twitch layer)
  { slug: "wu_sl_line_hop_fb", name: "Single-leg line hops \u2014 forward and back", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles"], setup: "Find any line on the ground \u2014 a floor seam, chalk line, or a piece of tape. Stand on one foot just behind it.", cue: "Hop forward over the line and immediately back, over and over, for the full time. Stay on the ball of the foot with a stiff ankle and the knee only slightly bent. The line should be crossed by inches, not feet \u2014 this is about speed off the ground, not distance. Equal time on both legs.", stopIf: "shin or achilles pain, or the hops getting slow and heavy", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 12 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_sl_line_hop_lateral", name: "Single-leg line hops \u2014 lateral", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Stand on one foot beside a line on the ground, hips square, arms ready.", cue: "Hop sideways over the line and straight back, again and again. Keep the knee tracking over the toe and refuse to let it cave inward \u2014 the moment it does, the set is over. Land quiet on the ball of the foot. Equal time on both legs.", stopIf: "knee caving in, groin tightness, or ankle pain", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 x 12 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_sl_ankle_stiffness_bounce", name: "Single-leg ankle stiffness bounce", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles"], setup: "Stand on one foot on a firm surface. Fingertips may rest on a wall for balance.", cue: "Bounce in place on that foot with a near-straight knee so the ankle alone stores and returns the energy. Tiny hops, maximum speed \u2014 you are trying to make the shortest possible time on the ground. Count the contacts and match the second leg exactly.", stopIf: "achilles or shin pain", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 10 contacts per leg", beginnerDose: "2 x 8 contacts per leg", eliteDose: "3 x 15 contacts per leg" },
  { slug: "wu_sl_snap_hop_stick", name: "Single-leg snap hop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "ankle", "hip"], setup: "Stand on one foot with 3-4 feet of clear space in front of you.", cue: "Dip fast into a quarter-bend and immediately hop forward a short distance on that same leg, then stick the landing completely still for two full seconds. If you have to hop or stumble to catch the landing, the hop was too big \u2014 shorten it. Same reps both legs.", stopIf: "knee pain or any landing you cannot control", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 4 per leg", beginnerDose: "2 x 3 per leg", eliteDose: "3 x 5 per leg" },
  { slug: "wu_sl_broad_hop_stick", name: "Single-leg broad hop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "hip", "hamstring"], setup: "Stand on one foot with 8-10 feet of clear, flat ground ahead.", cue: "Swing the arms, hinge slightly, and hop forward on one leg at about 70% of your maximum distance. Land on the same leg and freeze \u2014 chest up, knee over toe, no wobble. Walk back between reps. Equal reps both legs, and if one side cannot stick the landing, cut the distance on both.", stopIf: "knee or hamstring pain, or repeated failed landings", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 3 per leg", beginnerDose: "2 x 2 per leg", eliteDose: "3 x 4 per leg" },
  { slug: "wu_sl_curb_drop_stick", name: "Single-leg curb drop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "knee", "achilles"], setup: "Stand on a curb, low step, or 6-8 inch surface on one foot, toes near the edge.", cue: "Step off \u2014 never jump off \u2014 and land on that same single leg with a stiff ankle and a quiet knee. Freeze the landing for two seconds before stepping back up. This teaches the leg to accept force instantly, which is exactly what a first step and a hard cut demand. Equal reps both legs.", stopIf: "any knee, achilles, or ankle pain", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 3 per leg", beginnerDose: "2 x 2 per leg", eliteDose: "3 x 4 per leg" },
  { slug: "wu_sl_skater_bound_stick", name: "Skater bound and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "groin", "ankle"], setup: "Stand on one foot with 6-8 feet of clear space to each side.", cue: "Push off the outside of the standing foot and bound sideways onto the other foot, then hold that landing completely still for two seconds. Chest up, hips level, knee over toe. Bound back the other way. This is the exact pattern of a hard lateral break in the field.", stopIf: "knee caving in, groin pain, or unstable landings", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 4 per side", beginnerDose: "2 x 3 per side", eliteDose: "3 x 5 per side" },
  { slug: "wu_sl_split_switch_burst", name: "Split-stance switch burst", role: "single_leg_twitch", axis: "single_leg", regions: ["hip", "knee", "groin"], setup: "Start in a split stance \u2014 one foot forward, one back, both knees soft, chest tall.", cue: "Jump just high enough to switch the feet in the air, land soft in a split stance, and switch again immediately. Short, quick switches \u2014 the power comes from pushing the ground away, not from lifting the knees. Keep the torso quiet the whole set.", stopIf: "knee or groin pain", gameDayLegal: false, minLifecycle: "advanced", source: "internal", baseDose: "3 x 6 switches", beginnerDose: "2 x 4 switches", eliteDose: "3 x 8 switches" },
  { slug: "wu_sl_march_pop", name: "Single-leg march pop (ground-force march)", role: "single_leg_twitch", axis: "single_leg", regions: ["hip", "calf", "ankle"], setup: "Stand tall with 15 yards of clear ground ahead. Arms bent at 90 degrees.", cue: "March forward slowly but punch each foot into the ground hard enough that you pop slightly off the floor each step. Knee up, toe up, tall through the spine. This is a low-cost way to teach the leg to hit the ground hard without sprinting.", stopIf: "calf or hip flexor tightness", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 15 yds", beginnerDose: "2 x 10 yds", eliteDose: "3 x 20 yds" },
  // ── Ground force (short maximal contacts — the sport is a burst sport)
  { slug: "wu_gf_wall_drive_single", name: "Wall drive \u2014 single-leg punch", role: "ground_force", axis: "single_leg", equipment: ["wall"], fallbackSlug: "wu_gf_seated_start", regions: ["hip", "calf"], setup: "Lean into a wall with both hands at shoulder height, body in a straight line from head to heel at about a 45-degree angle. One knee is driven up to hip height.", cue: "Punch the down foot into the floor and switch legs, holding the new knee up for a full second. The body line never breaks \u2014 no sagging hips, no bending at the waist. Each punch should be violent and short. Alternate legs for the prescribed count.", stopIf: "hip flexor or calf strain", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "3 x 6 per leg", beginnerDose: "2 x 4 per leg", eliteDose: "3 x 8 per leg" },
  { slug: "wu_gf_seated_start", name: "Seated-to-sprint start (8 yd)", role: "ground_force", axis: "single_leg", regions: ["hamstring", "calf", "hip"], setup: "Sit on the ground facing 15 yards of clear, flat running space, legs out in front, hands beside your hips.", cue: "From dead still, get up and sprint 8 yards as fast as you can. Because you start with zero momentum, every bit of speed has to come from how hard you hit the ground. Walk all the way back and rest until your breathing is normal before the next rep \u2014 this is a quality drill, not conditioning.", stopIf: "any hamstring or calf grab \u2014 shut the whole set down", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "3 x 8 yds \u2014 full rest between", beginnerDose: "2 x 8 yds", eliteDose: "4 x 8 yds" },
  { slug: "wu_gf_band_resisted_step", name: "Band-resisted first step", role: "ground_force", axis: "single_leg", equipment: ["bands", "partner"], fallbackSlug: "wu_gf_seated_start", regions: ["hip", "hamstring", "calf"], setup: "Loop a long resistance band around your waist with a partner holding the other end behind you, or anchor it to a fixed post. Set up in an athletic stance with the band already under light tension.", cue: "Drive out against the band for 3-4 hard steps, pushing the ground back at a forward body angle \u2014 not standing up tall. Each step is a separate maximal effort. Walk back to the start and let the band go slack before the next rep.", stopIf: "hamstring or hip strain, or the body angle collapsing upright", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "4 x 4 steps", beginnerDose: "3 x 3 steps", eliteDose: "5 x 4 steps" },
  { slug: "wu_gf_repeat_burst", name: "Repeat 5-second burst (Zone28 rhythm)", role: "ground_force", axis: "single_leg", regions: ["hamstring", "calf", "hip"], setup: "Clear 20 yards of flat ground. This drill mirrors the real demand of baseball and softball: an all-out burst, then a full reset.", cue: "Sprint hard for 5 seconds \u2014 roughly 20 yards \u2014 then walk back slowly and rest a full 45 seconds before the next one. Every burst should be as fast as the first. The second a burst is noticeably slower, the set is finished, no matter how many reps are left.", stopIf: "any grab in the hamstring or calf, or a burst that is clearly slower than the first", gameDayLegal: false, minLifecycle: "intermediate", source: "internal", baseDose: "4 bursts \u2014 45 sec rest between", beginnerDose: "3 bursts", eliteDose: "5 bursts" },
  { slug: "wu_gf_hip_lock_hold", name: "Sprint hip-lock hold", role: "ground_force", axis: "single_leg", regions: ["hip", "calf"], setup: "Stand tall next to a wall or post you can touch for balance.", cue: "Drive one knee up to hip height with the toe pulled up, and hold that exact sprint position for the prescribed seconds while pushing the standing foot hard into the ground. Hips stay square and level, spine tall. Switch legs. This teaches the position your body has to hold at top speed.", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 10 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_dry_swing_burst", name: "Dry-swing burst ladder", role: "ground_force", axis: "bilateral", equipment: ["bat"], fallbackSlug: "wu_gf_hip_lock_hold", regions: ["hip", "back"], setup: "Take your bat into open space with room to swing safely in every direction.", cue: "Take three swings in a row: the first at 50%, the second at 75%, the third at 100% intent. The rear hip fires first on every one. Rest 20 seconds, then repeat the ladder. This wakes the rotational burst without spending your best swings.", stopIf: "any rib, oblique, or low-back tweak", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 ladders of 3 swings per side", beginnerDose: "2 ladders of 3 swings per side", eliteDose: "3 ladders of 3 swings per side at full intent" },
  // Weightless Object Sport Training (WOST) — coordination, hand-eye, rhythm, no load
  { slug: "wu_tennis_ball_reaction_toss", name: "Tennis ball reaction toss", role: "weightless_coordination", setup: "facing wall or partner 6-10 ft away", cue: "catch it on the first bounce \u2014 no extra steps", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_tennis_ball_self_rally", name: "Tennis ball self-rally", role: "weightless_coordination", setup: "small space, one hand only", cue: "bounce, catch, repeat \u2014 smooth rhythm", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_tennis_ball_one_hand_catch", name: "Tennis ball one-hand catch", role: "weightless_coordination", setup: "toss and catch with one hand", cue: "no bobbling \u2014 stick the catch", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 12 per side", beginnerDose: "2 x 8 per side", eliteDose: "1 x 12 per side" },
  { slug: "wu_tennis_ball_cross_body_catch", name: "Tennis ball cross-body catch", role: "weightless_coordination", cue: "reach across the midline \u2014 let the ribcage rotate", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_tennis_ball_clap_catch", name: "Tennis ball clap-catch", role: "weightless_coordination", cue: "toss, clap, catch \u2014 one bounce", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_scarf_juggle", name: "Scarf juggling (2-3 scarves)", role: "weightless_coordination", cue: "toss slowly, track the arc with eyes", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 30 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_scarf_cross_body_catch", name: "Scarf cross-body catch", role: "weightless_coordination", setup: "Stand tall with one light silk/juggling scarf (or a light cloth napkin) held in your RIGHT hand at hip level. Feet shoulder-width, hips facing forward \u2014 they stay facing forward the entire drill.", cue: "Toss the scarf up and across your body toward your LEFT shoulder so it floats above head height, then let it fall. Reach across your midline and catch it in your LEFT hand before it drops below your waist. Immediately toss it back across to the RIGHT and catch with the RIGHT hand. That is 1 rep per side. Keep hips square \u2014 only the arms and ribcage rotate. Slow, smooth, no missed catches.", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 sets x 8 catches per side", beginnerDose: "2 sets x 5 catches per side", eliteDose: "1 set x 8 catches per side" },
  { slug: "wu_scarf_toss_and_move", name: "Scarf toss and move under", role: "weightless_coordination", cue: "toss high, shuffle under it, catch at the peak", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 6", beginnerDose: "2 x 4", eliteDose: "1 x 6" },
  { slug: "wu_scarf_one_hand_snatch", name: "Scarf one-hand snatch", role: "weightless_coordination", cue: "snatch it out of the air with one hand \u2014 quick exchange", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 8 per side", beginnerDose: "2 x 5 per side", eliteDose: "1 x 8 per side" },
  { slug: "wu_balloon_keep_up", name: "Balloon keep-up", role: "weightless_coordination", setup: "hand or forearm only", cue: "keep it alive with minimal force \u2014 read the float", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 45 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 45 sec" },
  { slug: "wu_balloon_hand_switch", name: "Balloon hand-switch keep-up", role: "weightless_coordination", cue: "alternate hands, no double taps", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_balloon_partner_volley", name: "Balloon partner volley", role: "weightless_coordination", setup: "with a partner, no spiking", cue: "soft, controlled, read the arc", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 45 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 45 sec" },
  { slug: "wu_beanbag_toss_and_catch", name: "Beanbag toss and catch", role: "weightless_coordination", cue: "catch it soft \u2014 no sound on landing", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 12", beginnerDose: "2 x 8", eliteDose: "1 x 12" },
  { slug: "wu_beanbag_balance_walk", name: "Beanbag balance walk", role: "weightless_coordination", setup: "beanbag on top of the head", cue: "tall posture, walk heel-to-toe", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 20 yds", beginnerDose: "2 x 10 yds", eliteDose: "1 x 20 yds" },
  { slug: "wu_beanbag_foot_flip", name: "Beanbag foot flip", role: "weightless_coordination", cue: "flip it up with the foot, catch it with the same-side hand", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 6 per side", beginnerDose: "2 x 4 per side", eliteDose: "1 x 6 per side" },
  { slug: "wu_reaction_drop_catch", name: "Reaction drop-catch", role: "weightless_coordination", setup: "partner drops the ball without warning", cue: "explode the hand \u2014 catch before the second bounce", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_coin_finger_roll", name: "Coin finger roll", role: "weightless_coordination", setup: "coin on back of hand, flip and catch", cue: "quiet fingers, smooth arc", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_rhythm_ball_tap", name: "Rhythm ball tap", role: "weightless_coordination", setup: "bounce a tennis ball to a metronome or beat", cue: "same spot every bounce \u2014 no chasing", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_mini_frisbee_toss", name: "Mini frisbee toss and catch", role: "weightless_coordination", cue: "soft throw, read the spin, clean catch", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_mini_frisbee_roll_catch", name: "Mini frisbee roll catch", role: "weightless_coordination", cue: "roll it, let it spin, catch it on the return", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 8", beginnerDose: "2 x 5", eliteDose: "1 x 8" },
  { slug: "wu_mirror_me_ball_toss", name: "Mirror-me partner ball toss", role: "weightless_coordination", setup: "face partner, mirror their movement as they toss", cue: "read the release, catch, mirror the next throw", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_light_bat_shadow_tap", name: "Light bat shadow tap", role: "weightless_coordination", setup: "light bat or dowel", cue: "tap the end of the bat to the wall with the eyes tracking", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_shuttle_tap_up", name: "Badminton shuttle tap-up", role: "weightless_coordination", cue: "tap the shuttle straight up \u2014 no sideways drift", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 20 sec", beginnerDose: "2 x 15 sec", eliteDose: "1 x 20 sec" },
  { slug: "wu_partner_alternating_catch", name: "Partner alternating rapid catch", role: "weightless_coordination", setup: "two balls, two partners", cue: "catch one, toss the other \u2014 no gaps", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  // Movement bridge
  { slug: "wu_dry_swing_progressive", name: "Progressive dry swings (intent ladder)", role: "movement_bridge", cue: "swing 1 at 50%, swing 2 at 75%, swing 3 at 100% \u2014 feel the elastic snap", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "3 x 3 per side" },
  { slug: "wu_mirror_throw_prep", name: "Dry throw arm-swing prep", role: "movement_bridge", cue: "half-speed rehearsal \u2014 pattern first, intent last", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 6" },
  { slug: "wu_shuffle_change_direction", name: "Shuffle \u2192 change of direction", role: "movement_bridge", cue: "athletic stance, react like a defender", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 20 sec each way" },
  { slug: "wu_crossover_run", name: "Crossover run (open the hip)", role: "movement_bridge", cue: "cross over long, don't hop", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 15 yds each way" },
  // Arm care
  { slug: "wu_jband_full", name: "Arm-care band chart", role: "arm_care", setup: "arm-care band anchored at chest height", cue: "control the eccentric \u2014 every rep", stopIf: "shoulder sharp pain", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "full chart @ 1 x 10 each" },
  { slug: "wu_crossover_symmetry_full", name: "Band activation chart", role: "arm_care", cue: "smooth reps, exhale on pull", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "full chart @ 1 x 10 each" },
  { slug: "wu_prone_tyw", name: "Prone T / Y / W", role: "arm_care", cue: "thumbs up, squeeze the shoulder blades", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 8 each letter" },
  { slug: "wu_er_at_90", name: "External rotation at 90\xB0", role: "arm_care", setup: "band anchored elbow height", cue: "elbow high, slow eccentric", gameDayLegal: true, minLifecycle: "beginner", source: "internal", baseDose: "2 x 12 per side" },
  { slug: "wu_scap_pushup", name: "Scapular push-up", role: "arm_care", cue: "protract/retract only \u2014 no elbow bend", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 10" },
  { slug: "wu_face_pull_band", name: "Band face pull", role: "arm_care", setup: "band at eye level", cue: "elbows high, pull the band apart, external rotate", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "2 x 12" },
  { slug: "wu_forearm_pump", name: "Forearm flexor/extensor pump", role: "arm_care", cue: "band or light weight, high reps to flush", gameDayLegal: true, minLifecycle: "youth", source: "internal", baseDose: "1 x 20 each direction" }
];
function doseFor(drill, lifecycle) {
  if (lifecycle === "youth" || lifecycle === "beginner") return drill.beginnerDose ?? drill.baseDose;
  if (lifecycle === "elite") return drill.eliteDose ?? drill.baseDose;
  return drill.baseDose;
}
var EQUIPMENT_OVERRIDES = {
  wu_foam_roll_tspine: { equipment: ["foam_roller"], fallbackSlug: "wu_tspine_open_book" },
  wu_lacrosse_ball_pec: { equipment: ["massage_ball", "wall"], fallbackSlug: "wu_serratus_wall_slide" },
  wu_lacrosse_ball_glute: { equipment: ["massage_ball"], fallbackSlug: "wu_frog_rock" },
  wu_calf_softball_pin: { equipment: ["massage_ball"], fallbackSlug: "wu_barefoot_towel_scrunch" },
  wu_medball_rot_toss_wall: { equipment: ["med_ball", "wall"], fallbackSlug: "wu_thoracic_windmill" },
  wu_miniband_lat_walk: { equipment: ["mini_band"], fallbackSlug: "wu_glute_bridge_walkout" },
  wu_miniband_monster_walk: { equipment: ["mini_band"], fallbackSlug: "wu_singleleg_glute_bridge" },
  wu_deadbug_band_press: { equipment: ["bands"], fallbackSlug: "wu_bird_dog_slow" },
  wu_pallof_press_iso: { equipment: ["bands"], fallbackSlug: "wu_split_stance_iso_hold" },
  wu_copenhagen_short_lever: { equipment: ["bench"], fallbackSlug: "wu_sl_rdl_reach" },
  wu_wickets_low: { equipment: ["hurdles"], fallbackSlug: "wu_a_skip" },
  wu_reaction_ball_wall: { equipment: ["tennis_ball", "wall"], fallbackSlug: "wu_line_hops_lateral" },
  wu_couch_stretch_active: { equipment: ["bench"], fallbackSlug: "wu_wall_hip_flexor_slide" },
  wu_tennis_ball_reaction_toss: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_self_rally: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_one_hand_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_cross_body_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_clap_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_rhythm_ball_tap: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_reaction_drop_catch: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_juggle: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_cross_body_catch: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_toss_and_move: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_one_hand_snatch: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_keep_up: { equipment: ["balloon"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_hand_switch: { equipment: ["balloon"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_partner_volley: { equipment: ["balloon", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_beanbag_toss_and_catch: { equipment: ["beanbag"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_beanbag_balance_walk: { equipment: ["beanbag"], fallbackSlug: "wu_crossover_run" },
  wu_beanbag_foot_flip: { equipment: ["beanbag"], fallbackSlug: "wu_crossover_run" },
  wu_mini_frisbee_toss: { equipment: ["frisbee"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_mini_frisbee_roll_catch: { equipment: ["frisbee"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_shuttle_tap_up: { equipment: ["shuttle"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_coin_finger_roll: { equipment: ["coin"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_mirror_me_ball_toss: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_partner_alternating_catch: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_light_bat_shadow_tap: { equipment: ["bat"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_dry_swing_progressive: { equipment: ["bat"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_jband_full: { equipment: ["jband"], fallbackSlug: "wu_prone_tyw" },
  wu_crossover_symmetry_full: { equipment: ["bands"], fallbackSlug: "wu_prone_tyw" },
  wu_er_at_90: { equipment: ["bands"], fallbackSlug: "wu_prone_tyw" },
  wu_face_pull_band: { equipment: ["bands"], fallbackSlug: "wu_scap_pushup" },
  wu_forearm_pump: { equipment: ["bands"], fallbackSlug: "wu_scap_pushup" },
  wu_barefoot_towel_scrunch: { equipment: ["towel"] },
  wu_med_ball_scoop_toss: { equipment: ["med_ball"], fallbackSlug: "wu_sl_broad_hop_stick" },
  wu_med_ball_shot_put: { equipment: ["med_ball", "wall"], fallbackSlug: "wu_dry_swing_burst" },
  wu_altitude_drop: { equipment: ["box"], fallbackSlug: "wu_sl_curb_drop_stick" }
};
var BASELINE_EQUIPMENT = ["wall", "open_space", "floor", "towel"];
var VENUE_EXPANSIONS = {
  full_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "hurdles", "jband", "bat"],
  commercial_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "jband"],
  gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench"],
  home_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "bench"],
  team_facility: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "hurdles", "jband", "bat", "tennis_ball", "partner"],
  field: ["bat", "tennis_ball", "partner", "ladder"],
  field_only: ["bat", "tennis_ball", "partner"],
  bands: ["bands", "mini_band", "jband"],
  hotel: [],
  travel: [],
  bodyweight: []
};
var EQUIPMENT_SYNONYMS = {
  agility_ladder: "ladder",
  speed_ladder: "ladder",
  mini_hurdles: "hurdles",
  hurdle: "hurdles",
  resistance_bands: "bands",
  band: "bands",
  jbands: "jband",
  j_band: "jband",
  j_bands: "jband",
  crossover_symmetry: "bands",
  medicine_ball: "med_ball",
  medball: "med_ball",
  plyo_box: "box",
  jump_box: "box",
  step: "box",
  lacrosse_ball: "massage_ball",
  massage_gun: "massage_ball",
  roller: "foam_roller",
  bats: "bat",
  tennis_balls: "tennis_ball",
  training_partner: "partner",
  catch_partner: "partner"
};
function normalizeEquipmentToken(raw) {
  const t = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return EQUIPMENT_SYNONYMS[t] ?? t;
}
function expandEquipment(declared, venue) {
  const out = new Set(BASELINE_EQUIPMENT);
  for (const raw of declared ?? []) {
    const token = normalizeEquipmentToken(String(raw));
    out.add(token);
    for (const extra of VENUE_EXPANSIONS[token] ?? []) out.add(extra);
  }
  if (venue) {
    const v = normalizeEquipmentToken(venue);
    out.add(v);
    for (const extra of VENUE_EXPANSIONS[v] ?? []) out.add(extra);
  }
  return out;
}
function equipmentFor(drill) {
  return drill.equipment ?? EQUIPMENT_OVERRIDES[drill.slug]?.equipment ?? [];
}
function fallbackFor(drill) {
  return drill.fallbackSlug ?? EQUIPMENT_OVERRIDES[drill.slug]?.fallbackSlug ?? null;
}
function bySlug(slug) {
  return WARMUP_LIBRARY.find((d2) => d2.slug === slug) ?? null;
}
function hasEquipment(drill, available) {
  return equipmentFor(drill).every((need) => available.has(need));
}
function equipmentNoteFor(drill) {
  const needs = equipmentFor(drill).filter((e) => !BASELINE_EQUIPMENT.includes(e));
  if (needs.length === 0) return void 0;
  const labels = {
    ladder: "agility ladder",
    hurdles: "mini hurdles",
    box: "box or step",
    bands: "resistance band",
    mini_band: "mini band",
    med_ball: "medicine ball",
    massage_ball: "lacrosse or massage ball",
    foam_roller: "foam roller",
    jband: "arm-care band",
    tennis_ball: "tennis ball",
    beanbag: "beanbag",
    scarf: "juggling scarf",
    balloon: "balloon",
    frisbee: "mini frisbee",
    shuttle: "badminton shuttle",
    coin: "coin",
    bat: "bat",
    bench: "bench or chair",
    partner: "a partner"
  };
  return needs.map((n) => labels[n] ?? n.replace(/_/g, " ")).join(", ");
}
var TEMPLATES = {
  game_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "activation",
    "weightless_coordination",
    "ladder_quickness",
    "neural_priming",
    "arm_care",
    "movement_bridge"
  ],
  in_season_practice: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "ladder_quickness",
    "neural_priming",
    "single_leg_twitch",
    "movement_bridge",
    "arm_care"
  ],
  in_season_default: [
    "breathwork",
    "cars",
    "fascial_rotation",
    "activation",
    "weightless_coordination",
    "ladder_quickness",
    "neural_priming",
    "single_leg_twitch",
    "arm_care"
  ],
  speed_day: [
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "neural_priming",
    "ladder_quickness",
    "single_leg_twitch",
    "single_leg_twitch",
    "ground_force",
    "fast_twitch",
    "movement_bridge"
  ],
  lift_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "stability",
    "neural_priming",
    "ladder_quickness",
    "single_leg_twitch",
    "fast_twitch"
  ],
  // Throwing days: arm care is OWNED BY THE THROWING BLOCK (EASS band prep + cooldown).
  // The warmup does NOT include arm_care on throwing days — that keeps arm care to exactly
  // one exposure per day. See ArmCareBudgetContext.
  // Legs stay fresh for the arm: ladder quickness only, no ground-force bursts.
  throwing_day: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "ladder_quickness",
    "movement_bridge"
  ],
  hitting_day: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "ladder_quickness",
    "single_leg_twitch",
    "fast_twitch",
    "movement_bridge"
  ],
  offseason_extended: [
    "breathwork",
    "tissue_prep",
    "tissue_prep",
    "cars",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "mobility_joint",
    "activation",
    "stability",
    "weightless_coordination",
    "weightless_coordination",
    "neural_priming",
    "ladder_quickness",
    "ladder_quickness",
    "single_leg_twitch",
    "single_leg_twitch",
    "ground_force",
    "fast_twitch",
    "movement_bridge",
    "arm_care"
  ],
  recovery_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation"
  ],
  travel_day: [
    "breathwork",
    "cars",
    "mobility_joint",
    "activation",
    "weightless_coordination"
  ],
  default: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "weightless_coordination",
    "neural_priming",
    "ladder_quickness",
    "single_leg_twitch",
    "fast_twitch"
  ]
};
var TWITCH_ROLES = [
  "ladder_quickness",
  "single_leg_twitch",
  "ground_force",
  "fast_twitch"
];
var SINGLE_LEG_MIN_SHARE = 0.6;
function templateFor(context, lifecycle) {
  const base2 = TEMPLATES[context] ?? TEMPLATES.default;
  const rank = { youth: 0, beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
  if (rank[lifecycle] > 1) return base2;
  const out = [...base2];
  const idx = out.indexOf("weightless_coordination");
  if (idx !== -1) out.splice(idx + 1, 0, "weightless_coordination", "weightless_coordination");
  else if (context !== "recovery_day") {
    const activationIdx = out.indexOf("activation");
    if (activationIdx !== -1) out.splice(activationIdx + 1, 0, "weightless_coordination", "weightless_coordination");
  }
  return out;
}
var LIFECYCLE_RANK = {
  youth: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  elite: 4
};
function isEligible(d2, f) {
  if (LIFECYCLE_RANK[f.lifecycle] < LIFECYCLE_RANK[d2.minLifecycle]) return false;
  if (f.gameDay && !d2.gameDayLegal) return false;
  if (f.axis && (d2.axis ?? "bilateral") !== f.axis) return false;
  if (d2.regions && f.injuryRegions.length > 0) {
    if (d2.regions.some((r) => f.injuryRegions.includes(r))) return false;
  }
  return true;
}
function resolveEquipmentSafe(d2, f) {
  if (hasEquipment(d2, f.available)) return { drill: d2, substituted: false };
  const fb = fallbackFor(d2);
  if (!fb) return null;
  const sib = bySlug(fb);
  if (!sib) return null;
  if (!isEligible(sib, { ...f, axis: void 0 })) return null;
  return hasEquipment(sib, f.available) ? { drill: sib, substituted: true } : null;
}
function poolForRole(role, f) {
  return WARMUP_LIBRARY.filter((d2) => d2.role === role && isEligible(d2, f));
}
function pickForRole(role, f, seed, seen, diagnostics) {
  const pool = poolForRole(role, f);
  if (pool.length === 0) return null;
  const start = Math.abs(seed) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    const resolved = resolveEquipmentSafe(candidate, f);
    if (!resolved || seen.has(resolved.drill.slug)) continue;
    if (resolved.substituted) {
      diagnostics?.push({
        code: "equipment_substitution",
        role,
        from: candidate.slug,
        to: resolved.drill.slug,
        detail: `${candidate.name} needs ${equipmentFor(candidate).join(", ")} \u2014 swapped to the equipment-free ${resolved.drill.name}.`
      });
    }
    return resolved.drill;
  }
  return null;
}
function tissuePrepBlock(input, available) {
  const hasBall = available.has("tennis_ball") || available.has("lacrosse_ball") || available.has("softball");
  const thrower = input.isThrower !== false;
  const softball = input.sport === "softball";
  const tool = hasBall ? "a tennis ball" : "your hands (no ball today)";
  const upper = thrower ? " Then the chest (pec) against a wall, the side of your back under your armpit (lat), and the forearm on a table \u2014 about 20 seconds each, throwing arm first." : "";
  const where = "Feet: stand and roll the ball under each foot, heel to toes \u2014 30 seconds per foot. Calves: sit, ball under the calf, rock the leg side to side \u2014 30 seconds per leg. Hips/glutes: sit on the ball, lean onto one glute and make small circles \u2014 30 seconds per side. Upper back: lie with the ball between your shoulder blade and spine, roll a few inches up and down \u2014 30 seconds per side.";
  const rolling = {
    slug: "wu_tissue_prep_roll_and_rhythm",
    name: "Tissue prep 1 \u2014 tennis-ball rolling",
    role: "tissue_prep",
    setup: hasBall ? "Use a tennis ball on the floor or against a wall. Press with medium pressure \u2014 about a 4 out of 10: firm enough to feel it, never painful." : "No ball today: press and knead with your hands at about a 4 out of 10 pressure \u2014 firm, never painful.",
    dosage: "3 minutes total",
    cue: `${where}${upper}`,
    stopIf: "You feel sharp pain, numbness, tingling, or bruising pressure.",
    source: "owner_tissue_prep_law",
    equipmentNote: hasBall ? "You need: a tennis ball." : void 0,
    guide: {
      what: `Roll your feet, calves, hips/glutes and upper back with ${tool} at medium pressure (about 4 out of 10), about 30 seconds per spot.${thrower ? " Throwers also roll the chest, lat and forearm." : ""}`,
      setup: hasBall ? "Tennis ball on the floor or against a wall." : "Use your hands for pressure.",
      goodRep: [where, ...thrower ? [upper.trim()] : [], "Keep breathing slowly; pressure stays about 4 out of 10."],
      badRep: ["Grinding hard on one sore spot.", "Rolling over bone or the back of the knee."],
      feel: "Warmer and less stiff.",
      whyToday: "Tissue stiffens while you sit still. Pressure and movement loosen it so it can stretch and spring.",
      nextLink: "Go straight into the rhythmic movements.",
      stopIf: "Sharp pain, numbness, tingling, or bruising pressure."
    }
  };
  const swings2 = thrower ? "10 easy arm swings across the chest and 10 big arm circles each way" : "10 easy arm swings across the chest";
  const rhythm = {
    slug: "wu_tissue_prep_rhythmic_shake",
    name: "Tissue prep 2 \u2014 bounces, swings and shake-outs",
    role: "tissue_prep",
    setup: "Stand tall in open space with room to swing your arms and legs. Hold a wall or fence for the leg swings.",
    dosage: "2 minutes total",
    cue: `Do 20 quick, small ankle bounces (heels barely leave the ground), then 10 front-to-back leg swings and 10 side-to-side leg swings on each leg, then ${swings2}, then shake out your arms and legs loosely for 15 seconds.${softball && thrower ? " Pitchers add 10 slow windmill circles each way." : ""}`,
    stopIf: "You feel sharp pain or a joint pinches.",
    source: "owner_tissue_prep_law",
    guide: {
      what: "Quick ankle bounces, then loose leg and arm swings and a shake-out. The rhythm breaks up stiffness so the body moves freely before faster work.",
      setup: "Open space; a wall or fence for balance on leg swings.",
      goodRep: ["20 small, springy ankle bounces.", "10 front-to-back and 10 side-to-side leg swings per leg.", `${swings2[0].toUpperCase()}${swings2.slice(1)}.`, "Shake out arms and legs for 15 seconds."],
      badRep: ["Forcing the swings to the end of your range.", "Bouncing high and heavy instead of small and quick."],
      feel: "Loose and springy.",
      whyToday: "Rhythmic movement right after rolling turns the loosened tissue into easy, springy motion.",
      nextLink: "Continue into the rest of today's warm-up.",
      stopIf: "Sharp pain or a pinching joint."
    }
  };
  return [rolling, rhythm];
}
function toBuilt(d2, lifecycle) {
  return {
    slug: d2.slug,
    name: d2.name,
    role: d2.role,
    setup: d2.setup,
    dosage: doseFor(d2, lifecycle),
    cue: d2.cue,
    stopIf: d2.stopIf,
    source: d2.source,
    guide: guideFor(d2.slug) ?? guideFor(d2.name) ?? void 0,
    equipmentNote: equipmentNoteFor(d2),
    axis: d2.axis
  };
}
function buildWarmup(input) {
  const diagnostics = [];
  if (input.context === "recovery_day") {
    const available = expandEquipment(input.equipment, input.venue);
    const drills2 = WARMUP_LIBRARY.filter((d2) => isSoftRecovery(d2.slug) && equipmentFor(d2).every((e) => available.has(e)) && !(d2.regions ?? []).some((r) => (input.injuryRegions ?? []).includes(r))).slice(0, 3).map((d2) => toBuilt(d2, input.lifecycle));
    const ordered2 = input.orderByStage === false ? drills2 : sortByWarmupStage(drills2, (d2) => d2.slug, (d2) => d2.role);
    return {
      context: input.context,
      drills: ordered2,
      estMinutes: drills2.length ? 5 : 0,
      singleLegShare: null,
      diagnostics: [{ code: "twitch_suppressed", detail: "Full rest day \u2014 gentle recovery only; training warm-up withheld." }]
    };
  }
  const injuryRegions = (input.injuryRegions ?? []).map((r) => r.toLowerCase());
  const filtersBase = {
    lifecycle: input.lifecycle,
    gameDay: input.gameDay,
    available: expandEquipment(input.equipment, input.venue),
    injuryRegions
  };
  if (injuryRegions.length > 0) {
    diagnostics.push({
      code: "injury_veto",
      detail: `Drills loading ${injuryRegions.join(", ")} were withheld \u2014 reported injury region.`
    });
  }
  const fullTemplate = templateFor(input.context, input.lifecycle);
  const roles = fullTemplate.filter((r) => {
    if (input.suppressArmCare && r === "arm_care") return false;
    if (input.suppressTwitch && TWITCH_ROLES.includes(r)) return false;
    return true;
  });
  if (input.suppressTwitch && fullTemplate.some((r) => TWITCH_ROLES.includes(r))) {
    diagnostics.push({
      code: "twitch_suppressed",
      detail: "Fast-twitch layer withheld today \u2014 recovery, travel or low readiness. Prep only, no CNS spend."
    });
  }
  const seedBase = input.daySeed ?? 0;
  const seen = /* @__PURE__ */ new Set();
  const drills = [...tissuePrepBlock(input, filtersBase.available)];
  seen.add(drills[0].slug);
  roles.forEach((role, i) => {
    if (role === "tissue_prep") return;
    const seed = seedBase + i * 7 + role.length * 3;
    const pick = pickForRole(role, filtersBase, seed, seen, diagnostics);
    if (!pick) {
      diagnostics.push({
        code: "equipment_role_skipped",
        role,
        detail: `No ${role.replace(/_/g, " ")} drill is legal with today's equipment, age and injury state \u2014 the role was skipped rather than half-shipped.`
      });
      return;
    }
    seen.add(pick.slug);
    drills.push(toBuilt(pick, input.lifecycle));
  });
  const twitchIdx = drills.map((d2, i) => ({ d: d2, i })).filter(({ d: d2 }) => TWITCH_ROLES.includes(d2.role));
  if (twitchIdx.length > 0) {
    const needed = Math.ceil(twitchIdx.length * SINGLE_LEG_MIN_SHARE);
    let single = twitchIdx.filter(({ d: d2 }) => d2.axis === "single_leg").length;
    const bilateral = twitchIdx.filter(({ d: d2 }) => d2.axis !== "single_leg").reverse();
    for (const { d: d2, i } of bilateral) {
      if (single >= needed) break;
      const slFilters = { ...filtersBase, axis: "single_leg" };
      const replacement = pickForRole(d2.role, slFilters, seedBase + i * 13 + 5, seen, diagnostics) ?? pickForRole("single_leg_twitch", slFilters, seedBase + i * 13 + 5, seen, diagnostics);
      if (!replacement) continue;
      seen.delete(d2.slug);
      seen.add(replacement.slug);
      drills[i] = toBuilt(replacement, input.lifecycle);
      diagnostics.push({
        code: "single_leg_swap",
        role: replacement.role,
        from: d2.slug,
        to: replacement.slug,
        detail: `Single-leg majority law \u2014 ${d2.name} swapped for ${replacement.name} so most of the twitch work runs through one leg.`
      });
      single++;
    }
  }
  const twitchFinal = drills.filter((d2) => TWITCH_ROLES.includes(d2.role));
  const singleLegShare = twitchFinal.length === 0 ? null : twitchFinal.filter((d2) => d2.axis === "single_leg").length / twitchFinal.length;
  if (singleLegShare !== null && singleLegShare < SINGLE_LEG_MIN_SHARE) {
    diagnostics.push({
      code: "single_leg_short",
      detail: `Single-leg share is ${Math.round(singleLegShare * 100)}% \u2014 no legal single-leg replacement was available today.`
    });
  }
  const est = Math.max(8, 5 + Math.round((drills.length - 1) * 90 / 60));
  const ordered = input.orderByStage === false ? drills : sortByWarmupStage(drills, (d2) => d2.slug, (d2) => d2.role);
  return { context: input.context, drills: ordered, estMinutes: est, singleLegShare, diagnostics };
}
function resolveWarmupContext(input) {
  if (input.isGameDay) return "game_day";
  if (input.isRecoveryDay) return "recovery_day";
  if (input.isTravelDay) return "travel_day";
  if (input.modalityBias === "speed") return "speed_day";
  if (input.modalityBias === "lift") return "lift_day";
  if (input.modalityBias === "throwing") return "throwing_day";
  if (input.modalityBias === "hitting") return "hitting_day";
  if (input.seasonPhase === "off") return "offseason_extended";
  if (input.seasonPhase === "in") {
    return input.isPracticeDay ? "in_season_practice" : "in_season_default";
  }
  return "default";
}
function lifecycleFor(band, liftingAgeYears) {
  if (band === "u10" || band === "u12") return "youth";
  if (band === "u14") return "beginner";
  if (liftingAgeYears === null) return "beginner";
  if (liftingAgeYears >= 8) return "elite";
  if (liftingAgeYears >= 4) return "advanced";
  if (liftingAgeYears >= 2) return "intermediate";
  if (liftingAgeYears >= 1) return "beginner";
  return "youth";
}
registerWarmupRoles(WARMUP_LIBRARY);

// src/lib/seasonPhase.ts
var VALID = ["preseason", "in_season", "post_season", "off_season"];
var SEASON_PROFILES = {
  preseason: {
    phase: "preseason",
    label: "Pre-Season",
    volume: "high",
    intensity: "rising",
    cnsCapPerDay: "medium_high",
    recoveryEmphasis: "medium",
    newSkillWork: "high",
    maxSetsPerExercise: 6,
    maxHighCnsPerWeek: 3,
    toneGuidance: "Sharpening, focused, monitoring readiness. Highlight what is locked in vs what still needs reps. No brand-new mechanical changes this close to opening day.",
    directives: [
      "Ramp volume and intensity week over week, peaking 7-10 days before opening day.",
      "Consolidate off-season gains into game-speed reps.",
      "Cap brand-new movement patterns; refine what already exists.",
      "Schedule one full recovery day for every 3 high-CNS days."
    ],
    hpi: {
      element: "Wood",
      elementQuality: "Wood \u2014 flexible, rising, decisive.",
      organEmphasis: "Liver / Wood \u2014 smooth rotation, clear vision, sharp reactions.",
      yinYangEmphasis: "Yang rising \u2014 sharpen without over-heating.",
      qiDirective: "Circulate Qi before intent \u2014 flow first, then game-speed reps.",
      seasonalAdaptation: "Lean into greens, sour notes, and early-day sunlight; give the body a real warm-up before max effort.",
      breathPrimer: "Nasal in 4 \xB7 out 6 \u2014 6 rounds. Wake the diaphragm without spiking tone."
    }
  },
  in_season: {
    phase: "in_season",
    label: "In-Season",
    volume: "low",
    intensity: "maintenance",
    cnsCapPerDay: "low",
    recoveryEmphasis: "high",
    newSkillWork: "refinement_only",
    maxSetsPerExercise: 4,
    maxHighCnsPerWeek: 1,
    toneGuidance: "Direct, confidence-preserving, focused on protecting performance and bandwidth. Never prescribe overhauls mid-season.",
    directives: [
      "Protect game-day performance \u2014 never prescribe new mechanical changes.",
      "Maintenance loading only: 60-75% intensity, low total volume.",
      "Prioritize recovery, mobility, and CNS bandwidth over hypertrophy.",
      "No more than 1 high-CNS strength session per week.",
      "Refinement cues only \u2014 no new motor patterns."
    ],
    hpi: {
      element: "Fire",
      elementQuality: "Fire \u2014 bright, expressive, easy to over-spend.",
      organEmphasis: "Heart / Fire \u2014 protect the shen (focus, sleep, confidence).",
      yinYangEmphasis: "Yang expressed, Yin protected \u2014 spend on game day, restore between.",
      qiDirective: "Preserve sharpness \u2014 small, frequent doses beat heroic sessions.",
      seasonalAdaptation: "Hydrate ahead of thirst, seek cooling foods after games, guard sleep as a performance asset.",
      breathPrimer: "Box breath 4-4-4-4 \u2014 5 rounds. Steady the shen before pitches or at-bats."
    }
  },
  post_season: {
    phase: "post_season",
    label: "Post-Season",
    volume: "low",
    intensity: "very_low",
    cnsCapPerDay: "very_low",
    recoveryEmphasis: "very_high",
    newSkillWork: "rebuild",
    maxSetsPerExercise: 3,
    maxHighCnsPerWeek: 0,
    toneGuidance: "Reflective, restorative. Frame this window as the body and mind cooling down, then preparing to grow.",
    directives: [
      "Decompression window \u2014 emphasize sleep, mobility, and pain resolution.",
      "No max-effort lifts and no high-CNS throwing/hitting volume.",
      "Address lingering pain and asymmetries before any rebuild.",
      "Begin foundational movement quality work in the final 2 weeks."
    ],
    hpi: {
      element: "Metal",
      elementQuality: "Metal \u2014 refined, quiet, letting go of what is done.",
      organEmphasis: "Lung / Metal \u2014 full breath, clean tissue, resolve lingering pain.",
      yinYangEmphasis: "Yin restoration \u2014 the season descends before it rises again.",
      qiDirective: "Downshift and repair \u2014 sleep, breathe, walk, decompress.",
      seasonalAdaptation: "Warmer clothing on cool mornings, hydrating meals, early-to-bed rhythm.",
      breathPrimer: "Long-exhale breath: in 4 \xB7 out 8 \u2014 8 rounds. Deep parasympathetic reset."
    }
  },
  off_season: {
    phase: "off_season",
    label: "Off-Season",
    volume: "high",
    intensity: "high",
    cnsCapPerDay: "high",
    recoveryEmphasis: "medium",
    newSkillWork: "high",
    maxSetsPerExercise: 6,
    maxHighCnsPerWeek: 4,
    toneGuidance: "Growth-oriented, ambitious. Willing to prescribe aggressive mechanical and physical changes when the data supports them.",
    directives: [
      "Build the engine \u2014 strength, power, mobility, and skill acquisition.",
      "Aggressive mechanical changes are encouraged when data supports them.",
      "Push CNS load with planned deload weeks every 4th week.",
      "Introduce new movement patterns and skill work freely."
    ],
    hpi: {
      element: "Water",
      elementQuality: "Water \u2014 deep, patient, storing power for the year ahead.",
      organEmphasis: "Kidney / Water \u2014 build reserves, honor sleep, respect fear signals.",
      yinYangEmphasis: "Yin storing, Yang forged \u2014 deep tank now becomes explosive later.",
      qiDirective: "Build the engine \u2014 patient volume, honest loading, deep recovery.",
      seasonalAdaptation: "Warming, protein-rich foods; salt intelligently; guard sleep and don't chase daily peaks.",
      breathPrimer: "Diaphragmatic 5-5 breath \u2014 8 rounds. Fill the tank before heavy work."
    }
  }
};
var SHORT_TO_PHASE = {
  off: "off_season",
  pre: "preseason",
  in: "in_season",
  post: "post_season"
};
function seasonPhaseFromShort(code) {
  if (!code) return "off_season";
  return SHORT_TO_PHASE[code] ?? "off_season";
}
function getSeasonHPI(phaseOrShort) {
  const phase = phaseOrShort && VALID.includes(phaseOrShort) ? phaseOrShort : seasonPhaseFromShort(phaseOrShort);
  return SEASON_PROFILES[phase].hpi;
}

// src/lib/hammer/prescription/eassLibrary.ts
var BAND_PREP_BASEBALL = [
  {
    name: "Band series \u2014 ER / IR / scap pulls / retractions",
    category: "band_prep",
    intensity: "prep",
    setup: "light band anchored at shoulder height",
    dosage: "ER 2x12, IR 2x12, scap pulls 2x12, retractions 2x10, forward flexion 2x10",
    cue: "slow, deliberate, no snap-backs \u2014 wake the cuff, do not train it"
  },
  {
    name: "Band activation series",
    category: "band_prep",
    intensity: "prep",
    setup: "activation bands or wrist-anchored bands, chest-height anchor",
    dosage: "full activation set: iron scap 2x10, reverse fly 2x10, external rotation 2x10, Y-T-W 2x8",
    cue: "shoulder blades set first, arms follow"
  },
  {
    name: "Wrist + forearm neural prep",
    category: "band_prep",
    intensity: "prep",
    dosage: "wrist circles 30s each way, pronation/supination 2x10, finger flicks 30s",
    cue: "warm the forearm before you ever load it"
  }
];
var BAND_PREP_SOFTBALL_WINDMILL = [
  {
    name: "Windmill-specific band prep \u2014 circle path activation",
    category: "band_prep",
    intensity: "prep",
    setup: "light band, anchored at hip height for windmill path",
    dosage: "hip-to-release path 2x10 each direction, ER 2x12, IR 2x12, lat pull-through 2x10",
    cue: "trace your circle path with the band \u2014 this is the shape your arm will make"
  },
  {
    name: "Wrist snap + forearm windmill prep",
    category: "band_prep",
    intensity: "prep",
    dosage: "wrist snaps 3x15, forearm rotation 2x12, finger flick sequence 30s",
    cue: "the wrist is your last accelerator \u2014 warm it or lose velo"
  },
  {
    name: "Lat + hip opener",
    category: "band_prep",
    intensity: "prep",
    dosage: "banded lat pull 2x10 per side, hip opener 2x8 per side",
    cue: "the windmill starts at the hip and finishes at the wrist"
  }
];
var TENNIS_BALL_BASEBALL = [
  {
    name: "Tennis-ball whip throws \u2014 teach fast-object finish",
    category: "tennis_ball",
    intensity: "low",
    overloadClass: "under",
    setup: "partner or wall at 20-30ft",
    dosage: "3x8 throws with intent focus, full arm circle, finish out front",
    cue: "the ball is nothing \u2014 your whip is everything. Teach the arm to fire fast."
  },
  {
    name: "Rocker-step tennis-ball throws",
    category: "tennis_ball",
    intensity: "low",
    overloadClass: "under",
    dosage: "2x10 throws at 40ft, rocker-step tempo",
    cue: "load the back leg, transfer through, whip finish"
  }
];
var TENNIS_BALL_SOFTBALL = [
  {
    name: "Tennis-ball windmill whip",
    category: "tennis_ball",
    intensity: "low",
    overloadClass: "under",
    setup: "partner at 25-35ft",
    dosage: "3x10 windmill throws with tennis ball, focus on wrist snap at release",
    cue: "circle stays tight, release out front, wrist fires last"
  }
];
var UNDERLOAD_BASEBALL = [
  {
    name: "3.5oz plyo \u2014 reverse throws (wall)",
    category: "underload",
    intensity: "low",
    overloadClass: "under",
    setup: "concrete wall, 8-10ft away, 3.5oz plyo ball",
    dosage: "2x8 reverse throws (arm slot decel work)",
    cue: "decelerate what you accelerate \u2014 this protects the back of the shoulder"
  },
  {
    name: "3.5oz plyo \u2014 pivot pickoff throws",
    category: "underload",
    intensity: "low",
    overloadClass: "under",
    dosage: "2x10 throws at 30-40ft",
    cue: "quick pivot, whip finish, teach arm speed with no weight to fight"
  },
  {
    name: "4oz plyo \u2014 connection throws",
    category: "underload",
    intensity: "moderate",
    overloadClass: "under",
    dosage: "2x8 throws at partner distance",
    cue: "torso and arm move as one \u2014 no arm-only throwing"
  }
];
var UNDERLOAD_SOFTBALL = [
  {
    name: '11" softball \u2014 underload windmill',
    category: "underload",
    intensity: "low",
    overloadClass: "under",
    dosage: '2x10 windmill throws with 11" (lighter) ball',
    cue: "same mechanics as game ball, just faster \u2014 the arm learns speed with less to fight"
  },
  {
    name: "Wrist-flick isolation throws",
    category: "underload",
    intensity: "low",
    overloadClass: "under",
    dosage: "2x12 short-distance flick throws",
    cue: "isolate the last accelerator \u2014 wrist fires cleanly at release"
  }
];
function regulationBaseball(inSeason, isPitcher3) {
  return [
    {
      name: "Regulation warm-up toss (5oz)",
      category: "regulation",
      intensity: "low",
      overloadClass: "regulation",
      dosage: inSeason ? "60ft x 10 throws at 60%" : "60ft x 15 throws at 60%",
      cue: "tall posture, finish out front, build slow"
    },
    {
      name: "Regulation extension toss (5oz)",
      category: "regulation",
      intensity: "moderate",
      overloadClass: "regulation",
      dosage: inSeason ? "to 90ft x 10 throws at 75%" : "to 120ft x 12 throws at 75%",
      cue: "the ball rises off your fingers on a line \u2014 no rainbows",
      stopIf: "any elbow twinge, shoulder pinch, or forearm tightness \u2014 stop immediately"
    }
  ];
}
function regulationSoftball(inSeason) {
  return [
    {
      name: 'Regulation warm-up toss (12" softball)',
      category: "regulation",
      intensity: "low",
      overloadClass: "regulation",
      dosage: inSeason ? "40ft x 10 throws at 60%" : "40ft x 15 throws at 60%",
      cue: "windmill path stays smooth, wrist finishes the throw"
    },
    {
      name: "Regulation extension toss",
      category: "regulation",
      intensity: "moderate",
      overloadClass: "regulation",
      dosage: inSeason ? "to 60ft x 10 throws at 75%" : "to 90ft x 12 throws at 75%",
      cue: "circle stays tight, release out front",
      stopIf: "any shoulder, elbow, or wrist pain \u2014 stop and report to Hammer"
    }
  ];
}
function longTossBaseball(isOutfield) {
  return [
    {
      name: "Long-toss extension (5oz)",
      category: "long_toss",
      intensity: "high",
      overloadClass: "regulation",
      dosage: `build to comfortable max (${isOutfield ? "300ft+" : "240ft+"} if cleared), ~15 throws total`,
      cue: "same effort, then same effort plus one \u2014 never chase distance",
      stopIf: "any twinge, command loss, or velo cliff \u2014 stop, pull back, message Hammer"
    }
  ];
}
function longTossSoftball() {
  return [
    {
      name: "Long-toss extension (windmill legal distance)",
      category: "long_toss",
      intensity: "moderate",
      overloadClass: "regulation",
      dosage: "build to ~150ft x 10 throws (overhand carry only \u2014 windmill max at 60ft)",
      cue: "if this is windmill, DO NOT crank the arm past comfortable distance",
      stopIf: "any wrist, elbow, or shoulder complaint \u2014 stop"
    }
  ];
}
var INTENT_BASEBALL = [
  {
    name: "Intent throws \u2014 pulldown phase (5oz)",
    category: "pulldown",
    intensity: "max",
    overloadClass: "regulation",
    setup: "walking the distance back in from long-toss max",
    dosage: "6-8 throws, walk in, do not exceed 90% perceived effort",
    cue: "quality over number \u2014 do not chase the gun",
    stopIf: "command loss, mechanics change, or any joint feedback \u2014 stop"
  }
];
var INTENT_SOFTBALL = [
  {
    name: "Windmill intent set \u2014 max-effort circle",
    category: "intent",
    intensity: "max",
    overloadClass: "regulation",
    dosage: "6-8 pitches at 90% intent from mound distance",
    cue: "trust your circle \u2014 mechanics before max",
    stopIf: "any shoulder / elbow / lat complaint \u2014 stop"
  }
];
var OVERLOAD_BASEBALL = [
  {
    name: "6oz overload plyo \u2014 connection throws",
    category: "overload",
    intensity: "moderate",
    overloadClass: "over",
    setup: "6oz plyo ball, partner at 30-45ft",
    dosage: "2x6 throws, focus on staying connected \u2014 do NOT arm-only",
    cue: "the heavier ball punishes any arm-only throwing \u2014 feel the whole body work",
    stopIf: "any joint feedback whatsoever \u2014 stop, this is a bonus tool not a requirement"
  }
];
function positionSkillBaseball(pos, inSeason) {
  switch (pos) {
    case "pitcher":
      return [
        {
          name: "Full-go: command bullpen with counts (mound or flat ground)",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          stage: "full_go",
          dosage: inSeason ? "20 pitches to a target at 75%" : "30 pitches, focus pitch + secondary at 80%",
          cue: "call every pitch and play counts (start 1-1, 2-2); every pitch with intent; miss small, finish out front; write down your pitch count and strikes",
          stopIf: "command falls off or velo drops noticeably \u2014 stop"
        }
      ];
    case "catcher":
      return [
        {
          name: "Pop-time footwork (no throw)",
          category: "position_skill",
          intensity: "moderate",
          dosage: "8 reps",
          cue: "transfer first, throw second"
        },
        {
          name: "Block-to-throw rep",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          dosage: inSeason ? "6 game-rep throws" : "12 throws",
          cue: "low and balanced before you release",
          stopIf: "knee, hip, or shoulder pain \u2014 stop"
        }
      ];
    case "infield":
      return [
        {
          name: "Routine ground-ball throw",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          dosage: inSeason ? "10 throws at 80%" : "20 throws",
          cue: "footwork before arm, throw on plane"
        },
        {
          name: "Double-play / quick-release rep",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          dosage: inSeason ? "6 reps" : "12 reps",
          cue: "feet square the target, the arm follows"
        }
      ];
    case "outfield":
      return [
        {
          name: "Crow-hop throw to a base",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          dosage: inSeason ? "8 throws at 85%" : "15 throws",
          cue: "throw through the cutoff line, do not loop it",
          stopIf: "any shoulder or elbow grab \u2014 stop"
        },
        {
          name: "One-hop accuracy throw",
          category: "position_skill",
          intensity: "high",
          overloadClass: "regulation",
          dosage: "8 throws to a target",
          cue: "one-hop the cutoff, not the catcher"
        }
      ];
    default:
      return [
        {
          name: "Mixed-position throws",
          category: "position_skill",
          intensity: "moderate",
          overloadClass: "regulation",
          dosage: inSeason ? "10 throws" : "20 throws",
          cue: "match footwork to the position you're throwing from"
        }
      ];
  }
}
function positionSkillSoftball(pos, inSeason) {
  if (pos === "pitcher") {
    return [
      {
        name: "Circle-of-power windmill drill",
        category: "windmill_circle",
        intensity: "moderate",
        overloadClass: "regulation",
        dosage: "3x8 windmill circles at 70%, focus on tight circle path",
        cue: "hand stays close to your body through the top of the circle"
      },
      {
        name: "K-drill (windmill mechanics)",
        category: "windmill_circle",
        intensity: "moderate",
        overloadClass: "regulation",
        dosage: "2x10 K-drill reps per set",
        cue: "back leg drives, front leg posts, arm circles behind \u2014 sequence not simultaneous"
      },
      {
        name: "Full-go: bullpen with counts (windmill)",
        category: "position_skill",
        intensity: "high",
        overloadClass: "regulation",
        stage: "full_go",
        dosage: inSeason ? "20 pitches at 75% mixing rise/drop/change" : "30 pitches building spin efficiency",
        cue: "full-go: call every pitch and play counts (start 1-1, 2-2); every pitch with intent \u2014 spin first, velo second; write down your pitch count and strikes",
        stopIf: "wrist / elbow / shoulder / lat / hip complaint \u2014 stop"
      }
    ];
  }
  if (pos === "catcher") {
    return [
      {
        name: "Pop-time footwork (no throw)",
        category: "position_skill",
        intensity: "moderate",
        dosage: "8 reps",
        cue: "quick transfer, feet under you"
      },
      {
        name: "Throw-down rep to 2B",
        category: "position_skill",
        intensity: "high",
        overloadClass: "regulation",
        dosage: inSeason ? "6 throws" : "12 throws",
        cue: "low and balanced before you release",
        stopIf: "knee, hip, or shoulder pain \u2014 stop"
      }
    ];
  }
  if (pos === "infield") {
    return [
      {
        name: "Routine ground-ball throw",
        category: "position_skill",
        intensity: "high",
        overloadClass: "regulation",
        dosage: inSeason ? "10 throws" : "20 throws",
        cue: "footwork before arm"
      }
    ];
  }
  if (pos === "outfield") {
    return [
      {
        name: "Crow-hop throw to a base",
        category: "position_skill",
        intensity: "high",
        overloadClass: "regulation",
        dosage: inSeason ? "8 throws" : "15 throws",
        cue: "throw through the cutoff line"
      }
    ];
  }
  return [
    {
      name: "Mixed-position throws",
      category: "position_skill",
      intensity: "moderate",
      overloadClass: "regulation",
      dosage: inSeason ? "10 throws" : "20 throws",
      cue: "match footwork to the position you're throwing from"
    }
  ];
}
var COOLDOWN_UNIVERSAL = [
  {
    name: "Arm-care cooldown",
    category: "cooldown",
    intensity: "low",
    dosage: "sleeper stretch 2x30s per side, cross-body 2x30s, light forearm massage 2 min",
    cue: "long exhales, no straining the joint"
  }
];
var RECOVERY_ONLY = [
  {
    name: "Cuff/scap activation \u2014 low intensity",
    category: "recovery",
    intensity: "prep",
    dosage: "ER 1x10, IR 1x10, scap pulls 1x10 \u2014 recovery pace only",
    setup: "Use a light resistance band with a secure anchor. ER means rotate your forearm away from your body; IR means rotate it toward your body. Keep your elbow bent and close to your side. For scap pulls, gently draw your shoulder blades back without shrugging.",
    stopIf: "Stop for shoulder or elbow pain, pinching, numbness or tingling. Follow your professional\u2019s injury instructions.",
    cue: "blood flow, not stimulus"
  },
  {
    name: "Wrist + forearm mobility flush",
    category: "recovery",
    intensity: "prep",
    dosage: "wrist circles 30s each way, forearm massage 90s per side",
    setup: "Sit or stand comfortably with your forearm supported. Make slow wrist circles in each direction, then gently massage the forearm with your opposite hand.",
    stopIf: "Stop for pain, numbness or tingling. Do not press into an injured or painful area.",
    cue: "gentle \u2014 the point is to flush, not to work"
  },
  {
    name: "Sleeper + cross-body stretch",
    category: "recovery",
    intensity: "prep",
    dosage: "sleeper 2x30s per side, cross-body 2x30s",
    setup: "For the sleeper stretch, lie on your side with your elbow bent and gently guide your forearm toward the floor with your other hand. For cross-body, bring your arm across your chest and support it with your opposite hand. Use only a comfortable range.",
    stopIf: "Stop for shoulder pain, pinching, numbness or tingling. Never force the stretch; follow your professional\u2019s injury instructions.",
    cue: "long exhales, relax into the stretch"
  }
];
var OVERLOAD_CUES = [
  "Overload is a tool, not a requirement \u2014 you earned it today.",
  "The heavy ball exposes any arm-only throwing. Stay connected."
];
var UNIVERSAL_CUES = [
  "Footwork before arm \u2014 every throw.",
  "Build distance and intent, never start there.",
  "Fast objects teach fast movement. Underload before overload."
];
var UNIVERSAL_STOP = [
  "Sharp pain anywhere in the arm \u2014 stop, ice, message Hammer.",
  "Elbow grab, shoulder pinch, or forearm tightness \u2014 stop the session.",
  "Sudden velo drop or command loss \u2014 stop, that's the body talking."
];
function overloadEligible(ctx) {
  if (ctx.sport === "softball") return false;
  if (ctx.armSore) return false;
  if (ctx.injuryRegions.some((r) => ["shoulder", "elbow", "ucl", "forearm"].includes(r))) return false;
  if (ctx.isGameDay) return false;
  if ((ctx.ageYears ?? 0) < 16) return false;
  if ((ctx.trainingAgeYears ?? 0) < 3) return false;
  if (ctx.seasonPhase !== "off") return false;
  if ((ctx.readinessScore ?? 1) < 0.6) return false;
  return true;
}
function intentEligible(ctx) {
  if (ctx.armSore) return false;
  if (ctx.injuryRegions.some((r) => ["shoulder", "elbow", "ucl"].includes(r))) return false;
  if (ctx.isGameDay) return false;
  if ((ctx.ageYears ?? 0) < 13) return false;
  if (ctx.seasonPhase === "in") return ctx.position === "pitcher";
  if ((ctx.readinessScore ?? 1) < 0.5) return false;
  return true;
}
function buildEassPrescription(ctx) {
  const isSoftball = ctx.sport === "softball";
  const isPitcher3 = ctx.position === "pitcher";
  const armBlocked = ctx.injuryRegions.includes("shoulder") || ctx.injuryRegions.includes("ucl") || ctx.injuryRegions.includes("elbow") || ctx.injuryRegions.includes("forearm");
  if (armBlocked) {
    const drills2 = [
      ...(isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL).map((d2) => ({
        ...d2,
        dosage: d2.dosage.replace(/2x/g, "1x"),
        cue: `${d2.cue} \u2014 recovery pace today`
      })),
      {
        name: "Sub-max catch play",
        category: "regulation",
        intensity: "low",
        overloadClass: "regulation",
        dosage: "10 min, never past comfortable distance, never past 70% intent",
        cue: "every throw is a check-in \u2014 does it feel the same as the last one?",
        stopIf: "any sharp pain, twinge, pinch, or velo cliff \u2014 stop now and message Hammer"
      },
      ...COOLDOWN_UNIVERSAL
    ];
    return {
      mode: "arm_protected",
      title: `EASS Throwing \u2014 arm-protected (${isSoftball ? "windmill" : "overhand"})`,
      why: `Injury (${ctx.injuryRegions.join(", ")}) \u2014 no max throws today. Elastic prep + arm care only.`,
      roadmapReason: "Injury supremacy \u2014 reported pain overrides any inferred readiness.",
      drills: drills2,
      cues: [...UNIVERSAL_CUES, "Athlete-reported pain always outranks anything I infer."],
      stopRules: UNIVERSAL_STOP,
      durationMin: 22,
      overloadUsed: false,
      softballWindmill: isSoftball && isPitcher3
    };
  }
  if (ctx.isRecoveryDay || (ctx.readinessScore ?? 1) < 0.4) {
    return {
      mode: "recovery_day",
      title: "EASS Throwing \u2014 recovery day",
      why: "Readiness signal is low \u2014 protect the arm, flush the tissues.",
      roadmapReason: "Recovery day \u2014 the elastic system rebuilds when you let it.",
      drills: RECOVERY_ONLY,
      cues: ["Recovery is training. Do it well.", "No throws today \u2014 the arm banks it."],
      stopRules: UNIVERSAL_STOP,
      durationMin: 15,
      overloadUsed: false,
      softballWindmill: isSoftball && isPitcher3
    };
  }
  if (ctx.isGameDay) {
    const prep2 = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
    const lightCatch = {
      name: isSoftball ? "Game-day windmill warm-up toss" : "Game-day warm-up toss",
      category: "regulation",
      intensity: "low",
      overloadClass: "regulation",
      dosage: "60ft x 10 throws at 60% (build, never max)",
      cue: "save every real throw for the game",
      stopIf: "anything unusual \u2014 stop, tell your coach and Hammer"
    };
    return {
      mode: "game_day_prep",
      title: `EASS Throwing \u2014 game-day prep (${isSoftball ? "windmill" : "overhand"})`,
      why: "Game day. Only prep \u2014 the arm's real work is inside the lines today.",
      roadmapReason: "Game day suppresses long-toss, pulldowns, and overload. Neural prep only.",
      drills: [...prep2, lightCatch, ...COOLDOWN_UNIVERSAL],
      cues: [...UNIVERSAL_CUES, "The game IS the training load today."],
      stopRules: UNIVERSAL_STOP,
      durationMin: 15,
      overloadUsed: false,
      softballWindmill: isSoftball && isPitcher3
    };
  }
  const plyoOk = true;
  if (!ctx.isThrowingDay) {
    const prep2 = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
    const under = isSoftball ? [...TENNIS_BALL_SOFTBALL, ...plyoOk ? UNDERLOAD_SOFTBALL.slice(0, 1) : []] : [...TENNIS_BALL_BASEBALL, ...plyoOk ? UNDERLOAD_BASEBALL.slice(0, 1) : []];
    return {
      mode: "non_throwing_day",
      title: `EASS Throwing \u2014 non-throwing (fast-object + neural)`,
      why: "Non-throwing day \u2014 feed the elastic system without accumulating throwing volume.",
      roadmapReason: "Fast objects daily; regulation catch-play on throwing days. This is how you build the arm year-round.",
      drills: [...prep2, ...under, ...COOLDOWN_UNIVERSAL],
      cues: [...UNIVERSAL_CUES, "The band + tennis-ball day IS training \u2014 never skip it."],
      stopRules: UNIVERSAL_STOP,
      durationMin: 22,
      overloadUsed: false,
      softballWindmill: isSoftball && isPitcher3
    };
  }
  const inSeason = ctx.seasonPhase === "in";
  const offSeason = ctx.seasonPhase === "off";
  const preSeason = ctx.seasonPhase === "pre";
  const postSeason = ctx.seasonPhase === "post";
  const isPositionPlayer = !isPitcher3;
  const prep = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
  const tennisBall = isSoftball ? TENNIS_BALL_SOFTBALL : TENNIS_BALL_BASEBALL;
  const underload = isSoftball ? UNDERLOAD_SOFTBALL : UNDERLOAD_BASEBALL;
  const regulation = isSoftball ? regulationSoftball(inSeason) : regulationBaseball(inSeason, isPitcher3);
  const positionSkill = (isSoftball ? positionSkillSoftball(ctx.position, inSeason) : positionSkillBaseball(ctx.position, inSeason)).filter((d2) => !(ctx.armSore && d2.stage === "full_go"));
  const scaledPrep = isPositionPlayer ? prep.map((d2) => ({ ...d2, dosage: d2.dosage.replace(/2x/g, "1x") })) : prep;
  const underloadCount = isPositionPlayer || !plyoOk ? 0 : offSeason ? 3 : 1;
  const regulationTrimmed = isPositionPlayer ? regulation.slice(0, 2) : regulation;
  const drills = [
    ...scaledPrep,
    ...tennisBall.slice(0, 1),
    ...underload.slice(0, underloadCount),
    ...regulationTrimmed
  ];
  if ((offSeason || preSeason) && (isPitcher3 || ctx.position === "outfield")) {
    drills.push(...isSoftball ? longTossSoftball() : longTossBaseball(ctx.position === "outfield"));
  }
  const intentOk = isPitcher3 && intentEligible(ctx);
  if (intentOk) {
    if (isSoftball) drills.push(...INTENT_SOFTBALL);
    else drills.push(...INTENT_BASEBALL);
  }
  const overloadOk = isPitcher3 && overloadEligible(ctx);
  if (overloadOk) drills.push(...OVERLOAD_BASEBALL);
  drills.push(...positionSkill, ...COOLDOWN_UNIVERSAL);
  const posLabel = ctx.position;
  const seasonLabel = inSeason ? "in-season" : offSeason ? "off-season" : preSeason ? "pre-season" : postSeason ? "post-season" : "standard";
  const mode = inSeason ? "throwing_day_maintain" : preSeason ? "throwing_day_ramp" : "throwing_day_build";
  const pitcherDuration = inSeason ? 22 : offSeason ? 48 : preSeason ? 35 : postSeason ? 22 : 30;
  const positionPlayerDuration = inSeason ? 12 : offSeason ? 22 : preSeason ? 18 : postSeason ? 12 : 15;
  const durationMin = isPositionPlayer ? positionPlayerDuration : pitcherDuration;
  const cues = [...UNIVERSAL_CUES];
  if (overloadOk) cues.push(...OVERLOAD_CUES);
  if (isSoftball && isPitcher3) cues.push("Windmill velo lives in the circle path \u2014 protect it.");
  if (isPositionPlayer) cues.push("Position-player arm care \u2014 enough to stay healthy, never a pitcher's volume.");
  return {
    mode,
    title: `EASS Throwing \u2014 ${seasonLabel} ${posLabel}${isSoftball && isPitcher3 ? " (windmill)" : ""}`,
    why: isPositionPlayer ? `Position-player arm care: band prep \u2192 fast-object \u2192 short regulation catch \u2192 position skill \u2192 cooldown. No pitcher-load work.` : `Whole-body elastic ${isSoftball && isPitcher3 ? "windmill" : "throwing"} stack: band prep \u2192 fast-object \u2192 underload \u2192 regulation${offSeason || preSeason ? " \u2192 long-toss" : ""}${intentOk ? " \u2192 intent" : ""}${overloadOk ? " \u2192 overload" : ""} \u2192 position skill \u2192 cooldown.`,
    roadmapReason: `${seasonLabel.charAt(0).toUpperCase() + seasonLabel.slice(1)} \u2014 ${offSeason ? "build the elastic base now so you can spend it in season." : inSeason ? "maintain freshness; save max throws for competition." : preSeason ? "ramp intent week over week without overspend." : "protect the joint while staying connected."}`,
    drills,
    cues,
    stopRules: UNIVERSAL_STOP,
    durationMin,
    overloadUsed: overloadOk,
    softballWindmill: isSoftball && isPitcher3
  };
}
function normalizePosition(pos) {
  const token = firstPositionToken(pos);
  if (!token) return "utility";
  const p = token.toUpperCase();
  if (p === "P" || p === "PITCHER" || p === "SP" || p === "RP") return "pitcher";
  if (p === "C" || p === "CATCHER") return "catcher";
  if (["1B", "2B", "3B", "SS", "IF", "INFIELD"].includes(p)) return "infield";
  if (["LF", "CF", "RF", "OF", "OUTFIELD"].includes(p)) return "outfield";
  if (p === "DH" || p === "DESIGNATED_HITTER") return "dh";
  return "utility";
}
function normalizeSport(sport) {
  const s = typeof sport === "string" ? sport.toLowerCase() : "";
  if (s.includes("soft")) return "softball";
  return "baseball";
}

// src/lib/hammer/prescription/defenseExecution.ts
var FIELDING_READS = /* @__PURE__ */ new Set([
  "Short-hop blocking angles",
  "Blocking recovery to ball",
  "Block-and-recover",
  "Blocking \u2014 screwball/drop",
  "Comebacker glove work",
  "Comebackers + turn to 2B",
  "Comebackers + turn",
  "Comebacker primer",
  "Windmill follow-through into fielding position",
  "Follow-through into set",
  "Cover 1B on 3-6-1 / 3-6-3",
  "Cover 1B on 3-6-1",
  "Pick footwork \u2014 stretch to all angles",
  "Stretch & pick \u2014 4 angles",
  "Stretch \u2014 4 angles",
  "Stretch to all angles",
  "Backhand & forehand range",
  "Backhand range",
  "Backhand primer",
  "Slow-roller barehand",
  "Slap read + barehand",
  "Slap barehand primer",
  "Slap-bunt charge",
  "Pop-up communication \u2014 infield fly rule reps",
  "Backhand at the line",
  "Backhand down the line",
  "In-between hop reads",
  "Crossover first step",
  "Gap reads with wing (LF & RF)",
  "Rise-ball tracking",
  "Rise-ball tracking primer",
  "Slap-hit read \u2014 soft line drive in front"
]);
function defenseExecutionKind(name) {
  return FIELDING_READS.has(name) ? "fielding_reads" : void 0;
}

// src/lib/hammer/prescription/defenseGuides.ts
function norm2(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
var G = {
  // ============ CATCHER =====================================================
  receiving_one_knee: {
    what: "You catch pitches from a one-knee stance (glove-side knee down). You're not trying to move the ball \u2014 you're trying to catch each pitch so quiet and so on-plane that a borderline strike stays a strike.",
    setup: "Down leg: glove-side knee on the ground with the shin lined up under your hip. Other leg: foot flat, thigh open ~45\xB0. Mitt out in front of the plate, thumb rotated slightly upward, elbow soft. Partner or machine throws from mound distance.",
    goodRep: [
      "Glove starts slightly below the ball and works UP to the catch on low pitches, DOWN to the catch on high pitches.",
      "Thumb stays up on the catch \u2014 never sideways.",
      "You freeze the glove for a half-count after the ball hits the pocket (the umpire has time to see it).",
      "Zero head movement \u2014 eyes track the ball into the pocket."
    ],
    badRep: [
      "Stabbing at the ball with a stiff wrist.",
      "Catching a low pitch by dropping the elbow (you'll pull the ball out of the zone).",
      "Setting up too close to the hitter \u2014 you lose your bottom of the zone.",
      "Standing up between pitches (kills the umpire's sightline)."
    ],
    feel: "Quiet hands, calm shoulders, breath out on the catch. It should feel like the ball is landing in a pillow that doesn't move.",
    whyToday: "Framing is the highest-leverage skill a catcher owns \u2014 a strike stolen is a run saved. This block trains the neural pattern before you ever get to a live bullpen.",
    nextLink: "You'll feed the same quiet-glove pattern into pop-time work and into live bullpens later this week.",
    stopIf: "Knee, hip, or lower-back pain \u2014 come off the knee and switch to a squat receiving primer.",
    tierNotes: {
      beginner: "Focus on a quiet glove and a steady catch. Use only the equipment and setup confirmed for this drill. Follow the dose shown on this card; do not add catches.",
      developing: "Coach short-tosses from 30 ft with a real baseball/softball. Add a 1-second freeze count on every catch.",
      advanced: "Machine or bullpen distance. Add corner targets and score yourself: 20/25 quiet catches or you repeat the round.",
      elite: "Live bullpen or high-velo machine. Camera behind you \u2014 audit the freeze on every catch. Any glove drift is a failed rep."
    }
  },
  framing_ladder: {
    what: "You receive one pitch to each of the four corners of the strike zone (up-in, up-away, down-in, down-away) in order, then repeat. Trains the small glove-load direction change for each zone.",
    setup: "One-knee stance behind the plate. Partner or coach throws to a called corner from 30\u201340 ft. A hitter or a bat placed at the plate helps you frame the zone honestly.",
    goodRep: [
      "Glove pre-loads TOWARD the target corner before the pitch (not after).",
      "Catch is a small hinge, not a swipe.",
      "Ball ends up inside the zone, not pulled out of it.",
      "Freeze for a full second after the catch on every rep."
    ],
    badRep: [
      "Pulling the ball into the zone with a big arm swing \u2014 the umpire sees it.",
      "Catching every pitch with the same glove path \u2014 no corner-specific load.",
      "Rushing the throw-back to the pitcher (breaks the freeze)."
    ],
    feel: "Deliberate. Slow. Like painting each corner instead of grabbing at it.",
    whyToday: "Turns the receiving primer into corner-specific muscle memory \u2014 this is how you steal 5\u201310 strikes per game.",
    nextLink: "Rolls straight into blocking so you can flip from finesse to protecting the plate.",
    tierNotes: {
      beginner: "8 balls per corner. Coach names the corner out loud before the pitch.",
      developing: "8 balls per corner, coach names the corner AFTER release so you react.",
      advanced: "6 per corner, corners unannounced. Score: 5/6 clean-freeze catches or repeat.",
      elite: "Machine + corner mixer. Coach adds a shadow hitter. Umpire evaluates strike calls after the round."
    }
  },
  blocking_short_hop: {
    what: "You take short-hop pitches (drop, curve, screwball, or a coach's short-toss) and block them dead in front of you so the runner can't advance. Priority is chest to the ball, chin down, keep it in front.",
    setup: "Full gear (chest, mask, shin guards, cup, mitt). One-knee or squared stance. Coach kneels 20 ft in front and throws short-hops to the middle, then to your right, then to your left.",
    goodRep: [
      "You drop into the block, you don't stand and reach.",
      "Chin tucks to the chest \u2014 mask covers the throat.",
      "Chest angles down at the ball so the ball dies in front (soft, quiet).",
      "Mitt goes to the ground between your legs to seal the middle."
    ],
    badRep: [
      "Trying to catch a block with your glove instead of your chest.",
      "Turning your shoulder to the ball (you'll deflect it into the runner's advance path).",
      "Head up \u2014 the ball hits the throat.",
      "Popping up too fast \u2014 the ball squirts away before you locate it."
    ],
    feel: "Compact. Heavy. You want to feel like a wall, not like you're catching.",
    whyToday: "You cannot be a real catcher without honest blocking. This drill is your insurance policy for every breaking ball your pitcher throws.",
    nextLink: "Pairs with block-and-recover so you learn to pop up, locate the ball, and stop the runner.",
    stopIf: "Sharp chest, sternum, or throat pain \u2014 stop, re-check gear fit before continuing.",
    tierNotes: {
      beginner: "Keep the required protective gear on. Learn to drop the chest and tuck the chin at a controlled pace. Follow the dose shown on this card.",
      developing: "Full gear, real ball, coach at 25 ft. 3\xD710 (middle-right-left) with a 3-second recover between reps.",
      advanced: "Full gear, machine short-hops, 3\xD710 to each direction with a live runner cue after every block.",
      elite: "Live bullpen breaking balls in the dirt. Camera on chest angle. Any deflection past 8 ft = failed rep."
    }
  },
  block_recover: {
    what: "Block a short-hop, pop UP into your feet, locate the ball, and simulate throwing to a base to hold the runner. Trains the finish of the play, not just the block.",
    setup: "Same as blocking short-hop. After the block, a partner points to 1B/2B/3B and you rise, find the ball, and go through the throwing motion.",
    goodRep: [
      "Block first, feet second \u2014 never the other way around.",
      "You pop up onto BOTH feet before you look for the ball.",
      "Eyes find the ball before the head turns to the base.",
      "Throw is a snap-and-set, not a full throw (unless coach signals live)."
    ],
    badRep: [
      "Rising as you block (ball squirts out).",
      "Looking at the base before you have the ball secured.",
      "Slow shuffle after the block \u2014 the runner already stole the base."
    ],
    feel: "Explosive up, calm on the throw.",
    whyToday: "Blocking with no recovery = the runner still gets the base. This turns the block into a real out.",
    nextLink: "Pop-time footwork gets built on the same lower-half pop mechanic.",
    tierNotes: {
      beginner: "Foam ball short-hops, no throw \u2014 just pop up and point to the base.",
      developing: "Real ball, dry throw to base (no runner).",
      advanced: "Live-runner cue, 90% throw to base.",
      elite: "Timed pop-and-throw \u2264 2.2 s pop-to-catch at 2B off the block."
    }
  },
  pop_time: {
    what: "You catch a pitch, transfer to your throwing hand, replace your feet, and throw to 2B (or another base) as fast as possible. Pop-time = the seconds from ball hitting glove to ball hitting the base receiver.",
    setup: "Full gear. Coach or machine throws from mound distance. Partner receives at 2B with a stopwatch (elite: two-camera pop timer). Baseball target: \u2264 2.0 s. Softball target: \u2264 1.9 s.",
    goodRep: [
      "Feet replace as the ball arrives \u2014 right foot behind the left, then step-throw over the front hip.",
      "Ball comes out of the glove with a four-seam grip (no slider spin).",
      "Throw is a snap over the top, not a long-arm windup.",
      "Chest points at the base on release."
    ],
    badRep: [
      "Standing up before you catch (you'll lose the pitch AND the throw).",
      "Rounding the transfer (ball wobbles, throw sails).",
      "Full-arm windup (adds 0.3 s \u2014 you'll never throw anyone out)."
    ],
    feel: "Compact and explosive \u2014 like uncoiling a spring, not swinging a bat.",
    whyToday: "This is the single most valuable throw a catcher makes. Every 0.1 s off your pop-time is another runner you catch.",
    nextLink: "Grip and transfer carry into slap-bunt barehand and into the bunt pick-and-throw.",
    stopIf: "Shoulder or elbow pain on the throw \u2014 cut to dry footwork only.",
    tierNotes: {
      beginner: "Dry footwork ONLY (no ball). 3\xD78 to feel the replace-step.",
      developing: "Ball transfers with a soft partner-toss from 15 ft, still no long throw. 2\xD75.",
      advanced: "Live pop-time to 2B, timed. Baseball: \u2264 2.1 s. Softball: \u2264 2.0 s.",
      elite: "Live pop-time on a game-day arm. Baseball: \u2264 1.95 s. Softball: \u2264 1.85 s. Filmed and reviewed."
    }
  },
  foul_pop: {
    what: "You track a popped-up foul ball, flip your mask off in the OPPOSITE direction of the ball, then find it late and catch it above your head.",
    setup: "Full gear behind the plate. Coach uses a fungo or hand-toss to launch a high pop-up straight up or slightly off the plate. Screen or padded net to absorb misses.",
    goodRep: [
      "You feel the ball come off the bat, IMMEDIATELY turn your back to the field, and search up.",
      "Mask flips off with a firm two-hand toss AWAY from the ball's path.",
      "Catch is above the head with the mitt open like a basket.",
      "Second hand comes over on the catch."
    ],
    badRep: [
      "Flipping the mask off toward the ball (you'll trip on it).",
      "Drifting under the ball with your chest \u2014 the spin makes you miss.",
      "Reaching out in front instead of catching overhead."
    ],
    feel: "Chaotic at first, then patient \u2014 like the ball hangs there and waits for you.",
    whyToday: "A caught foul pop is a free out. Missing one costs your pitcher an extra AB and 8+ pitches.",
    nextLink: "Trains the same overhead track that outfielders use \u2014 carries over to any high pop or lazy fly.",
    tierNotes: {
      beginner: "No mask flip yet \u2014 just learn the turn-and-find with a lobbed tennis ball.",
      developing: "Add the mask flip (empty mask) with a real pop.",
      advanced: "Live gear, coach mixes fair-side and foul-side pops.",
      elite: "Full-speed fungo pops with wind \u2014 catch percentage \u2265 90% or repeat the round."
    }
  },
  bunt_pick_throw: {
    what: "A bunt is placed in front of the plate. You explode out of the crouch, field with two hands, use your footwork to align to the throwing base, and deliver a strong throw.",
    setup: "Coach places (or hits) a bunt within 15 ft of the plate. Full gear. Bases occupied by cones or partners for realistic footwork.",
    goodRep: [
      "First step is with the throwing-side foot to clear the ball.",
      "You field with two hands \u2014 glove low, throwing hand covers.",
      "Feet align with the target base BEFORE the throw.",
      "Throw is over the top and firm \u2014 no side-arm dart."
    ],
    badRep: [
      "Scooping with one hand on the run (fumble).",
      "Throwing on the wrong foot (sailing throw).",
      "Barehanding a ball that's still moving fast \u2014 bare-hand only when it's stopped or crawling."
    ],
    feel: "Aggressive but controlled \u2014 like sprinting to pick up a wallet you just dropped.",
    whyToday: "Bunts change every close game. A clean bunt-pick play is a defensive statement.",
    nextLink: "Same footwork idea as PFP bunt coverage for pitchers.",
    tierNotes: {
      beginner: "Ball placed stationary. Walk through the field-and-throw. 6 reps.",
      developing: "Slow-rolled bunts. Live footwork, dry throw. 6 reps per base.",
      advanced: "Live bunts off the bat, real throws.",
      elite: "Live BP bunts + baserunner. Timed under 3.4 s from bat contact to base catch."
    }
  },
  // ============ PITCHER (PFP) ==============================================
  pfp_1_3_1: {
    what: "Pitcher's Fielding Practice with two kinds of rep, one play per rep. Rep A: field a comebacker and throw to first (1-3). Rep B: on a ground ball to the right side, run to cover first and take the throw from the first baseman (3-1). Alternate A and B.",
    setup: "Bullpen mound to home. First baseman at 1B, coach hits a comebacker at the pitcher after delivery. Bases marked with cones as needed.",
    goodRep: [
      "After delivery, you land square with your glove up \u2014 ready to react.",
      "Inside the 45-ft line: soft underhand toss led out in front of the 1B.",
      "Outside the 45-ft line: overhand chest-high throw.",
      "Rep B only: break to first on contact, run a curved path, and step on the inside of the bag as you catch the throw."
    ],
    badRep: [
      "Sidearm/flip throws that pull the 1B off the bag.",
      "Sprinting to the bag with your hips closed \u2014 you can't catch the throw.",
      "Under-hand toss from too far (bloops it, runner is safe)."
    ],
    feel: "Reactive first, then decisive \u2014 recognize distance, then commit to the throw type.",
    whyToday: "Every pitcher gets a comebacker in a season. The ones who make the play win their coach's trust for good.",
    nextLink: "Same footwork family as covering 1B on a 3-6-1 double play.",
    stopIf: "Sharp elbow or shoulder pain on the throw \u2014 dry footwork only.",
    tierNotes: {
      beginner: "Walk-through only, no batter, coach rolls the ball at you. 4 reps.",
      developing: "Coach fungoes at 60%. Real toss/throw to 1B. 6 reps.",
      advanced: "Live BP comebackers. 8 reps.",
      elite: "Full simulated inning, one play per rep: 3 comebackers, 2 bunts and 1 cover of first. Under a coach's stopwatch."
    }
  },
  comebacker_glove: {
    what: "You field a ball hit directly back at you off the bat, glove-first, and turn to throw the runner out at a base.",
    setup: "Bullpen mound. Coach fungoes comebackers at increasing velocity. Middle infielders at 2B and 1B as needed.",
    goodRep: [
      "You land square from your delivery \u2014 your glove is UP and your feet are set.",
      "First move is your glove to the ball, not a step to the side.",
      "You gather the ball into two hands before you turn.",
      "Spin is glove-side (for a right-hander) to 2B, or first-base side to 1B."
    ],
    badRep: [
      "Ducking or turning away from a hard comebacker (you HAVE to attack the ball).",
      "Trying to bare-hand a comebacker \u2014 glove first, always.",
      "Rushing the throw and short-hopping the middle infielder."
    ],
    feel: "Athletic and fearless. You're a fielder the second the ball leaves your hand.",
    whyToday: "Comebackers are the fastest reactions a pitcher owns. Reps here save you from staring at a ball at your ankles in a real game.",
    nextLink: "Sets up 1-3-1 PFP and any turn-to-2B double-play sequence.",
    stopIf: "You feel unsafe with the fungo velocity \u2014 coach cuts speed 20%.",
    tierNotes: {
      beginner: "Coach hand-rolls the ball at walk pace. 3\xD75.",
      developing: "Slow fungoes from 45 ft, real feet-set finish. 3\xD78.",
      advanced: "Live BP comebackers off a machine or elite fungo. 3\xD710.",
      elite: "Machine at 90+ mph exit velocity or live BP. Timed glove-to-base \u2264 2.0 s."
    }
  },
  cover_1b: {
    what: "On a ball hit to the right side of the infield, the pitcher sprints from the mound to cover first base for the throw from the first baseman.",
    setup: "Coach hits a slow chopper toward 1B or 2B, forcing the first baseman to field it and flip. Pitcher must break to 1B immediately after delivery.",
    goodRep: [
      "You break AFTER your follow-through \u2014 never before (that's a balk).",
      "Path curves so you approach the bag running parallel to the foul line (safer for the runner and for you).",
      "You touch the INSIDE of the bag with your right foot on the run.",
      "Catch the throw on the run \u2014 never wait flat-footed."
    ],
    badRep: [
      "Stepping on the foul-line side of the bag \u2014 collision with the runner.",
      "Slowing down to catch the ball \u2014 the runner beats you.",
      "Coming across in a straight line and reaching (you'll trip on the bag)."
    ],
    feel: "Full sprint, then quiet feet as you approach the bag.",
    whyToday: "This is a play pitchers make every game and blow every game. Reps make it automatic.",
    nextLink: "Same footwork as 3-6-1 double play cover.",
    tierNotes: {
      beginner: "Walk pace, learn the path and the bag-inside touch. 4 reps.",
      developing: "Jog pace, live 1B throw. 6 reps.",
      advanced: "Full-speed with a coach timing the sprint (target \u2264 3.0 s from mound to bag).",
      elite: "Live BP + baserunner. Beat the runner 8/8 or repeat."
    }
  },
  bunt_fielding: {
    what: "You field a bunt on the move and deliver a strong, accurate throw to the correct base to record an out or hold the lead runner.",
    setup: "Coach places or slow-rolls a bunt inside the 20-ft radius of the plate. Bases occupied by cones or partners. Fielder starts in normal position.",
    goodRep: [
      "First step is TOWARD the ball, then the play direction opens up.",
      "You field with two hands, glove low, throwing hand covers.",
      "Feet align to the target base BEFORE the throw.",
      "Throw is short-armed and firm \u2014 no long windup."
    ],
    badRep: [
      "One-handed scoop on the run (fumble).",
      "Throwing across your body off the wrong foot (sails).",
      "Bare-hand attempt on a rolling ball \u2014 bare-hand ONLY on a stationary or crawling ball."
    ],
    feel: "Downhill and controlled \u2014 like a running quarterback who never loses sight of the receiver.",
    whyToday: "Bunts decide close games. A clean pick-and-throw sequence is a defensive statement.",
    nextLink: "Same footwork idea as any pop-and-throw play.",
    tierNotes: {
      beginner: "Ball placed stationary. Walk-through pick-and-throw. 5 reps.",
      developing: "Slow-rolled bunts, live footwork, soft throw. 3 per base.",
      advanced: "Live BP bunts, real throws.",
      elite: "Live BP + baserunner. Under coach's stopwatch (< 3.4 s bat-contact to base catch)."
    }
  },
  backup_bases: {
    what: "As a pitcher, on any ball hit to the outfield you sprint to back up either 3B or home so a wild throw doesn't cost you an extra base.",
    setup: "Coach hits a ball to the OF and calls the base. Pitcher must sprint to the correct deep-angle backup spot.",
    goodRep: [
      "Immediately after delivery you locate the ball off the bat.",
      "You sprint to the deep angle (30+ ft behind the base) \u2014 never right on the bag.",
      "You read the throw's flight and shift a step left or right to line up.",
      "Ready in a fielding stance when the throw arrives."
    ],
    badRep: [
      "Backing up the wrong base (know the situation before every pitch).",
      "Standing too close to the bag (an errant throw goes past you).",
      "Watching the play instead of positioning."
    ],
    feel: "Total situational awareness \u2014 you're the insurance on every play.",
    whyToday: "One backed-up throw a season saves multiple runs. This is free defense the pitcher owes the team.",
    nextLink: "Same 'know-the-situation' brain used on covering 1B and PFP.",
    tierNotes: {
      beginner: "Coach calls the base BEFORE every play, walk-through the path. 3 rounds.",
      developing: "Coach calls the base after ball is hit, live sprint. 5 rounds.",
      advanced: "Live BP, pitcher reads the play and picks the base. 5 rounds.",
      elite: "Live simulated innings \u2014 coach grades base selection AND angle depth on every play."
    }
  },
  hold_runner: {
    what: "Varied looks, holds, and slide-steps disrupt a runner's timing so he can't get a clean jump to steal the next base.",
    setup: "Mound with plate. Runner (or coach) at 1B or 2B. Pitcher runs through 5\u201310 pitches, mixing quick pitches, holds of 1-1-3-2 counts, and slide-steps.",
    goodRep: [
      "Each look is a different length \u2014 no rhythm the runner can time.",
      "Slide-step is a controlled 1.2\u20131.4 s to the plate.",
      "Hold is still \u2014 no shoulder twitch, no glove flinch (that's a balk).",
      "Pickoff attempt is quick and to a spot the 1B can catch."
    ],
    badRep: [
      "Same rhythm every pitch \u2014 runner gets a free steal.",
      "Shoulder flinch on the hold (balk).",
      "Slow pickoff attempts that never get the runner (waste of pitches)."
    ],
    feel: "Controlled and slightly annoying \u2014 like you're deliberately making the runner uncomfortable.",
    whyToday: "Controlling the running game is 50% of a pitcher's job with runners on. This is elite pitcher IQ work.",
    nextLink: "Pairs with catcher pop-time \u2014 the two skills work together to shut down the steal.",
    tierNotes: {
      beginner: "Dry mound work, no runner. Learn the 3 hold counts and 1 slide-step.",
      developing: "Real 1B runner walking off the bag \u2014 practice varied looks and one live pickoff per set.",
      advanced: "Live simulated at-bats with runner + catcher. Score: 0/8 clean steals allowed.",
      elite: "Live intrasquad game. Any straight-steal against you is a failed rep."
    }
  },
  windmill_recover: {
    what: "After a softball windmill pitch, the pitcher recovers her body into a balanced, chest-square fielding position so a comebacker doesn't blow past her.",
    setup: "Softball rubber to plate. Full pitching motion. Coach fungoes a comebacker immediately on follow-through.",
    goodRep: [
      "Follow-through finishes with the pitching hand and glove BOTH up in front of the chest.",
      "Feet land square to the plate (not sideways).",
      "Glove goes to the ball on the fungo \u2014 no wasted step.",
      "Two hands secure the ball before the throw."
    ],
    badRep: [
      "Pitching arm dangles low on the finish (glove is too far to react).",
      "Body opens sideways on the follow-through (can't field a comebacker).",
      "Reaching one-handed for the fungo \u2014 you'll bobble it."
    ],
    feel: "Balanced on both feet, chest square, eyes to the hitter.",
    whyToday: "Softball comebackers are hotter and closer than baseball comebackers. This recovery keeps you safe and keeps you in the play.",
    nextLink: "Feeds the softball comebacker-and-turn-to-2B sequence.",
    tierNotes: {
      beginner: "Dry finish reps \u2014 no ball. 3\xD75. Coach checks glove position.",
      developing: "Real pitch + fungo at 50%. 3\xD75.",
      advanced: "Live-velocity pitch + fungo at 80%.",
      elite: "Live intrasquad \u2014 recover from every pitch and field 3 comebackers per inning."
    }
  },
  rise_hold_throw: {
    what: "Softball has no lead-off, but runners jump-step at release. Pitcher throws a rise ball and, on a jump, reads the runner and either delivers the pitch or steps off to hold.",
    setup: "Softball rubber. Runner at 1B. Coach signals jump-step or hold-tight. Pitcher must read and react.",
    goodRep: [
      "Rise ball spin is preserved (no cheating the release to check the runner).",
      "If runner jumps, you step off the rubber and set \u2014 you don't rush a wild pickoff.",
      "Detection is early \u2014 you see the jump in the peripheral vision, not the direct eye.",
      "Body language stays calm \u2014 don't tip the read."
    ],
    badRep: [
      "Freezing on the jump \u2014 runner takes the extra base.",
      "Wild step-off pickoff that misses the base.",
      "Tipping your read by staring at the runner mid-motion."
    ],
    feel: "Peripheral, calm, quick \u2014 like a goalie tracking multiple shooters.",
    whyToday: "The jump-step read is a softball-specific edge. Elite pitchers own it and shut down aggressive runners.",
    nextLink: "Feeds the pickoff-read-courtesy-runner drill.",
    tierNotes: {
      beginner: "Dry step-off work \u2014 no runner. Learn the mechanics. 5 reps.",
      developing: "Coach at 1B, half-speed jumps. 8 reps.",
      advanced: "Full-speed runner. Read + react on every pitch.",
      elite: "Live intrasquad \u2014 0 successful jump-steals allowed in the round."
    }
  },
  // ============ FIRST BASE ==================================================
  scoop: {
    what: "You catch short-hopped and one-hopped throws in the dirt at first base without letting them get past you, saving the out.",
    setup: "1B bag. Partner throws from SS or 3B distance, mixing short-hops (right at your body), medium-hops (last-second bounce), and long-hops (the hardest \u2014 reach forward).",
    goodRep: [
      "Feet stay on the bag until you know the throw's flight.",
      "Chest drops LOW \u2014 glove works out in front, not down at your side.",
      "You attack the short-hop (catch it as it comes off the ground).",
      "You stretch forward on the long-hop."
    ],
    badRep: [
      "Standing tall and reaching down at the hop (glove is too high).",
      "Leaving the bag before you have to.",
      "Waiting on the in-between hop instead of attacking it."
    ],
    feel: "Low, forward, quiet. The scoop should sound like a soft thud, not a slap.",
    whyToday: "Every close play at 1B on a bad throw is decided by a scoop. Elite 1Bs turn bad throws into outs.",
    nextLink: "Same 'chest low, glove forward' pattern used on picks.",
    stopIf: "Sharp lower-back pain on the low scoop \u2014 reduce depth for the round.",
    tierNotes: {
      beginner: "Tennis ball / rag ball short-hops from 15 ft, no gear. 3\xD710.",
      developing: "Real ball from SS distance, 3\xD715 mix.",
      advanced: "Full-speed BP short-hops from real infielders, 3\xD715.",
      elite: "Machine-generated short-hops with varying spin, timed rounds. Save rate \u2265 90% or repeat."
    }
  },
  stretch_pick: {
    what: "You stretch off the bag toward the throw to shorten the ball flight and beat the runner on a bang-bang play, without losing contact with the base.",
    setup: "1B bag. Partner throws from all four infield angles (2B, SS, 3B, P). Fielder must stretch to receive without pulling foot off the bag until the catch.",
    goodRep: [
      "Right foot (for RH 1B) starts on the bag, left foot stretches TOWARD the throw.",
      "You do NOT stretch until you see the ball's flight \u2014 a low throw needs a lower stretch.",
      "Secure the catch first, THEN worry about the stretch length.",
      "Chin down slightly on the reach \u2014 helps balance."
    ],
    badRep: [
      "Stretching before the throw arrives (you can't adjust to a bad throw).",
      "Losing contact with the bag on the reach (runner is safe).",
      "Reaching one-handed on a routine throw \u2014 two hands whenever possible."
    ],
    feel: "Long, calm, patient \u2014 like a dancer holding a pose.",
    whyToday: "Every 1B pick you complete saves a routine out that would've been a runner on with no outs.",
    nextLink: "Same balance pattern as the scoop.",
    tierNotes: {
      beginner: "Walk-through with a partner from 20 ft. Focus on staying on the bag. 3\xD78.",
      developing: "Real infield distance, medium-velocity throws. 3\xD712.",
      advanced: "Full-speed BP-distance throws, all four angles. 4 angles \xD7 5.",
      elite: "Live intrasquad throws + errant throws mixed in. Score: 18/20 clean catches or repeat."
    }
  },
  turn_at_2b: {
    what: "The pivot man at 2B receives the feed on a double-play attempt, replaces his feet across the bag, and throws to 1B while clearing the runner.",
    setup: "2B bag. Feed comes from SS or 3B. Runner (or cone) approaches through the bag. Pivot man must feel the bag, catch, and throw over the top of the runner.",
    goodRep: [
      "Catch is over the top of the bag with the glove square to the feed.",
      "Left foot drags across the bag on the pivot (contact = force out).",
      "Throw is short-armed over the runner, not around him.",
      "Chest opens to 1B before the throw."
    ],
    badRep: [
      "Standing on the bag stationary (the runner takes you out).",
      "Throwing side-arm (ball tails, 1B misses it).",
      "Feet don't touch the bag on the pivot (missed force)."
    ],
    feel: "Rhythmic \u2014 catch, drag, throw \u2014 one continuous motion.",
    whyToday: "The DP turn is the highest-value defensive play in the sport. Elite middle infielders own it cold.",
    nextLink: "Same feet-and-throw idea as any relay throw.",
    tierNotes: {
      beginner: "Dry footwork, no ball \u2014 learn the drag-and-clear. 3\xD78.",
      developing: "Real ball, no runner. 3\xD710 with clean feet.",
      advanced: "Real ball + runner (or cone approaching). 3\xD710.",
      elite: "Live BP double-play situation. Complete both outs in 3.5 s or less."
    }
  },
  dp_feed: {
    what: "The fielder who first fields the ball delivers a clean, catchable feed to the pivot man at 2B so the DP turn can happen without stalling.",
    setup: "SS or 2B position, coach fungoes ground balls. Partner acts as the pivot man at 2B, ready for a clean seam catch.",
    goodRep: [
      "Feed type matches the ball's location: underhand flip if you're on top of the bag, glove-flip if you backhand it, overhand if you're deep.",
      "Ball is thrown at the pivot's LETTERS, not his belt.",
      "Seams are clean \u2014 a wobbling feed makes the turn late.",
      "You continue moving through the throw \u2014 no dead stops."
    ],
    badRep: [
      "Underhand flip from too far away (loops, arrives late).",
      "Sidearm feed that tails behind the pivot.",
      "Standing still to throw instead of on the move."
    ],
    feel: "Quick, quiet, catchable \u2014 you're the setup man for the pivot.",
    whyToday: "A great pivot can't fix a bad feed. The feed IS the DP.",
    nextLink: "Pairs with turn-at-2B pivot work.",
    tierNotes: {
      beginner: "Walk-through 3 feed types (underhand, glove-flip, overhand) at 15 ft. 3\xD75.",
      developing: "Real fungoes, real feeds at DP distance. 3\xD78.",
      advanced: "Live BP ground balls, pivot man reacts. 3\xD710.",
      elite: "Live intrasquad DP situations, timed. Feed-to-pivot must arrive with seam intact 9/10."
    }
  },
  dp_pivot: {
    what: "The SS receives the DP feed at 2B, replaces his back foot, and throws to 1B over the top of the sliding runner.",
    setup: "Same as turn-at-2B, but from the SS-specific angle. Feed comes from 2B or 3B. Runner slides through the bag.",
    goodRep: [
      "Right foot (back foot) touches the bag as you catch.",
      "Replace the right foot with the left, using the momentum to throw.",
      "Throw is over the top and over the front hip.",
      "Chest opens to 1B on release."
    ],
    badRep: [
      "Landing flat-footed on the bag (no momentum to throw).",
      "Trying to spin around the runner instead of throwing over him.",
      "Rushing the catch (bobble kills the DP)."
    ],
    feel: "Clean and efficient \u2014 catch, replace, throw in one flow.",
    whyToday: "The SS pivot is the toughest DP turn in the game. Own it and you own the middle infield.",
    nextLink: "Same throw platform as the deep-hole throw.",
    tierNotes: {
      beginner: "Dry footwork, coach walks you through the replace-and-throw. 3\xD75.",
      developing: "Real feed from 2B at half speed, dry throw to 1B. 3\xD78.",
      advanced: "Live feed, live runner, real throw. 3\xD710.",
      elite: "Live BP DP with real slider at 2B. Both outs recorded 9/10."
    }
  },
  backhand_range: {
    what: "You field a ground ball to your throwing-hand side by reaching with your glove-arm across your body (backhand), keeping your weight moving forward.",
    setup: "SS or 3B position. Fungoes to the throwing-hand side, forcing a backhand at the edge of your range.",
    goodRep: [
      "First step is with your throwing-side foot to gain ground.",
      "Glove hand extends with the palm to the ball.",
      "Weight is FORWARD (chest over the glove) \u2014 never back.",
      "Field with the ball out in front of your right foot."
    ],
    badRep: [
      "Reaching sideways with your weight back \u2014 you'll spin off and miss the throw.",
      "Sliding to the ball on your knee (only in emergencies).",
      "Trying to catch the ball behind your body (impossible to throw from there)."
    ],
    feel: "Explosive first step, then long and low on the reach.",
    whyToday: "Backhand range is what separates a rangy IF from a stationary one \u2014 this is elite defensive real estate.",
    nextLink: "Same weight-forward pattern as slow-roller barehand.",
    stopIf: "Groin or hip flexor strain on the reach \u2014 end the round.",
    tierNotes: {
      beginner: "Coach rolls balls at walk pace to the backhand side. Learn the footwork. 3\xD75.",
      developing: "Fungoes at 60%, 3\xD78.",
      advanced: "Live BP grounders, real throws to 1B. 3\xD710.",
      elite: "Machine-fed grounders at 100+ mph exit velocity, throws to 1B on the run. 10/10 or repeat."
    }
  },
  slow_roller: {
    what: "You attack a slow-hit ground ball on the run, field it (glove or barehand), and throw across your body to 1B without slowing down.",
    setup: "3B or SS position. Coach hits or rolls a slow chopper toward the fielder. Runner cone at home to force urgency.",
    goodRep: [
      "You run THROUGH the ball, not to it.",
      "Field off the correct foot \u2014 right foot for a barehand, left for a glove-field.",
      "Throw is on the run, over the top, short-armed.",
      "Chest points at 1B on release."
    ],
    badRep: [
      "Slowing down to field \u2014 you'll be too late.",
      "Barehanding a ball that's still spinning fast \u2014 glove first.",
      "Throwing off the wrong foot \u2014 the ball sails."
    ],
    feel: "Downhill and controlled \u2014 no stops, no gathers, no hesitation.",
    whyToday: "Slow-rollers to 3B decide close games. Reps make the play automatic.",
    nextLink: "Same run-through pattern as OF do-or-die charges.",
    tierNotes: {
      beginner: "Walk-through: coach places the ball, you run through and pretend-throw. 3\xD76.",
      developing: "Slow-rolled ball, real throw on the run. 3\xD78.",
      advanced: "Live BP choppers, real 1B throw with runner urgency.",
      elite: "Live intrasquad \u2014 timed bat-contact to 1B catch \u2264 3.7 s."
    }
  },
  deep_hole: {
    what: "SS ranges deep into the hole (5.5-hole between SS and 3B), stops on his back foot, jumps, and throws across the diamond to 1B on a rope.",
    setup: "SS position. Coach fungoes hard grounders deep to the SS's backhand side, forcing a full-range play.",
    goodRep: [
      "Crossover step first, then a controlled sprint to the ball.",
      "Field the ball with a two-handed backhand off the correct foot.",
      "Plant the right foot, jump slightly, and throw off the plant.",
      "Throw is over the top and airtight \u2014 one clean seam."
    ],
    badRep: [
      "Throwing off balance without the jump-plant (ball dies or sails).",
      "Trying to throw on the run without the plant (accuracy drops).",
      "Backing up on the reach \u2014 you'll never get enough on the throw."
    ],
    feel: "Full commitment \u2014 you're either making the play or not; there's no half-effort in the hole.",
    whyToday: "The deep-hole throw is a signature elite-SS play. Reps build the arm strength and mechanics together.",
    nextLink: "Same throw platform as any long relay throw.",
    stopIf: "Any shoulder or elbow soreness on the throw \u2014 cut volume, dry footwork only.",
    tierNotes: {
      beginner: "Dry footwork only \u2014 learn the plant and the throw motion, no live throw. 3\xD74.",
      developing: "Half-speed fungoes, throws to a partner at half distance. 6 reps.",
      advanced: "Full-speed fungoes, real throws to 1B. 8 reps.",
      elite: "Live intrasquad. Ball reaches 1B on a line 8/8 or repeat."
    }
  },
  relay: {
    what: "The relay man from the outfield lines up chest-to-chest with the throw, catches, spins glove-side, and throws to the correct base to hold or catch a runner.",
    setup: "SS or 2B in relay position (about 100\u2013120 ft from the OF). OF throws the ball on a line to the relay's chest. Bases marked to know the target.",
    goodRep: [
      "You align chest-to-chest with the throwing OF \u2014 throwing lane is a straight line to the target base.",
      "Two-hand catch, ball goes straight to the throwing hand.",
      "Spin is glove-side (short spin, not a full rotation).",
      "Throw is over the top and airtight to the base."
    ],
    badRep: [
      "Standing sideways to the throw (ball tails past you).",
      "Full-body spin instead of a short glove-side turn (slow).",
      "Throwing off the wrong foot after the spin (ball sails)."
    ],
    feel: "Athletic and connected \u2014 you're the middle of a chain that has to arrive fast.",
    whyToday: "A perfect relay throws out a runner at home or 3B. This is a run-saving play every season.",
    nextLink: "Same throw platform as the deep-hole throw.",
    tierNotes: {
      beginner: "Walk-through with partner at 40 ft. Practice the align-catch-spin. 6 reps.",
      developing: "Half-distance relay, real spin-and-throw. 6 reps.",
      advanced: "Full-distance relay from OF, real 3B/home throw. 8 reps.",
      elite: "Live intrasquad \u2014 throw catches the runner at the target base 6/6."
    }
  },
  popup_communication: {
    what: "On a pop-up between fielders, one fielder calls it loudly, the others echo, and everyone else clears out so there's no collision.",
    setup: "IF and OF positions filled. Coach hits high pop-ups that fall between fielders (SS-2B, LF-CF, etc.). Every rep starts with a loud call.",
    goodRep: [
      "One fielder calls the ball LOUD \u2014 'I got it, I got it, I got it!' \u2014 before it peaks.",
      "Every other fielder echoes 'you, you, you!' and clears.",
      "Catcher stays late in case someone loses the ball.",
      "The catch is above the head, two hands."
    ],
    badRep: [
      "Silent tracking \u2014 the two fielders collide.",
      "Late call \u2014 the ball is dropping before anyone calls it.",
      "Calling then hesitating \u2014 commit to the catch."
    ],
    feel: "Loud, decisive, communal \u2014 the pop-up gets ONE owner, not two.",
    whyToday: "A dropped pop-up between fielders is a completely avoidable error. This drill removes that error from your game.",
    nextLink: "Pairs with OF gap reads and infield fly rule situations.",
    tierNotes: {
      beginner: "Two fielders + coach lobs a soft pop between them. Practice the call. 5 reps.",
      developing: "Full IF + OF positioning, medium pops. 5 reps.",
      advanced: "Live fungo pop-ups, coach adds distractions (crowd noise).",
      elite: "Live intrasquad \u2014 every pop-up gets a clean call and clean catch or the round repeats."
    }
  },
  in_between_hops: {
    what: "You handle a ground ball that arrives at that awkward tweener distance \u2014 too far to short-hop, too close to long-hop. Answer: attack the short-hop and refuse to wait.",
    setup: "3B or SS position. Coach fungoes balls at a distance that forces an in-between hop. Fielder must decide FAST.",
    goodRep: [
      "First move is FORWARD to convert the in-betweener into a short-hop.",
      "Field the ball on the short-hop out in front of you.",
      "Glove works from the ground up, not down at the ball.",
      "Chest stays over the glove."
    ],
    badRep: [
      "Waiting on the in-between hop (ball eats you up).",
      "Backing up on the ball (ball takes an unpredictable big hop).",
      "Stab at the ball with a stiff wrist."
    ],
    feel: "Aggressive and forward \u2014 you dictate the hop, the hop doesn't dictate you.",
    whyToday: "In-betweeners are the #1 source of infield errors. This drill wires the 'always forward' reflex.",
    nextLink: "Same forward-attack pattern as slow-roller and short-hop scoop work.",
    tierNotes: {
      beginner: "Coach rolls the ball at controlled distances. Learn to step forward. 3\xD75.",
      developing: "Fungoes at 60%, mixed distances. 3\xD78.",
      advanced: "Live BP grounders. 3\xD710.",
      elite: "Machine at variable exit velo, filmed. Clean fields \u2265 9/10 or repeat."
    }
  },
  drop_step_of: {
    what: "On a ball hit over your head, you open your hips with a drop-step in the direction of the ball, then sprint on a straight line to the landing spot.",
    setup: "OF position. Coach fungoes fly balls straight over the OF's head, both to the left and to the right.",
    goodRep: [
      "First move is your OUTSIDE foot dropping back \u2014 hips open toward the ball.",
      "You run on the balls of your feet in a straight line (no arcing).",
      "You track the ball with quick head-turns, not by drifting.",
      "You catch on the run, above your head."
    ],
    badRep: [
      "First step FORWARD (fatal \u2014 you'll never catch up).",
      "Turning your back completely on the ball (you lose it).",
      "Arcing to the ball instead of straight-lining."
    ],
    feel: "Explosive and confident \u2014 you decide the path in the first step.",
    whyToday: "The drop-step is what separates an OF who catches everything from one who watches balls fall.",
    nextLink: "Feeds crossover-first-step work.",
    tierNotes: {
      beginner: "Dry footwork, no ball \u2014 learn the drop-step in both directions. 3\xD75.",
      developing: "Coach lobs a fly ball, walk-jog pace. 3\xD75 each side.",
      advanced: "Full-speed fungoes over the head. 3\xD78 each side.",
      elite: "Live BP over-the-head balls at max distance. Catch rate \u2265 90% or repeat."
    }
  },
  crossover_of: {
    what: "You take one clean crossover step to open your hips toward the ball, then convert immediately into a full sprint \u2014 no drifting, no shuffling.",
    setup: "OF position. Coach fungoes line drives to the OF's side, forcing a crossover.",
    goodRep: [
      "Read the ball, then ONE crossover step (nearside foot crosses over).",
      "Second step is a sprint \u2014 no shuffle.",
      "Head stays level; you track the ball, not the ground.",
      "You catch on the run or plant to throw."
    ],
    badRep: [
      "Two or three shuffle-steps before you run (you're too slow to the ball).",
      "Drifting parallel to the ball's path instead of intercepting it.",
      "Lifting your head up and down while running."
    ],
    feel: "Direct and fast \u2014 the crossover feels like an unfair head start.",
    whyToday: "The crossover is how MLB OFs cover 40 feet in the time everyone else covers 25.",
    nextLink: "Feeds every OF read \u2014 line drive, gapper, or do-or-die.",
    tierNotes: {
      beginner: "Dry crossover reps in both directions. 3\xD75.",
      developing: "Coach lobs a line drive, live crossover + sprint. 3\xD78.",
      advanced: "Fungoes at real BP speed. 3\xD710.",
      elite: "Live BP + coach grades first-step direction and speed. Any drift = failed rep."
    }
  },
  do_or_die: {
    what: "A base hit is falling in front of you with a runner rounding third. You charge the ball, field it (glove or barehand), and throw home on the run to save the run.",
    setup: "OF position. Coach hits a low line drive or short fly that's about to drop. Cutoff and catcher in place.",
    goodRep: [
      "Full sprint the moment you read the ball is dropping short.",
      "Field with the glove-side knee down (funnel the ball).",
      "Throw off the RIGHT foot (for a righty), over the top, low trajectory.",
      "Aim for the cutoff man's letters \u2014 one clean bounce home."
    ],
    badRep: [
      "Slowing down to field \u2014 the runner scores.",
      "Trying to bare-hand a ball that's still bouncing hard.",
      "Throwing on the wrong foot (rainbow throw, no chance)."
    ],
    feel: "All-in commitment \u2014 this is one of the highest-effort plays an OF makes.",
    whyToday: "A do-or-die play saves an actual run. Reps make it a real weapon.",
    nextLink: "Same charge-and-throw pattern used on any base-hit-with-runner situation.",
    tierNotes: {
      beginner: "Walk-through: coach places the ball, you funnel and pretend-throw. 3\xD76.",
      developing: "Coach rolls the ball at real speed, dry throw. 3\xD78.",
      advanced: "Live fungoes + real throws to a cutoff. 3\xD710.",
      elite: "Live intrasquad with real baserunner. Beat the runner home 6/8."
    }
  },
  one_hop_throw: {
    what: "You throw a strong, low line-drive throw from the OF that arrives at the cutoff man's letters after one clean hop, so the ball can be relayed home or to another base without losing time.",
    setup: "OF position with a partner at the cutoff spot. Throw from a real fielding position (do-or-die, drop-step catch, etc.).",
    goodRep: [
      "Ball leaves your hand on a LINE, not a rainbow.",
      "One clean, big hop that arrives at the cutoff's chest/letters.",
      "Cutoff can catch without moving his feet.",
      "Throw is over the top, four-seam grip."
    ],
    badRep: [
      "Rainbow throw (adds 0.5+ s of hang time).",
      "Two-hoppers (cutoff can't handle it cleanly).",
      "Air-mailing the cutoff (no relay possible)."
    ],
    feel: "Snappy and long \u2014 like skipping a stone across water.",
    whyToday: "OF assists come from the one-hop throw. Rainbow arms don't throw runners out.",
    nextLink: "Same throw platform as any long relay throw.",
    stopIf: "Any shoulder or elbow soreness \u2014 cut volume 50%.",
    tierNotes: {
      beginner: "Half-distance throws to a partner. Focus on the one-hop rhythm. 3\xD75.",
      developing: "Full OF distance to a cutoff at 100 ft. 3 per base.",
      advanced: "Full-distance throws home from all three OF spots. 5 each.",
      elite: "Live intrasquad \u2014 cutoff can catch without moving 8/10 or repeat."
    }
  },
  fence: {
    what: "You track a deep fly ball toward the fence, find the wall with your GLOVE hand before you jump or brace, and then complete the catch.",
    setup: "OF position with a padded outfield fence. Coach fungoes deep fly balls that force a fence read.",
    goodRep: [
      "You take one look at the fence, then keep your eye on the ball.",
      "Glove hand finds and touches the fence FIRST \u2014 that tells you how much space you have.",
      "Two hands on the catch when possible.",
      "You brace or leap AFTER you've located the fence \u2014 never blind."
    ],
    badRep: [
      "Running full-speed at the fence looking only at the ball (collision).",
      "Jumping without first knowing the fence distance (miss-time).",
      "Reaching back one-handed without knowing where the wall is."
    ],
    feel: "Fast, then patient \u2014 sprint to the spot, then a quiet last two steps.",
    whyToday: "Fence work prevents career-ending collisions and turns home runs into outs.",
    nextLink: "Pairs with sun-ball tracking \u2014 both are 'external-cue' reads.",
    tierNotes: {
      beginner: "Walk-through: no ball, just find the fence with your glove hand. 5 reps.",
      developing: "Coach lobs a fly ball toward the wall at 60% speed. 3\xD75.",
      advanced: "Fungoes at real BP speed. 6 reps.",
      elite: "Live BP with wall-scraping fly balls. Catch or bracing decision correct 6/6."
    }
  },
  sun_ball: {
    what: "You track a high fly ball that's coming down through the sun by using your glove hand as a visor to protect your eyes, without losing sight of the ball.",
    setup: "OF position on a sunny day. Coach fungoes fly balls into the sun. If no sun, use a bright light or stadium light for a proxy.",
    goodRep: [
      "You raise your GLOVE HAND (not the mitt) to shade your eyes as you track.",
      "Head stays under the ball \u2014 don't drift sideways to escape the sun.",
      "Two hands on the catch if possible.",
      "You commit \u2014 sun catches are made by fielders who don't flinch."
    ],
    badRep: [
      "Waving the glove/mitt frantically (blocks your view completely).",
      "Turning your head away (you lose the ball).",
      "Drifting sideways to escape the sun (you take a bad angle)."
    ],
    feel: "Calm and committed \u2014 sun catches are 60% courage.",
    whyToday: "Sun catches decide day games. Reps take the fear out of them.",
    nextLink: "Same tracking pattern as any high fly.",
    tierNotes: {
      beginner: "Coach lobs a high pop, no sun, practice the visor hand. 5 reps.",
      developing: "Real fungo in the sun, half-speed. 5 reps.",
      advanced: "Real BP fungoes in the sun. 6 reps.",
      elite: "Live BP in game conditions. Catch rate \u2265 85%."
    }
  },
  gap_reads: {
    what: "CF works with the corner OF (LF or RF) to communicate loudly and decide which fielder attacks a ball hit in the gap.",
    setup: "OF gap positions filled. Coach hits fungoes into the LF-CF or RF-CF gap. Every rep begins with a loud, early call.",
    goodRep: [
      "CF calls the ball early ('mine, mine, mine!') if he has the better angle.",
      "Corner OF echoes ('yours!') and clears out.",
      "The non-catching OF backs up the play.",
      "The catch is on the run, and the throw is set up before the catch."
    ],
    badRep: [
      "Silent tracking \u2014 both fielders drift into the same spot.",
      "Late call \u2014 the ball is already dropping.",
      "Calling then hesitating \u2014 commit to the catch."
    ],
    feel: "Loud, clear, communal \u2014 the gap gets one owner.",
    whyToday: "Gap reads decide extra-base hits. Own the communication and you own the gap.",
    nextLink: "Pairs with pop-up communication \u2014 same rules, different area.",
    tierNotes: {
      beginner: "Two fielders + coach lobs into the gap, practice the call. 5 reps.",
      developing: "Half-speed fungoes into the gap. 5 reps.",
      advanced: "Live BP gappers. 5 reps.",
      elite: "Live intrasquad \u2014 every gap ball gets a clean owner and clean throw."
    }
  },
  rise_ball_tracking: {
    what: "Softball rise-balls come off the bat with backspin that makes them CLIMB. OFs must read the pop off the bat and refuse to take a step in until they're sure of the trajectory.",
    setup: "OF position. Coach or machine feeds rise-ball line drives / high liners off the bat. Fielder starts in a normal OF stance.",
    goodRep: [
      "First step is HOLD \u2014 freeze for a half-second and read.",
      "If the ball is climbing, first move is BACK (drop-step).",
      "Track with quick head-turns, no drift.",
      "Catch is on the run or above the head."
    ],
    badRep: [
      "First step IN \u2014 the ball climbs over your head.",
      "Drifting under the ball (spin makes you misjudge).",
      "Taking your eye off the ball to check the fence."
    ],
    feel: "Patient and disciplined \u2014 hold, read, then commit.",
    whyToday: "The 'first-step-in' error is the #1 softball OF mistake. This drill wires the discipline.",
    nextLink: "Pairs with drop-step reads and fence work.",
    tierNotes: {
      beginner: "Coach lobs a rising line drive, walk-through the hold-and-read. 3\xD75.",
      developing: "Real fungoes at 60%. 3\xD78.",
      advanced: "Live BP rise-balls. 3\xD710.",
      elite: "Live intrasquad \u2014 0 first-step-in errors in the round."
    }
  },
  slap_hit_read: {
    what: "A softball slapper drops a soft line drive in front of the OF. OF must charge, come THROUGH the ball, and get it back in fast to prevent the extra base.",
    setup: "OF position. Coach hits a soft line drive that lands just in front of the OF. Cutoff in place.",
    goodRep: [
      "Charge the moment you read the drop \u2014 no drift.",
      "Come THROUGH the ball on the run \u2014 don't hop back.",
      "Field off the correct foot for a throw.",
      "Throw is on the run to the cutoff, low trajectory."
    ],
    badRep: [
      "Drifting back to play the ball on a hop (extra base).",
      "Stopping to gather (extra base).",
      "Throwing off balance (sails)."
    ],
    feel: "Aggressive and downhill \u2014 you commit to the charge from the first step.",
    whyToday: "Slap hits are meant to steal extra bases. Elite OFs charge and stop them at a single.",
    nextLink: "Same charge-and-throw pattern as do-or-die.",
    tierNotes: {
      beginner: "Walk-through: coach places a ball, you charge and pretend-throw. 3\xD75.",
      developing: "Coach hits a soft liner, live charge and throw. 3\xD76.",
      advanced: "Live BP slap hits. 3\xD78.",
      elite: "Live intrasquad \u2014 hitter tries to stretch to a double, you hold him to a single 6/6."
    }
  },
  rise_pop_up: {
    what: "In softball, rise-balls generate pop-ups that carry into shallow OF territory. The IF or 1B calls it early and takes the ball with a glove-side turn to face the play.",
    setup: "IF + OF positions filled. Machine or coach feeds a rise-ball pop-up between IF and OF.",
    goodRep: [
      "Loud, early call from the IF ('I got it, I got it!').",
      "Turn to the glove side to face the field and the play.",
      "Two hands on the catch above the head.",
      "Ready to throw to a base if a runner tags."
    ],
    badRep: [
      "Silent tracking \u2014 pop drops between fielders.",
      "Turning the wrong way (throwing side) \u2014 your body blocks your view.",
      "One-handed catch (bobble in the wind)."
    ],
    feel: "Loud, patient, decisive.",
    whyToday: "Rise-ball pop-ups are gimme outs for elite defenses. Reps make the call automatic.",
    nextLink: "Same communication rules as pop-up communication and gap reads.",
    tierNotes: {
      beginner: "Two fielders + coach lobs a pop between them, practice the call. 5 reps.",
      developing: "Real machine-fed pops at 60%. 5 reps.",
      advanced: "Live BP rise-ball pops. 5 reps.",
      elite: "Live intrasquad \u2014 every pop gets a clean owner and clean catch."
    }
  }
};
var NAME_TO_FAMILY = (() => {
  const norms = (arr) => arr.map(norm2);
  const map = {};
  const add = (family, names) => {
    for (const n of norms(names)) map[n] = family;
  };
  add("receiving_one_knee", [
    "Driveline one-knee receiving",
    "One-knee receiving \u2014 high/low/glove/arm",
    "One-knee receiving \u2014 rise + drop",
    "Receiving primer \u2014 bottom of zone",
    "Receiving primer \u2014 bottom of zone + drop",
    "Receiving vs rise-ball"
  ]);
  add("framing_ladder", ["Framing ladder \u2014 4 corners"]);
  add("blocking_short_hop", [
    "Short-hop blocking angles",
    "Blocking recovery to ball",
    "Blocking \u2014 screwball/drop"
  ]);
  add("block_recover", ["Block-and-recover", "Slapper block-and-recover"]);
  add("pop_time", [
    "Pop-time footwork \u2014 jab-replace to 2B",
    "Pop-time to 2B",
    "Pop-time to 2B \u2014 slapper timing",
    "Live pop-time 1 round",
    "Live pop-time to 2B"
  ]);
  add("foul_pop", ["Foul-pop turn-and-find", "Foul-pop reads"]);
  add("bunt_pick_throw", ["Bunt pick-and-throw to 1B/3B"]);
  add("pfp_1_3_1", ["1-3-1 PFP", "1-3-1 walk-through"]);
  add("comebacker_glove", [
    "Comebacker glove work",
    "Comebackers + turn to 2B",
    "Comebackers + turn",
    "Comebacker primer"
  ]);
  add("cover_1b", ["Cover 1B on 3-6-1 / 3-6-3", "Cover 1B on 3-6-1"]);
  add("bunt_fielding", [
    "Bunt fielding to 1B / 2B / 3B",
    "Bunt charge & throw to 1B",
    "Bunt charge & throw to 3B/2B",
    "Bunt charge & throw",
    "Bunt to all bases",
    "Bunt walk-through to 3B / 1B",
    "Bunt coverage rehearsal",
    "Slap-bunt charge to 1B",
    "Slap-bunt charge + throw to 2B",
    "Slap-bunt charge",
    "Slap-bunt walk-through",
    "Slap-bunt barehand & throw to 1B",
    "Slap-bunt read + barehand",
    "Slap read + barehand",
    "Slap barehand primer"
  ]);
  add("backup_bases", ["Backup 3B & home"]);
  add("hold_runner", [
    "Slide-step / hold-runner reads",
    "Hold-runner primer",
    "Pickoff read \u2014 courtesy runner",
    "Hold runner + pickoff reception",
    "Pickoff to 1B / 2B"
  ]);
  add("windmill_recover", [
    "Windmill follow-through into fielding position",
    "Follow-through into set"
  ]);
  add("rise_hold_throw", ["Rise-ball hold-and-throw"]);
  add("scoop", ["Scoop/short-hop ladder", "Short-hop scoops", "Scoop primer"]);
  add("stretch_pick", [
    "Pick footwork \u2014 stretch to all angles",
    "Stretch & pick \u2014 4 angles",
    "Stretch to all angles",
    "Stretch \u2014 4 angles"
  ]);
  add("turn_at_2b", [
    "3-6-3 / 3-6-1 turn",
    "3-6-3 turn",
    "3-6-3",
    "Turn at 2B",
    "Turn at 2B \u2014 inside/outside",
    "Turn at 2B vs slap runner",
    "Turn at 2B vs slap"
  ]);
  add("dp_feed", [
    "DP feed to SS \u2014 flip, pivot, backhand-glove flip",
    "DP feed to SS \u2014 slapper depth (in on grass)",
    "DP feed",
    "DP feeds \u2014 3 types",
    "DP feed primer",
    "Around-the-horn DP feed"
  ]);
  add("dp_pivot", [
    "DP pivot at 2B \u2014 replace foot + throw",
    "DP pivot at 2B \u2014 quick feed & throw",
    "DP pivot",
    "DP pivot primer"
  ]);
  add("backhand_range", [
    "Backhand & forehand range",
    "Backhand & throw across body",
    "Backhand at line \u2014 walk-through",
    "Backhand at the line",
    "Backhand down the line",
    "Backhand primer",
    "Backhand range"
  ]);
  add("slow_roller", [
    "Slow-roller barehand & throw",
    "Slow-roller barehand",
    "Slow-roller primer"
  ]);
  add("deep_hole", ["Deep-hole throw", "Deep-hole primer"]);
  add("relay", [
    "Relay from RF \u2014 2-hand catch, spin, throw",
    "Relay from LF/CF \u2014 spin & throw"
  ]);
  add("popup_communication", [
    "Pop-up communication with 2B/OF",
    "Pop-up communication \u2014 infield fly rule reps"
  ]);
  add("in_between_hops", ["In-between hop reads"]);
  add("drop_step_of", [
    "Drop-step reads \u2014 deep left/right",
    "Drop-step reads \u2014 L/R",
    "Drop-step reads \u2014 deep L/R",
    "Drop-step reads",
    "Drop-step primer"
  ]);
  add("crossover_of", ["Crossover first step", "Crossover + sprint", "Crossover primer"]);
  add("do_or_die", ["Do-or-die charge", "Do-or-die primer"]);
  add("one_hop_throw", [
    "One-hop throws to 2B / 3B / home",
    "One-hop throws to bases",
    "One-hop throws \u2014 home & 3B",
    "One-hop to bases \u2014 shorter fence angles"
  ]);
  add("fence", ["Fence work \u2014 read, drift, brace", "Fence & sun-ball"]);
  add("sun_ball", ["Sun-ball tracking"]);
  add("gap_reads", ["Gap reads with wing (LF & RF)"]);
  add("rise_ball_tracking", ["Rise-ball tracking", "Rise-ball tracking primer"]);
  add("slap_hit_read", ["Slap-hit read \u2014 soft line drive in front"]);
  add("rise_pop_up", ["Rise-ball pop-up read"]);
  return map;
})();
function guideForDefense(name) {
  if (!name) return null;
  const clean2 = name.replace(/\s*\(secondary:[^)]+\)\s*$/i, "").trim();
  const family = NAME_TO_FAMILY[norm2(clean2)];
  return family ? G[family] : null;
}
function tierNoteForDefense(name, tier) {
  const g = guideForDefense(name);
  return g ? g.tierNotes[tier] : null;
}

// src/lib/hammer/prescription/defenseLibrary.ts
function normalizeDefensePosition(pos) {
  const token = firstPositionToken(pos);
  if (!token) return "utility";
  const p = token.trim().toUpperCase();
  if (p === "C" || p === "CATCHER") return "C";
  if (p === "P" || p === "PITCHER" || p === "SP" || p === "RP") return "P";
  if (p === "1B" || p === "FIRST" || p === "FIRST_BASE") return "1B";
  if (p === "2B" || p === "SECOND" || p === "SECOND_BASE") return "2B";
  if (p === "SS" || p === "SHORT" || p === "SHORTSTOP") return "SS";
  if (p === "3B" || p === "THIRD" || p === "THIRD_BASE") return "3B";
  if (p === "LF" || p === "LEFT" || p === "LEFT_FIELD") return "LF";
  if (p === "CF" || p === "CENTER" || p === "CENTER_FIELD") return "CF";
  if (p === "RF" || p === "RIGHT" || p === "RIGHT_FIELD") return "RF";
  if (p === "OF" || p === "OUTFIELD") return "OF";
  if (p === "IF" || p === "INFIELD") return "IF";
  if (p === "DH" || p === "DESIGNATED_HITTER") return "DH";
  return "utility";
}
function normalizePhase(phase, tournamentToday) {
  if (tournamentToday) return "tournament";
  const p = (phase ?? "").toString().toLowerCase();
  if (p === "off" || p === "off_season" || p === "offseason") return "off";
  if (p === "pre" || p === "pre_season" || p === "preseason") return "pre";
  if (p === "in" || p === "in_season" || p === "inseason") return "in";
  if (p === "post" || p === "post_season" || p === "postseason") return "off";
  return "pre";
}
var LEG_INJURY = /* @__PURE__ */ new Set(["knee", "ankle", "hip", "hamstring", "groin", "quad", "calf", "foot"]);
var SHOULDER_INJURY = /* @__PURE__ */ new Set(["shoulder", "elbow", "ucl", "labrum", "rotator_cuff", "biceps"]);
var BACK_INJURY = /* @__PURE__ */ new Set(["back", "lumbar", "spine", "oblique"]);
function hasAny(regions, set) {
  if (!regions || regions.length === 0) return false;
  return regions.some((r) => set.has(r.toLowerCase()));
}
function gateForInjury(drills, regions) {
  const noLegs = hasAny(regions, LEG_INJURY);
  const noArm = hasAny(regions, SHOULDER_INJURY);
  const noBack = hasAny(regions, BACK_INJURY);
  return drills.filter((d2) => {
    const tag = `${d2.name} ${d2.setup ?? ""} ${d2.cue ?? ""}`.toLowerCase();
    if (noLegs && /(charge|sprint|do-or-die|drop-step|crossover|bunt charge|slow-roller)/.test(tag)) return false;
    if (noArm && /(long throw|max effort throw|pop-time|rock-and-throw|one-hop to)/.test(tag)) return false;
    if (noBack && /(block|dive|extension|barrel roll)/.test(tag)) return false;
    return true;
  });
}
function d(name, dosage, cue, setup, stopIf) {
  return { name, dosage, cue, setup, stopIf, executionKind: defenseExecutionKind(name) };
}
var CATALOG = {
  // ================================================================ CATCHER
  "C:baseball:off": [
    d("Driveline one-knee receiving", "3\xD715 reps", "quiet glove, thumb up, catch the ball into the strike zone"),
    d("Framing ladder \u2014 4 corners", "4\xD78 reps (one set per zone)", "load the glove early, freeze on the catch"),
    d("Short-hop blocking angles", "3\xD710 (L/M/R)", "chin to chest, block ball down, keep it in front", "kneel on turf, coach short-hops from 20 ft"),
    d("Pop-time footwork \u2014 jab-replace to 2B", "3\xD78 dry, 2\xD75 with ball", "replace back foot, throw over front hip"),
    d("Foul-pop turn-and-find", "20 reps", "flip mask off away from ball, find it late")
  ],
  "C:baseball:pre": [
    d("One-knee receiving \u2014 high/low/glove/arm", "4\xD710", "catch strikes as strikes"),
    d("Blocking recovery to ball", "3\xD78", "block, pop up, locate runner"),
    d("Pop-time to 2B", "2\xD76 timed", "goal \u2264 2.0s", "warmed up arm required"),
    d("Bunt pick-and-throw to 1B/3B", "6 reps each base", "clear the ball, footwork before throw")
  ],
  "C:baseball:in": [
    d("Receiving primer \u2014 bottom of zone", "20 reps", "steal the low strike"),
    d("Block-and-recover", "2\xD75", "chin down, ball in front, then feet"),
    d("Live pop-time 1 round", "3 throws to 2B", "game speed only"),
    d("Foul-pop reads", "5 reps", "off the mask away from the ball")
  ],
  "C:softball:off": [
    d("One-knee receiving \u2014 rise + drop", "3\xD715", "glove up on rise, glove down on drop \u2014 never flip"),
    d("Short-hop blocking angles", "3\xD710 (L/M/R)", "chin down, block down, redirect in front"),
    d("Pop-time to 2B \u2014 slapper timing", "3\xD78 dry + 2\xD75 live", "quick exchange, four-seam grip"),
    d("Slap-bunt read + barehand", "10 reps", "read runner speed, throw on the run"),
    d("Framing ladder \u2014 4 corners", "4\xD78 reps (one set per zone)", "quiet glove, freeze on catch")
  ],
  "C:softball:pre": [
    d("Receiving vs rise-ball", "3\xD710", "get on top of the ball \u2014 glove stays above the hand"),
    d("Blocking \u2014 screwball/drop", "3\xD78", "block into the ball, not around it"),
    d("Pop-time to 2B", "2\xD76 timed", "\u2264 1.9s target", "warm arm"),
    d("Slapper block-and-recover", "6 reps", "block, up, throw to 1B on the run")
  ],
  "C:softball:in": [
    d("Receiving primer \u2014 bottom of zone + drop", "15 reps", "steal the drop-ball strike"),
    d("Block-and-recover", "2\xD75", "chin down, feet after"),
    d("Live pop-time to 2B", "3 throws", "game speed")
  ],
  // ================================================================ PITCHER (PFP)
  "P:baseball:off": [
    d("Comebacker glove work", "3\xD710", "field the ball with soft hands, spin foot to 2B or 1B"),
    d("1-3-1 PFP", "8 reps", "underhand toss inside the 45-ft line, overhand outside"),
    d("Cover 1B on 3-6-1 / 3-6-3", "8 reps", "hit inside the bag, catch on the run"),
    d("Bunt fielding to 1B / 2B / 3B", "5 to each base", "clear the ball, throw off the correct foot"),
    d("Backup 3B & home", "5 rounds", "read the throw, deep angle behind the base"),
    d("Slide-step / hold-runner reads", "10 pitches", "vary looks 1-1-3-2 to disrupt timing")
  ],
  "P:baseball:pre": [
    d("Comebackers + turn to 2B", "3\xD76", "glove-side spin to shortstop"),
    d("1-3-1 PFP", "6 reps", "clean flip, catch on the bag"),
    d("Bunt to all bases", "3 per base", "footwork before throw"),
    d("Pickoff to 1B / 2B", "5 each", "back leg first, quick throw")
  ],
  "P:baseball:in": [
    d("Comebacker primer", "5 reps", "soft hands, spin to 2B"),
    d("1-3-1 walk-through", "3 reps", "clean flip"),
    d("Hold-runner primer", "5 pitches with imaginary R1", "vary look counts")
  ],
  "P:softball:off": [
    d("Windmill follow-through into fielding position", "3\xD710", "recover glove-up, chest to hitter"),
    d("Comebacker glove work", "3\xD710", "soft hands, spin to base"),
    d("Bunt fielding to 1B / 2B / 3B", "5 per base", "clear the ball, throw off correct foot"),
    d("Cover 1B on 3-6-1", "8 reps", "hit inside the bag"),
    d("Rise-ball hold-and-throw", "8 pitches with R1", "quick release, no lead-off but jump-step read"),
    d("Backup 3B & home", "5 rounds", "deep angle behind base")
  ],
  "P:softball:pre": [
    d("Follow-through into set", "3\xD78", "chest square, glove up"),
    d("Comebackers + turn", "3\xD76", "spin to 2B on the glove side"),
    d("Bunt to all bases", "3 per base"),
    d("Pickoff read \u2014 courtesy runner", "5 reps", "detect early jump")
  ],
  "P:softball:in": [
    d("Comebacker primer", "5 reps", "soft hands"),
    d("Bunt walk-through to 3B / 1B", "3 each")
  ],
  // ================================================================ FIRST BASE
  "1B:baseball:off": [
    d("Scoop/short-hop ladder", "3\xD715 (short/med/long hops)", "keep body low, glove out in front"),
    d("Pick footwork \u2014 stretch to all angles", "20 reps", "stretch AFTER catch is secure"),
    d("3-6-3 / 3-6-1 turn", "10 reps", "clear the runner lane, throw on the run"),
    d("Bunt charge & throw to 3B/2B", "6 to each", "field with two hands, throw on the move"),
    d("Hold runner + pickoff reception", "10 reps", "tag down and back to bag")
  ],
  "1B:baseball:pre": [
    d("Short-hop scoops", "3\xD710", "keep chest low"),
    d("Stretch & pick \u2014 4 angles", "12 reps", "secure catch first"),
    d("3-6-3", "6 reps", "clear runner lane")
  ],
  "1B:baseball:in": [
    d("Scoop primer", "10 reps", "soft-hand the hop"),
    d("Stretch \u2014 4 angles", "8 reps", "secure the catch")
  ],
  "1B:softball:off": [
    d("Scoop/short-hop ladder", "3\xD715", "chest low, glove out front"),
    d("Stretch to all angles", "20 reps", "secure the catch first"),
    d("3-6-3 turn", "8 reps", "clear runner, throw on the run"),
    d("Slap-bunt charge + throw to 2B", "6 reps", "read speed, throw on the move"),
    d("Rise-ball pop-up read", "8 reps", "call it early, glove-side turn")
  ],
  "1B:softball:pre": [
    d("Short-hop scoops", "3\xD710"),
    d("Stretch \u2014 4 angles", "12 reps"),
    d("Bunt coverage rehearsal", "6 reps")
  ],
  "1B:softball:in": [
    d("Scoop primer", "10 reps"),
    d("Stretch \u2014 4 angles", "8 reps")
  ],
  // ================================================================ 2B / SS (shared middle-infield spine, differentiated below)
  "2B:baseball:off": [
    d("DP feed to SS \u2014 flip, pivot, backhand-glove flip", "3\xD78 each", "get the ball to the bag with a clean seam"),
    d("Turn at 2B \u2014 inside/outside", "3\xD78", "footwork over the bag, throw over the runner"),
    d("Backhand & forehand range", "3\xD78 each", "field with feet moving forward"),
    d("Slow-roller barehand & throw", "10 reps", "field on the run, throw off the correct foot"),
    d("Relay from RF \u2014 2-hand catch, spin, throw", "6 reps", "line up chest-to-chest with cutoff")
  ],
  "2B:baseball:pre": [
    d("DP feeds \u2014 3 types", "3\xD75", "clean seam to SS"),
    d("Turn at 2B", "3\xD75", "over the bag"),
    d("Backhand range", "10 reps", "field forward")
  ],
  "2B:baseball:in": [
    d("DP feed primer", "10 reps", "clean seam"),
    d("Backhand primer", "6 reps")
  ],
  "SS:baseball:off": [
    d("DP pivot at 2B \u2014 replace foot + throw", "3\xD710", "replace back foot, throw over front hip"),
    d("Backhand & throw across body", "3\xD78", "field with weight forward"),
    d("Slow-roller barehand", "10 reps", "field on the run, throw off correct foot"),
    d("Deep-hole throw", "8 reps", "plant, jump, throw", void 0, "shoulder soreness \u2014 cut volume"),
    d("Relay from LF/CF \u2014 spin & throw", "6 reps", "line up cutoff man, chest-to-chest"),
    d("Pop-up communication with 2B/OF", "5 reps", "loud call, drift under, catch above head")
  ],
  "SS:baseball:pre": [
    d("DP pivot", "3\xD76", "replace and throw"),
    d("Backhand range", "10 reps"),
    d("Slow-roller barehand", "6 reps")
  ],
  "SS:baseball:in": [
    d("DP pivot primer", "10 reps"),
    d("Backhand primer", "6 reps"),
    d("Deep-hole primer", "4 reps", void 0, void 0, "arm tightness \u2014 skip")
  ],
  "2B:softball:off": [
    d("DP feed to SS \u2014 slapper depth (in on grass)", "3\xD78", "quick clean seam, short arm-action"),
    d("Turn at 2B vs slap runner", "3\xD78", "over the bag, throw off outside foot"),
    d("Backhand & forehand range", "3\xD78 each"),
    d("Slap-bunt barehand & throw to 1B", "10 reps", "attack, throw on the run")
  ],
  "2B:softball:pre": [
    d("DP feed", "3\xD75"),
    d("Turn at 2B vs slap", "3\xD75"),
    d("Backhand range", "8 reps")
  ],
  "2B:softball:in": [
    d("DP feed primer", "8 reps"),
    d("Slap-bunt walk-through", "5 reps")
  ],
  "SS:softball:off": [
    d("DP pivot at 2B \u2014 quick feed & throw", "3\xD78", "replace foot, short arm"),
    d("Slap-bunt read + barehand", "10 reps", "attack downhill, throw on the run"),
    d("Backhand & throw across body", "3\xD78"),
    d("Deep-hole throw", "6 reps", "plant, jump, throw"),
    d("Pop-up communication \u2014 infield fly rule reps", "5 reps", "loud call")
  ],
  "SS:softball:pre": [
    d("DP pivot", "3\xD76"),
    d("Slap read + barehand", "8 reps"),
    d("Backhand range", "8 reps")
  ],
  "SS:softball:in": [
    d("DP pivot primer", "8 reps"),
    d("Slap barehand primer", "5 reps")
  ],
  // ================================================================ THIRD BASE
  "3B:baseball:off": [
    d("Slow-roller barehand & throw", "3\xD710", "attack the ball, throw off right foot"),
    d("Backhand at the line", "3\xD78", "keep the ball fair, field with weight forward"),
    d("In-between hop reads", "3\xD710", "attack the short hop, don't wait on the in-between"),
    d("Bunt charge & throw to 1B", "10 reps", "field on the run, throw across body"),
    d("Around-the-horn DP feed", "3\xD75", "step-and-throw to 2B, clean seam")
  ],
  "3B:baseball:pre": [
    d("Slow-roller barehand", "3\xD78"),
    d("Backhand at the line", "3\xD76"),
    d("Bunt charge & throw", "8 reps")
  ],
  "3B:baseball:in": [
    d("Slow-roller primer", "6 reps"),
    d("Backhand at line \u2014 walk-through", "5 reps")
  ],
  "3B:softball:off": [
    d("Slow-roller barehand & throw", "3\xD710", "attack ball, throw on the run"),
    d("Slap-bunt charge to 1B", "3\xD78", "field on the run, throw across body"),
    d("Backhand down the line", "3\xD78", "keep it fair"),
    d("In-between hop reads", "3\xD710")
  ],
  "3B:softball:pre": [
    d("Slow-roller barehand", "3\xD78"),
    d("Slap-bunt charge", "3\xD76")
  ],
  "3B:softball:in": [
    d("Slow-roller primer", "6 reps"),
    d("Slap-bunt walk-through", "5 reps")
  ],
  // ================================================================ OUTFIELD (generic + specific)
  "OF:baseball:off": [
    d("Drop-step reads \u2014 deep left/right", "3\xD78", "open hips first, run on the balls of feet"),
    d("Crossover first step", "3\xD710", "one crossover, then sprint \u2014 don't drift"),
    d("Do-or-die charge", "10 reps", "one-knee funnel through the ball, throw off right foot"),
    d("One-hop throws to 2B / 3B / home", "5 each", "aim for the cutoff's letters, one clean hop"),
    d("Fence work \u2014 read, drift, brace", "6 reps", "find fence with glove hand"),
    d("Sun-ball tracking", "6 reps", "shade with glove, don't lose the ball")
  ],
  "OF:baseball:pre": [
    d("Drop-step reads", "3\xD76"),
    d("Crossover first step", "3\xD78"),
    d("Do-or-die charge", "8 reps"),
    d("One-hop throws to bases", "3 per base")
  ],
  "OF:baseball:in": [
    d("Drop-step primer", "6 reps"),
    d("Crossover primer", "6 reps"),
    d("Do-or-die primer", "5 reps")
  ],
  "CF:baseball:off": [
    d("Drop-step reads \u2014 L/R", "3\xD78", "open hips, straight-line to spot"),
    d("Gap reads with wing (LF & RF)", "3\xD75", "call ball early and loud"),
    d("Crossover + sprint", "3\xD710", "one crossover, then run"),
    d("Do-or-die charge", "10 reps", "funnel through the ball"),
    d("One-hop throws \u2014 home & 3B", "5 each", "one clean hop to cutoff"),
    d("Fence & sun-ball", "5 reps each")
  ],
  "OF:softball:off": [
    d("Drop-step reads \u2014 deep L/R", "3\xD78", "open hips first"),
    d("Rise-ball tracking", "3\xD710", "read the pop off the bat \u2014 no first-step-in"),
    d("Crossover first step", "3\xD710"),
    d("Do-or-die charge", "10 reps", "funnel, throw off right foot"),
    d("One-hop to bases \u2014 shorter fence angles", "5 per base", "aim cutoff's letters"),
    d("Slap-hit read \u2014 soft line drive in front", "6 reps", "come through the ball, don't drift")
  ],
  "OF:softball:pre": [
    d("Drop-step reads", "3\xD76"),
    d("Rise-ball tracking", "3\xD78"),
    d("Do-or-die charge", "8 reps")
  ],
  "OF:softball:in": [
    d("Drop-step primer", "6 reps"),
    d("Rise-ball tracking primer", "6 reps"),
    d("Do-or-die primer", "5 reps")
  ]
};
function catalogFor(pos, sport, phase) {
  const key2 = `${pos}:${sport}:${phase}`;
  if (CATALOG[key2]) return [...CATALOG[key2]];
  if (pos === "LF" || pos === "RF" || pos === "CF") {
    const of = CATALOG[`OF:${sport}:${phase}`];
    if (of) return [...of];
  }
  if (pos === "IF") {
    const ss = CATALOG[`SS:${sport}:${phase}`];
    if (ss) return [...ss];
  }
  if (pos === "utility" || pos === "DH") {
    const of = CATALOG[`OF:${sport}:${phase}`] ?? [];
    const ss = CATALOG[`SS:${sport}:${phase}`] ?? [];
    return [...ss.slice(0, 2), ...of.slice(0, 2)];
  }
  return [];
}
function taperForTournament(drills) {
  const primers = drills.slice(0, 3).map((step) => ({
    ...step,
    dosage: step.dosage.replace(/(\d+)×(\d+)/, (_m, _a, b) => `1\xD7${b}`)
  }));
  return primers;
}
function blendSecondary(primary, secondary, sport, phase) {
  if (!secondary) return primary;
  const secondaryDrills = catalogFor(secondary, sport, phase);
  if (secondaryDrills.length === 0) return primary;
  const primer = secondaryDrills[0];
  if (!primer) return primary;
  const already = primary.some((p) => p.name.toLowerCase() === primer.name.toLowerCase());
  if (already) return primary;
  return [
    ...primary,
    {
      ...primer,
      name: `${primer.name} (secondary: ${secondary})`,
      dosage: primer.dosage.replace(/(\d+)×(\d+)/, (_m, _a, b) => `1\xD7${Math.max(3, Math.ceil(Number(b) / 2))}`)
    }
  ];
}
function cuesFor(pos, sport) {
  const base2 = ["Footwork before glove.", "Field through the ball, don't stab."];
  if (pos === "C") base2.push("Chin down on blocks. Quiet glove on receiving.");
  if (pos === "P") base2.push("Chest square, glove up after every pitch.");
  if (pos === "1B") base2.push("Secure the catch before the stretch.");
  if (pos === "2B" || pos === "SS") base2.push("Feet over the bag, throw over the runner.");
  if (pos === "3B") base2.push("Attack the slow-roller. Keep the backhand fair.");
  if (pos === "LF" || pos === "CF" || pos === "RF" || pos === "OF") {
    base2.push("One crossover, then sprint. Call the ball loud.");
    if (sport === "softball") base2.push("Read rise-balls off the bat \u2014 no drifting in.");
  }
  return base2;
}
var STOP_RULES = [
  "Knee, ankle, or hip pain \u2014 stop and update Hammer.",
  "Shoulder or elbow pain on throws \u2014 stop, do dry-footwork only.",
  "Any lightheadedness on charge/sprint drills \u2014 stop and hydrate."
];
function durationFor(phase, position) {
  if (phase === "tournament") return 10;
  if (phase === "in") return position === "C" || position === "P" ? 20 : 15;
  if (phase === "off") return position === "C" || position === "P" ? 40 : 35;
  return position === "C" || position === "P" ? 28 : 25;
}
function resolveDefenseTier(trainingAgeYears, phase) {
  const age = typeof trainingAgeYears === "number" && Number.isFinite(trainingAgeYears) && trainingAgeYears >= 0 ? trainingAgeYears : 1;
  let base2 = age < 1 ? "beginner" : age < 3 ? "developing" : age < 6 ? "advanced" : "elite";
  const p = (phase ?? "").toString().toLowerCase();
  if (p === "in" || p === "in_season" || p === "inseason") {
    base2 = base2 === "elite" ? "advanced" : base2 === "advanced" ? "developing" : base2 === "developing" ? "beginner" : "beginner";
  }
  if (p === "tournament") {
    base2 = base2 === "elite" || base2 === "advanced" ? "developing" : "beginner";
  }
  return base2;
}
var TIER_SCALE = {
  beginner: 0.5,
  developing: 0.75,
  advanced: 1,
  elite: 1.25
};
function scaleDosage(dosage, factor) {
  let out = dosage.replace(/(\d+)\s*[×x]\s*(\d+)/g, (_m, sets, reps) => {
    const scaled = Math.max(1, Math.round(Number(reps) * factor));
    return `${sets}\xD7${scaled}`;
  });
  out = out.replace(/^(\d+)(\s+)(reps?|throws?|pitches?|rounds?)\b/i, (_m, n, sp, unit) => {
    const scaled = Math.max(1, Math.round(Number(n) * factor));
    return `${scaled}${sp}${unit}`;
  });
  return out;
}
function decorateDrill(step, tier) {
  const guide = guideForDefense(step.name) ?? void 0;
  const tierNote = tierNoteForDefense(step.name, tier);
  const scaledDosage = scaleDosage(step.dosage, TIER_SCALE[tier]);
  const setup = tierNote ? step.setup ? `${step.setup}

Tier \u2014 ${tier}: ${tierNote}` : `Tier \u2014 ${tier}: ${tierNote}` : step.setup;
  const next = { ...step, dosage: scaledDosage };
  if (setup !== void 0) next.setup = setup;
  if (guide) next.guide = guide;
  return next;
}
function selectDefenseDrills(input) {
  const position = normalizeDefensePosition(input.position);
  const sport = input.sport;
  const phase = normalizePhase(input.seasonPhase, !!input.tournamentToday);
  const tier = input.tier ?? "developing";
  let drills = catalogFor(position, sport, phase);
  if (drills.length === 0) return null;
  const secondaryPositions = coercePositionTokens(input.secondaryPositions);
  if (secondaryPositions.length > 0) {
    const secondary = normalizeDefensePosition(secondaryPositions[0]);
    if (secondary !== position && secondary !== "utility") {
      drills = blendSecondary(drills, secondary, sport, phase);
    }
  }
  drills = gateForInjury(drills, input.injuryRegions);
  if (phase === "tournament") drills = taperForTournament(drills);
  if (drills.length === 0) return null;
  drills = drills.map((d2) => decorateDrill(d2, tier));
  const posLabel = position === "utility" ? "utility" : position;
  const phaseLabel = phase === "in" ? "game-rep" : phase === "off" ? "volume + range" : phase === "tournament" ? "primer" : "sharpen";
  const title = `Defense \u2014 ${posLabel} \xB7 ${tier} (${phaseLabel})`;
  const why = (phase === "in" ? "Game-rep quality over volume \u2014 the reps that show up in the game." : phase === "off" ? "Volume, footwork, and range \u2014 this is where elite defenders are built." : phase === "tournament" ? "Primer only \u2014 sharpen reads, save the legs for the game." : "Position-specific reads, footwork, and finishes.") + (input.goal ? ` ${input.goal}` : "");
  return {
    position,
    sport,
    phase,
    tier,
    drills,
    cues: cuesFor(position, sport),
    stopRules: STOP_RULES,
    durationMin: durationFor(phase, position),
    title,
    why
  };
}

// src/lib/prescription/ownerPlanDrills.ts
var PLAN_SLOTS = ["hammers_today:skill", "hammers_today:warmup", "hammers_today:defense", "defensive_library"];
var rows = [];
function setOwnerPlanDrills(next) {
  rows = next;
}
function skillBlocksOf(r) {
  const out = /* @__PURE__ */ new Set();
  for (const p of r.placements) {
    if (/^analysis:[a-z]+:hitting$/.test(p)) out.add("hitting");
    if (/^analysis:[a-z]+:(throwing|pitching)$/.test(p)) out.add("throwing");
    if (/^hammers_today:(hitting|bat_speed_weighted|bat_speed_overspeed)$/.test(p)) out.add("hitting");
    if (/^hammers_today:(throwing|pitching)$/.test(p)) out.add("throwing");
  }
  return [...out];
}
var clean = (s) => (s ?? "").trim();
function missingForPlacement(r, slot) {
  const miss = [];
  if (!clean(r.name)) miss.push("a name");
  if (!clean(r.dosage)) miss.push("a dose");
  if (!clean(r.cue)) miss.push("a cue");
  if (r.sports.length === 0) miss.push("a sport");
  if (slot === "hammers_today:skill") {
    if (skillBlocksOf(r).length === 0) miss.push("which skill (tick a hitting, throwing or pitching analysis)");
    if (r.steps.filter((s) => clean(s)).length === 0 && !clean(r.setup)) miss.push("set-up or steps");
  }
  return miss;
}
var norm3 = (s) => s.trim().toLowerCase();
var TAG_SLOT = {
  "hammers_today:hitting": "hammers_today:skill",
  "hammers_today:bat_speed_weighted": "hammers_today:skill",
  "hammers_today:bat_speed_overspeed": "hammers_today:skill",
  "hammers_today:throwing": "hammers_today:skill",
  "hammers_today:pitching": "hammers_today:skill",
  "hammers_today:defense_low_taxing": "hammers_today:defense"
};
function filedSlots(r) {
  const out = /* @__PURE__ */ new Set();
  for (const p of r.placements) {
    if (PLAN_SLOTS.includes(p)) out.add(p);
    if (TAG_SLOT[p]) out.add(TAG_SLOT[p]);
  }
  return [...out];
}
function eligibleFor(r, slots, ctx) {
  if (!r.active) return false;
  const filed = filedSlots(r);
  const slot = slots.find((s) => filed.includes(s));
  if (!slot) return false;
  if (missingForPlacement(r, slot).length > 0) return false;
  if (!r.sports.includes(ctx.sport)) return false;
  if (slot === "hammers_today:skill" && (!ctx.skill || !skillBlocksOf(r).includes(ctx.skill))) return false;
  const need = r.equipment.map(norm3).filter(Boolean);
  if (need.length > 0) {
    const owned = new Set([...ctx.owned ?? []].map(norm3));
    if (!need.every((e) => owned.has(e))) return false;
  }
  return true;
}
function ownerDrillsForSlot(slots, ctx) {
  return rows.filter((r) => eligibleFor(r, slots, ctx));
}
function mergeOwnerSlotDrills(drills, slots, ctxOrSport, day = /* @__PURE__ */ new Date()) {
  const ctx = typeof ctxOrSport === "string" ? { sport: ctxOrSport, day } : ctxOrSport;
  const pool = ownerDrillsForSlot(slots, ctx).sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0 || drills.length === 0) return drills;
  let target = -1;
  for (let i = drills.length - 1; i >= 0; i--) {
    const drill = drills[i];
    if (drill.prescriptionOrigin !== "owner" && (drill.stage === void 0 || drill.stage === "drills")) {
      target = i;
      break;
    }
  }
  if (target < 0) return drills;
  const dayIndex = Math.floor((ctx.day ?? day).getTime() / 864e5);
  const pick = pool[dayIndex % pool.length];
  const owned = {
    name: pick.name,
    dosage: pick.dosage ?? "",
    cue: pick.cue ?? "",
    prescriptionOrigin: "owner",
    ownerDrillId: pick.id,
    routineRole: pick.routine_role ?? null,
    skillArea: pick.skill_area ?? null,
    batSpeedKind: pick.bat_speed_kind ?? null,
    videoUrl: pick.video_url ?? null,
    libraryVideoId: pick.library_video_id ?? null,
    ...clean(pick.setup) ? { setup: pick.setup } : {},
    ...pick.equipment.length ? { equipmentNote: pick.equipment.join(", ") } : {}
  };
  return drills.map((drill, index) => index === target ? owned : drill);
}
if (false) void loadOwnerPlanDrills();

// src/lib/hammer/roadmap/roadmapLadder.ts
var RUNG_ORDER = [
  "foundation",
  "build",
  "bridge",
  "peak",
  "sustain"
];
var DESCRIPTORS = {
  foundation: {
    rung: "foundation",
    index: 1,
    label: "Foundation",
    headline: "Learn the movements, earn the volume.",
    description: "Slow-walk build. Focus is movement quality, safe tissue exposure, and low-fatigue skill volume. The recovery clock is long on purpose \u2014 your body is still writing the movement patterns.",
    volumeCeilings: {
      liftSessionsPerWeek: 2,
      speedSessionsPerWeek: 1,
      batSpeedSessionsPerWeek: 2,
      throwsPerWeekCeiling: 90
    },
    nextRung: "build",
    promotionCriteria: [
      "Log 4 complete lift weeks in a row",
      "Movement checkpoints hit with no injury flag for 3 weeks",
      "Training age \u2265 1 year"
    ]
  },
  build: {
    rung: "build",
    index: 2,
    label: "Build",
    headline: "Build capacity \u2014 you can handle real work now.",
    description: "Primary CNS work 2\xD7/week, skill volume climbs, throwing ladder starts stretching. This is where general athletic capacity is added.",
    volumeCeilings: {
      liftSessionsPerWeek: 3,
      speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 3,
      throwsPerWeekCeiling: 140
    },
    nextRung: "bridge",
    promotionCriteria: [
      "6 consecutive weeks at Build volume with no readiness deload",
      "Training age \u2265 2 years",
      "Consistent side-symmetry within \xB110%"
    ]
  },
  bridge: {
    rung: "bridge",
    index: 3,
    label: "Bridge",
    headline: "Bridge to elite \u2014 full off-season program.",
    description: "Matches the elite 5-day off-season template. Heavy lower / upper split, max-velocity sprints, structured throwing ladder, side-independent bat-speed density.",
    volumeCeilings: {
      liftSessionsPerWeek: 4,
      speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 4,
      throwsPerWeekCeiling: 190
    },
    nextRung: "peak",
    promotionCriteria: [
      "Complete a full off-season quarter at Bridge intensity",
      "Training age \u2265 3 years",
      "Sustained readiness scores \u2265 0.7 over 4 weeks"
    ]
  },
  peak: {
    rung: "peak",
    index: 4,
    label: "Peak",
    headline: "Elite build \u2014 near-target volumes.",
    description: "6-day elite template. Loads and intents approach the pro reference. Recovery clocks are tight because your tissue and CNS can handle turnaround.",
    volumeCeilings: {
      liftSessionsPerWeek: 4,
      speedSessionsPerWeek: 2,
      batSpeedSessionsPerWeek: 5,
      throwsPerWeekCeiling: 240
    },
    nextRung: "sustain",
    promotionCriteria: [
      "In-season roster status confirmed",
      "Signed pro / collegiate elite competitive level",
      "Ability to hold Peak volumes across a full mesocycle"
    ]
  },
  sustain: {
    rung: "sustain",
    index: 5,
    label: "Sustain",
    headline: "Preserve & compete \u2014 pro maintenance.",
    description: "In-season / pro preservation. Skills sharpen daily but never at the cost of Saturday's game. Lifts and speed hold their floor at the smallest effective dose.",
    volumeCeilings: {
      liftSessionsPerWeek: 3,
      speedSessionsPerWeek: 1,
      batSpeedSessionsPerWeek: 6,
      throwsPerWeekCeiling: 260
    },
    nextRung: null,
    promotionCriteria: [
      "Endpoint \u2014 the goal is not to leave Sustain, it is to stay healthy inside it."
    ]
  }
};
function resolveRoadmapRung(proj) {
  const age = typeof proj.liftingAgeYears === "number" ? proj.liftingAgeYears : null;
  const band = proj.lifecycleBand ?? "";
  const phase = proj.seasonPhase ?? "";
  const isYouth = band === "u10" || band === "u12" || band === "u14";
  if (isYouth || age !== null && age < 1) {
    return {
      descriptor: DESCRIPTORS.foundation,
      rationale: isYouth ? `Youth band (${band}) \u2014 protecting tissue and teaching movement first.` : `Under 1 year of lifting age \u2014 slow-walk build to keep every attempt legal.`
    };
  }
  if (phase === "in" && age !== null && age >= 3) {
    return {
      descriptor: DESCRIPTORS.sustain,
      rationale: "In-season with \u22653y training age \u2014 preserve capacity, prioritise game readiness."
    };
  }
  if (age !== null && age >= 5) {
    return {
      descriptor: DESCRIPTORS.peak,
      rationale: `${age}y training age \u2014 near-elite loads unlocked, recovery clock is tight.`
    };
  }
  if (age !== null && age >= 3) {
    return {
      descriptor: DESCRIPTORS.bridge,
      rationale: `${age}y training age \u2014 full off-season template available.`
    };
  }
  if (age !== null && age >= 1) {
    return {
      descriptor: DESCRIPTORS.build,
      rationale: `${age}y training age \u2014 building general capacity with 2\xD7 CNS work weekly.`
    };
  }
  return {
    descriptor: DESCRIPTORS.build,
    rationale: "Training age unknown \u2014 starting from Build (safe middle) until we learn more."
  };
}

// src/lib/hammer/roadmap/seasonQuarters.ts
var TABLE = {
  off: {
    1: {
      label: "Off-season Q1 \xB7 Hypertrophy",
      accent: "Hypertrophy",
      headline: "Build the tissue.",
      description: "Higher-volume lifting, controlled skill volume \u2014 the arm and hip machinery is being built.",
      recoveryWindowMultiplier: 1.1,
      volumeCeilingMultiplier: 0.9
    },
    2: {
      label: "Off-season Q2 \xB7 Strength",
      accent: "Strength",
      headline: "Turn tissue into force.",
      description: "Heavier lifts, longer rests. Skills held at capacity dose so lifts stay the priority.",
      recoveryWindowMultiplier: 1,
      volumeCeilingMultiplier: 1
    },
    3: {
      label: "Off-season Q3 \xB7 Power",
      accent: "Power",
      headline: "Turn force into speed.",
      description: "Power blocks, max-velocity sprints, contrast work. Recovery clock tightens as intensity rises.",
      recoveryWindowMultiplier: 0.95,
      volumeCeilingMultiplier: 1
    },
    4: {
      label: "Off-season Q4 \xB7 Taper-in",
      accent: "Taper",
      headline: "Sharpen and taper.",
      description: "Reduce volume, hold intent. Skills climb toward pre-season.",
      recoveryWindowMultiplier: 0.9,
      volumeCeilingMultiplier: 0.85
    }
  },
  pre: {
    1: {
      label: "Pre-season Q1 \xB7 Velocity build",
      accent: "Velocity",
      headline: "Build throwing velocity.",
      description: "Throwing ladder ramps. Bat speed density climbs. Lifts hold at 3x/wk.",
      recoveryWindowMultiplier: 0.95,
      volumeCeilingMultiplier: 1
    },
    2: {
      label: "Pre-season Q2 \xB7 Skill density",
      accent: "Skill",
      headline: "Reps that count.",
      description: "Skill volume with intent. Speed 3x/wk with acceleration bias.",
      recoveryWindowMultiplier: 0.9,
      volumeCeilingMultiplier: 1
    },
    3: {
      label: "Pre-season Q3 \xB7 Game readiness",
      accent: "Readiness",
      headline: "Rehearse the game.",
      description: "Live scenarios, competitive rounds. Lifts trim to sharpness.",
      recoveryWindowMultiplier: 0.85,
      volumeCeilingMultiplier: 0.9
    },
    4: {
      label: "Pre-season Q4 \xB7 Competition primer",
      accent: "Primer",
      headline: "Peaked and rested.",
      description: "Deload week. Freshness > volume \u2014 first live games arriving.",
      recoveryWindowMultiplier: 0.8,
      volumeCeilingMultiplier: 0.7
    }
  },
  in: {
    1: {
      label: "In-season Q1 \xB7 Heavy maintenance",
      accent: "Maintain",
      headline: "Hold the strength you built.",
      description: "2x/wk maintenance lifts, skill work daily but capped.",
      recoveryWindowMultiplier: 1,
      volumeCeilingMultiplier: 0.8
    },
    2: {
      label: "In-season Q2 \xB7 Sharpness",
      accent: "Sharp",
      headline: "Sharpen the tools.",
      description: "1x freshness speed. Skill volume with high intent, low count.",
      recoveryWindowMultiplier: 1,
      volumeCeilingMultiplier: 0.7
    },
    3: {
      label: "In-season Q3 \xB7 Preserve",
      accent: "Preserve",
      headline: "Preserve the arm and legs.",
      description: "Everything is subordinate to Saturday's game.",
      recoveryWindowMultiplier: 1.1,
      volumeCeilingMultiplier: 0.6
    },
    4: {
      label: "In-season Q4 \xB7 Playoff peaking",
      accent: "Peaking",
      headline: "Best version, now.",
      description: "Micro-taper into playoffs. Freshness is the goal.",
      recoveryWindowMultiplier: 1.15,
      volumeCeilingMultiplier: 0.55
    }
  },
  post: {
    1: {
      label: "Post-season Q1 \xB7 Unload",
      accent: "Unload",
      headline: "Full unload.",
      description: "Rest, mobility, film. Nothing forced.",
      recoveryWindowMultiplier: 1.3,
      volumeCeilingMultiplier: 0.4
    },
    2: {
      label: "Post-season Q2 \xB7 Restoration",
      accent: "Restore",
      headline: "Restore tissue.",
      description: "Movement quality, sleep, low-intent skill work.",
      recoveryWindowMultiplier: 1.2,
      volumeCeilingMultiplier: 0.5
    },
    3: {
      label: "Post-season Q3 \xB7 Movement quality",
      accent: "Movement",
      headline: "Fix the leaks.",
      description: "Movement patterning and light strength return.",
      recoveryWindowMultiplier: 1.15,
      volumeCeilingMultiplier: 0.7
    },
    4: {
      label: "Post-season Q4 \xB7 Base rebuild",
      accent: "Rebuild",
      headline: "Rebuild the base.",
      description: "General strength + capacity returns. Onramp to off-season.",
      recoveryWindowMultiplier: 1.05,
      volumeCeilingMultiplier: 0.85
    }
  }
};
function coercePhase(v) {
  return v === "pre" || v === "in" || v === "post" ? v : "off";
}
function weeksBetween(startIso, today) {
  if (!startIso) return -1;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return -1;
  const ms2 = today.getTime() - start.getTime();
  if (ms2 < 0) return 0;
  return Math.floor(ms2 / (7 * 24 * 60 * 60 * 1e3));
}
function quartersFromWeeks(weeks) {
  if (weeks < 0) return 2;
  if (weeks < 3) return 1;
  if (weeks < 6) return 2;
  if (weeks < 9) return 3;
  return 4;
}
var UNSET_QUARTER = {
  phase: "off",
  quarter: 2,
  phaseKnown: false,
  quarterKnown: false,
  label: "Season phase not set",
  accent: "Unset",
  headline: "Set your season dates.",
  description: "No season dates or phase are on file, so we can't say which block you're in. Set your season dates in your profile and this becomes a real mesocycle arc.",
  // Conservative middle dosing until the athlete tells us the truth.
  recoveryWindowMultiplier: 1,
  volumeCeilingMultiplier: 0.85
};
function resolveSeasonQuarter(proj, input, today) {
  const opts = input == null ? { phaseStartedAt: null } : typeof input === "string" ? { phaseStartedAt: input } : input;
  const phaseStartedAt = opts.phaseStartedAt ?? null;
  const source = opts.phaseSource ?? null;
  const rawPhase = opts.resolvedPhase ?? proj.seasonPhase;
  const phaseIsReal = source != null ? source !== "default" : rawPhase === "pre" || rawPhase === "in" || rawPhase === "post" || rawPhase === "off";
  if (!phaseIsReal) return UNSET_QUARTER;
  const phase = coercePhase(rawPhase ?? null);
  const weeks = weeksBetween(phaseStartedAt, today);
  const quarterKnown = weeks >= 0;
  const q = quartersFromWeeks(weeks);
  const row = TABLE[phase][q];
  if (!quarterKnown) {
    const phaseName = row.label.split(" ")[0];
    return {
      phase,
      quarter: q,
      phaseKnown: true,
      quarterKnown: false,
      label: `${phaseName} \xB7 block not set`,
      accent: row.accent,
      headline: row.headline,
      description: "We know your season phase, but not when it started \u2014 so we can't place you in a specific block. Add your season dates to unlock the quarter arc.",
      recoveryWindowMultiplier: 1,
      volumeCeilingMultiplier: 0.85
    };
  }
  return { phase, quarter: q, phaseKnown: true, quarterKnown: true, ...row };
}

// src/lib/hammer/roadmap/recoveryWindows.ts
var BASE_HOURS = {
  heavy_lift: { foundation: 96, build: 72, bridge: 72, peak: 48, sustain: 48 },
  max_velocity: { foundation: 72, build: 72, bridge: 48, peak: 48, sustain: 48 },
  bat_speed_max: { foundation: 72, build: 48, bridge: 48, peak: 24, sustain: 24 },
  throwing_max: { foundation: 96, build: 72, bridge: 48, peak: 48, sustain: 48 }
};
function recoveryModalityFor(m) {
  switch (m) {
    case "strength":
      return "heavy_lift";
    case "speed":
      return "max_velocity";
    case "hitting":
      return "bat_speed_max";
    case "throwing":
      return "throwing_max";
    default:
      return null;
  }
}
function evaluateRecoveryWindow(mod, side, rung, quarter, recent, today) {
  const base2 = BASE_HOURS[mod][rung];
  const windowHours = Math.max(12, Math.round(base2 * quarter.recoveryWindowMultiplier));
  const relevant = recent.filter((r) => r.modality === mod && (side == null || r.side == null || r.side === side));
  if (relevant.length === 0) {
    return {
      windowHours,
      hoursSince: null,
      hoursRemaining: 0,
      action: "primary",
      reason: `No recent max-intent ${labelFor(mod)}. Full attempt is legal today (window: ${windowHours}h).`,
      nextAvailableAt: null
    };
  }
  const latest = relevant.reduce((a, b) => a.at > b.at ? a : b);
  const hoursSince = Math.max(0, (today.getTime() - latest.at.getTime()) / (60 * 60 * 1e3));
  const hoursRemaining = Math.max(0, windowHours - hoursSince);
  const pctRemaining = windowHours > 0 ? hoursRemaining / windowHours : 0;
  if (hoursSince >= windowHours) {
    return {
      windowHours,
      hoursSince,
      hoursRemaining: 0,
      action: "primary",
      reason: `Last ${labelFor(mod)} ${fmtHours(hoursSince)} ago \u2014 outside the ${windowHours}h ${quarter.accent} window. Full attempt legal.`,
      nextAvailableAt: null
    };
  }
  const nextAt = new Date(latest.at.getTime() + windowHours * 60 * 60 * 1e3);
  if (pctRemaining > 0.75) {
    return {
      windowHours,
      hoursSince,
      hoursRemaining,
      action: "off",
      reason: `Last ${labelFor(mod)} only ${fmtHours(hoursSince)} ago. Recovery clock (${windowHours}h at ${labelRung(rung)}) needs ${fmtHours(hoursRemaining)} more \u2014 full attempt available ${fmtWhen(nextAt, today)}.`,
      nextAvailableAt: nextAt
    };
  }
  if (pctRemaining > 0.25) {
    return {
      windowHours,
      hoursSince,
      hoursRemaining,
      action: "activation",
      reason: `${fmtHours(hoursSince)} since last ${labelFor(mod)} \u2014 inside the ${windowHours}h window. Running at ~30% (activation) so freshness is protected for ${fmtWhen(nextAt, today)}.`,
      nextAvailableAt: nextAt
    };
  }
  return {
    windowHours,
    hoursSince,
    hoursRemaining,
    action: "secondary",
    reason: `${fmtHours(hoursSince)} since last ${labelFor(mod)} \u2014 window closes ${fmtWhen(nextAt, today)}. Running at ~60% (secondary).`,
    nextAvailableAt: nextAt
  };
}
function labelFor(m) {
  switch (m) {
    case "heavy_lift":
      return "heavy lift";
    case "max_velocity":
      return "max-velocity sprint";
    case "bat_speed_max":
      return "max bat-speed set";
    case "throwing_max":
      return "max-intent throw";
  }
}
function labelRung(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function fmtHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
function fmtWhen(when, today) {
  const diffH = (when.getTime() - today.getTime()) / (60 * 60 * 1e3);
  if (diffH < 1) return "shortly";
  if (diffH < 24) return `in ${Math.round(diffH)}h`;
  const days = Math.round(diffH / 24);
  return `in ${days}d`;
}
function applyRecoveryWindows(blocks, rung, quarter, recent, today) {
  return blocks.map((b) => {
    const mod = recoveryModalityFor(b.modality);
    if (!mod) return b;
    if (b.status === "awaiting-input" || b.status === "suppressed" || b.status === "off-day") {
      return b;
    }
    const side = b.side ?? null;
    const dec = evaluateRecoveryWindow(mod, side, rung, quarter, recent, today);
    if (dec.action === "primary") {
      return {
        ...b,
        roadmapReason: `${b.roadmapReason} \xB7 ${dec.reason}`
      };
    }
    if (dec.action === "off") {
      const nextLine = dec.nextAvailableAt ? `Available ${fmtWhen(dec.nextAvailableAt, today)}.` : "Available soon.";
      return {
        ...b,
        status: "off-day",
        title: `${b.title.split(" \u2014 ")[0]} \u2014 recovery clock \xB7 ${nextLine}`,
        why: dec.reason,
        roadmapReason: dec.reason,
        phase: "recover",
        drills: [],
        steps: [
          `Rest this modality \u2014 window is ${dec.windowHours}h at your ${labelRung(rung)} rung (${quarter.accent} quarter).`
        ],
        cues: [],
        stopRules: [],
        durationMin: 0,
        gamePlanTemplate: null
      };
    }
    const scale = dec.action === "activation" ? 0.3 : 0.6;
    const scaledDrills = b.drills.map((d2) => ({ ...d2, dosage: scaleDosageLabel(d2.dosage, scale) }));
    return {
      ...b,
      drills: scaledDrills,
      steps: scaledDrills.map((d2) => `${d2.name} \u2014 ${d2.dosage}`),
      durationMin: b.durationMin == null ? b.durationMin : Math.max(8, Math.round(b.durationMin * scale)),
      roadmapReason: `${b.roadmapReason} \xB7 ${dec.reason}`
    };
  });
}
function scaleDosageLabel(dosage, scale) {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = Math.max(1, Math.round(parseInt(m[1], 10) * scale));
  return dosage.replace(/^(\d+)/, String(sets));
}

// src/lib/hammer/roadmap/throwingLadder.ts
var PITCHER_LADDER = {
  foundation: { baseThrows: 25, maxIntent: 60, longTossUnlocked: false },
  build: { baseThrows: 35, maxIntent: 70, longTossUnlocked: false },
  bridge: { baseThrows: 45, maxIntent: 80, longTossUnlocked: true },
  peak: { baseThrows: 60, maxIntent: 90, longTossUnlocked: true },
  sustain: { baseThrows: 55, maxIntent: 85, longTossUnlocked: true }
};
var POSITION_LADDER2 = {
  foundation: { baseThrows: 20, maxIntent: 60, longTossUnlocked: false },
  build: { baseThrows: 30, maxIntent: 70, longTossUnlocked: false },
  bridge: { baseThrows: 40, maxIntent: 80, longTossUnlocked: true },
  peak: { baseThrows: 50, maxIntent: 90, longTossUnlocked: true },
  sustain: { baseThrows: 45, maxIntent: 85, longTossUnlocked: true }
};
function isPitcher2(position) {
  return positionTokenIsPitcher(position);
}
function prescribeThrowingLadder(rung, quarter, position) {
  const row = isPitcher2(position) ? PITCHER_LADDER[rung] : POSITION_LADDER2[rung];
  const throwsToday = Math.max(10, Math.round(row.baseThrows * quarter.volumeCeilingMultiplier));
  const maxIntent = Math.max(50, Math.min(100, Math.round(row.maxIntent * (0.9 + 0.1 * quarter.volumeCeilingMultiplier))));
  const longTossUnlocked = row.longTossUnlocked && quarter.volumeCeilingMultiplier >= 0.8;
  const headline = `Throw ${throwsToday} today \xB7 ${maxIntent}% intent` + (longTossUnlocked ? " \xB7 long-toss unlocked" : " \xB7 long-toss locked");
  const rationale = `Ladder tuned to your ${labelRung2(rung)} rung and ${quarter.accent} quarter. ` + (longTossUnlocked ? `Long-toss is unlocked \u2014 earn it with a clean pre-throw checklist.` : `Long-toss is still locked \u2014 it unlocks at Bridge or higher during a full-volume quarter.`);
  return { throwsToday, maxIntentPercent: maxIntent, longTossUnlocked, headline, rationale };
}
function labelRung2(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

// src/lib/hammer/roadmap/eliteTarget.ts
var ELITE_TARGETS = {
  baseball: {
    sport: "baseball",
    league: "MLB",
    gamesPerWeekHigh: 6,
    weeklyThrowsCeiling: 250,
    liftSessionsPerWeek: 3,
    speedSessionsPerWeek: 2,
    batSpeedSessionsPerWeek: 4,
    notes: "MLB position players sustain 6 high-level games/week for months. The plan builds you toward that capacity \u2014 heavier and faster only when your training-age and recovery clock earn it."
  },
  softball: {
    sport: "softball",
    league: "AUSL",
    gamesPerWeekHigh: 6,
    weeklyThrowsCeiling: 220,
    liftSessionsPerWeek: 3,
    speedSessionsPerWeek: 2,
    batSpeedSessionsPerWeek: 4,
    notes: "AUSL position players face a compressed 6-game week. Arm capacity, bat-speed density, and short-burst speed are the endpoints the program builds you toward."
  }
};
function resolveEliteTarget(sport) {
  return sport === "softball" ? ELITE_TARGETS.softball : ELITE_TARGETS.baseball;
}

// src/lib/hammer/prescription/scheduleContext.ts
var NORMAL_SIGNAL = {
  todayKinds: [],
  tomorrowKinds: [],
  isGameToday: false,
  isTournamentToday: false,
  isCampToday: false,
  isTravelToday: false,
  hasTeamPracticeToday: false,
  isGameTomorrow: false,
  isTournamentTomorrow: false,
  tournamentWindow: null,
  tournamentDayLabel: null,
  postureToday: "normal",
  eventLabel: null,
  rationale: ""
};

// src/lib/hammer/prescription/dailyPlan.ts
var ALL_MODALITIES = [
  "warmup",
  "speed",
  "strength",
  "hitting",
  "throwing",
  "defense",
  "baserunning",
  "game_iq",
  "fueling",
  "recovery"
];
var BODYWEIGHT_EQUIPMENT = /* @__PURE__ */ new Set(["bodyweight", "bands", "hotel"]);
function hittingDrillsForEquipment(owned, seasonPhase) {
  const inSeason = seasonPhase === "in";
  const heavy = seasonPhase === "off";
  const has = (t) => owned.has(t);
  const drills = [
    { name: "Dry swings \u2014 barrel path", dosage: inSeason ? "2 rounds of 8" : "3 rounds of 10", cue: "shoulder-to-shoulder hold, no hand push", stage: "prep" }
  ];
  if (has("tee")) {
    drills.push({
      name: "Tee work \u2014 barrel path",
      dosage: inSeason ? "10 quality swings" : heavy ? "30 swings (3 rounds of 10)" : "20 swings",
      cue: "hit the back of the ball, finish balanced"
    });
  }
  if (has("screen") || has("ball") && has("net")) {
    drills.push({
      name: "Front toss \u2014 sequence drill",
      dosage: inSeason ? "10 swings" : heavy ? "25 swings" : "15 swings",
      cue: "land, see, then swing"
    });
  }
  if (has("pitching_machine")) {
    drills.push({
      name: "Full-go: machine at-bats with counts",
      dosage: inSeason ? "15 swings" : heavy ? "40 swings" : "25 swings",
      cue: "game speed; play each at-bat from a count (start 1-1, 2-2); every swing with intent; track every pitch \u2014 even no-swings",
      stage: "full_go",
      equipmentNote: "Pitching machine"
    });
  } else if (has("net")) {
    drills.push({
      name: "Full-go: cage at-bats with counts",
      dosage: inSeason ? "10 swings (quality > volume)" : heavy ? "40 swings" : "25 swings",
      cue: "game speed; play each round from a count (start 1-1, 2-2); every swing with intent \u2014 compete on every pitch",
      stage: "full_go"
    });
  }
  if (has("overload_bat") || has("underload_bat")) {
    drills.push({
      name: "Heavy / light bat contrast",
      dosage: "3 heavy, 3 light, 3 game bat \xD7 3 rounds",
      cue: "same intent every swing, do not muscle the heavy bat",
      equipmentNote: has("overload_bat") && has("underload_bat") ? "Heavy bat and light bat" : has("overload_bat") ? "Heavy bat" : "Light bat"
    });
  }
  if (drills.length === 1) {
    drills.push({ name: "Mirror or shadow swings \u2014 path check", dosage: "3 rounds of 8", cue: "watch the barrel enter the zone, not your hands" });
  }
  if (has("bat_sensor")) {
    drills.push({ name: "Log bat speed on your best round", dosage: "1 round", equipmentNote: "Bat sensor" });
  }
  drills.push({ name: "Log it: film 5 swings and tag them, write your swing count", dosage: "best 5 swings", stage: "log" });
  return drills.map((d2) => d2.stage ? d2 : { ...d2, stage: "drills" });
}
function goalLine(proj) {
  if (!proj.goalSummary) return null;
  return proj.goalHorizon ? `Goal: ${proj.goalSummary} (${proj.goalHorizon}-horizon).` : `Goal: ${proj.goalSummary}.`;
}
function drillsToSteps(drills) {
  return drills.map(
    (d2) => d2.setup ? `${d2.name} \u2014 ${d2.dosage} (${d2.setup})` : `${d2.name} \u2014 ${d2.dosage}`
  );
}
function drillsToChecklist(drills) {
  return drills.map((d2) => `${d2.name} \u2014 ${d2.dosage}`);
}
function builder({ modality, ctx, proj, speed, positionOverride, modalityBiasOverride, pitcherOutings, skillExecutionAllowed = true }) {
  const declaredPos = firstPositionToken(ctx.get("position_primary")?.value) ?? firstPositionToken(ctx.get("position")?.value) ?? null;
  const pos = firstPositionToken(positionOverride) ?? declaredPos;
  const liftingAge = proj.liftingAgeYears;
  const seasonPhase = proj.seasonPhase;
  const injury = proj.injury;
  const injuryRegions = proj.injuryRegions;
  const readiness = ctx.get("readiness")?.value ?? null;
  const equipment = proj.equipment;
  const lifecycleBand = proj.lifecycleBand;
  const availDays = proj.weeklyAvailabilityDays;
  const devPriorities = proj.developmentPriorities;
  const workloadHigh = proj.workloadHigh;
  const anthro = buildAnthroProfile(ctx.get("anthropometrics")?.value);
  const anthroSignal = hasAnyAnthroSignal(anthro);
  const readinessScore = typeof readiness === "number" ? readiness : typeof readiness?.score === "number" ? readiness.score : null;
  const recoverDay = readinessScore !== null && readinessScore < 0.4;
  const youthScale = lifecycleBand === "u10" || lifecycleBand === "u12" || lifecycleBand === "u14";
  const lowAvail = typeof availDays === "number" && availDays <= 2;
  const bodyweightOnly = equipment !== null && BODYWEIGHT_EQUIPMENT.has(equipment);
  const goal = goalLine(proj);
  switch (modality) {
    case "warmup": {
      const scheduleAny = proj;
      const sched = scheduleAny?.schedule ?? {};
      const isGameDay = !!sched.isGameDay;
      const isPracticeDay = !!sched.isPracticeDay;
      const isTravelDay = !!sched.isTravelDay;
      const isRecoveryDay = !!sched.isRecoveryDay || recoverDay;
      const lifecycle = lifecycleFor(lifecycleBand, liftingAge);
      const now = /* @__PURE__ */ new Date();
      const daySeed = now.getUTCFullYear() * 366 + now.getUTCMonth() * 31 + now.getUTCDate();
      const contextArgs = {
        seasonPhase,
        isGameDay,
        isPracticeDay,
        isTravelDay,
        isRecoveryDay
      };
      const biasedContext = resolveWarmupContext({
        ...contextArgs,
        modalityBias: modalityBiasOverride ?? null
      });
      const unbiasedContext = resolveWarmupContext({ ...contextArgs, modalityBias: null });
      const MIN_WARMUP_DRILLS = 4;
      let context = biasedContext;
      const projAny = proj;
      const warmupArgs = {
        context,
        lifecycle,
        gameDay: isGameDay,
        daySeed,
        suppressArmCare: true,
        equipment: projAny.equipmentList ?? (equipment ? [equipment] : []),
        venue: projAny.equipmentVenue ?? equipment ?? null,
        injuryRegions: injuryRegions ?? [],
        suppressTwitch: isRecoveryDay || recoverDay || isTravelDay,
        sport: normalizeSport(ctx.get("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball",
        isThrower: pos === "P" || pos === "C"
      };
      let built = buildWarmup(warmupArgs);
      if (biasedContext !== unbiasedContext && built.drills.length < MIN_WARMUP_DRILLS) {
        const fallback = buildWarmup({ ...warmupArgs, context: unbiasedContext });
        if (fallback.drills.length > built.drills.length) {
          context = unbiasedContext;
          built = fallback;
        }
      }
      const drills = mergeOwnerSlotDrills(built.drills.map((d2) => ({
        name: d2.name,
        slug: d2.slug,
        setup: d2.setup,
        dosage: d2.dosage,
        cue: d2.cue,
        stopIf: d2.stopIf,
        equipmentNote: d2.equipmentNote,
        guide: d2.guide
      })), ["hammers_today:warmup"], { sport: normalizeSport(ctx.get("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball", owned: new Set(proj.equipmentList ?? []) });
      if (isRecoveryDay || recoverDay) {
        const primer = getSeasonHPI(seasonPhase);
        drills.splice(1, 0, {
          name: "Breath primer (60 sec)",
          slug: "hpi-breath-primer",
          setup: "Seated or standing tall, shoulders soft, tongue on the roof of the mouth.",
          dosage: primer.breathPrimer,
          cue: `${primer.element} phase \u2014 ${primer.qiDirective}`,
          stopIf: "Lightheaded \u2014 stop, breathe normally, then continue.",
          guide: {
            what: "A short breath-first primer that regulates the autonomic system before movement.",
            setup: "Seated or standing tall, shoulders soft, tongue on the roof of the mouth.",
            goodRep: ["Slow, quiet nasal breathing.", "Ribs expand 360\xB0, not just the chest.", "Exhale is longer than the inhale."],
            badRep: ["Mouth breathing.", "Shoulders shrugging up on the inhale.", "Rushing the tempo."],
            feel: "Calm, warm, slightly heavier \u2014 sympathetic tone dropping.",
            whyToday: "Long exhales bias parasympathetic recovery; box breathing steadies focus before performance.",
            nextLink: "hammer:open-hpi",
            stopIf: "Lightheaded \u2014 stop, breathe normally, then continue."
          }
        });
      }
      {
        const roleBySlug = new Map(built.drills.map((d2) => [d2.slug, d2.role]));
        const sorted = sortByWarmupStage(drills, (d2) => d2.slug ?? "", (d2) => roleBySlug.get(d2.slug ?? "") ?? null);
        drills.splice(0, drills.length, ...sorted);
      }
      const titleByContext = {
        game_day: "Warm-up \u2014 game-day neural primer",
        in_season_practice: "Warm-up \u2014 practice-ready",
        in_season_default: "Warm-up \u2014 in-season maintenance",
        speed_day: "Warm-up \u2014 speed-day fast-twitch prep",
        lift_day: "Warm-up \u2014 lift-day joint + stability prep",
        throwing_day: "Warm-up \u2014 throwing-day arm-care prep",
        hitting_day: "Warm-up \u2014 hitting-day rotational prep",
        offseason_extended: "Warm-up \u2014 off-season extended (fascial + fast-twitch)",
        recovery_day: "Warm-up \u2014 recovery flow",
        travel_day: "Warm-up \u2014 travel-day movement prep",
        default: "Warm-up \u2014 dynamic"
      };
      const whyByContext = {
        game_day: "Prime the fascial system and fire fast-twitch pathways without spending \u2014 you want the CNS awake, not fatigued.",
        in_season_practice: "Restore tissue glide, wake up stabilizers, spark the fast-twitch reflex \u2014 carry patterns stay sharp inside the warm-up so you save legs for practice.",
        in_season_default: "Short elite prep so you're honest before skill work \u2014 CARs and fascial rotation open the joints, low-cost neural priming keeps quickness alive.",
        speed_day: "Fast-twitch prep is the whole point \u2014 controlled joint circles open the joints, ankle bounces and pogos wake stiffness, altitude drops sharpen ground contact.",
        lift_day: "Controlled joint circles and trunk holds prepare you to lift \u2014 resist turning and hold your side steady before the barbell.",
        throwing_day: "Warm the tissue, open the thorax, and progress arm-care so the shoulder complex is ready before the first throw.",
        hitting_day: "Fascial rotation, hip mobility, and low-volume rotational power ready the swing without pre-fatiguing it.",
        offseason_extended: "Full spectrum \u2014 tissue hydration, CARs, fascial spirals, mobility, stability, neural priming, and fast-twitch primer \u2014 because volume today demands honest prep.",
        recovery_day: "Breathwork, tissue prep, and slow CARs to move fluid, drop tone, and set the parasympathetic state.",
        travel_day: "Reset the ribcage, decompress the spine, wake the glutes \u2014 undo the seat.",
        default: "Elite prep calibrated to today's session length."
      };
      const roadmapByContext = {
        game_day: "Game today \u2014 short neural primer so the CNS is on but not spent.",
        in_season_practice: "Practice today \u2014 enough prep to move well, low enough cost to save legs.",
        in_season_default: "In-season maintenance \u2014 quick tissue prep, CARs, and neural spark.",
        speed_day: "Speed day \u2014 the warm-up IS part of the stimulus. Wake the ankle stiffness first.",
        lift_day: "Lift day \u2014 earn the load with CARs, activation, and stability primers.",
        throwing_day: "Throwing day \u2014 arm-care volume front-loaded so the shoulder is ready.",
        hitting_day: "Hitting day \u2014 rotational prep primes elastic transfer through the swing.",
        offseason_extended: "Off-season \u2014 extended prep so you can handle today's volume honestly.",
        recovery_day: "Readiness is low \u2014 moving fluid, downshifting tone, no CNS spend.",
        travel_day: "Travel day \u2014 undo the seat, restore breathing, wake the posterior chain.",
        default: "Standard elite warm-up."
      };
      const dur = built.estMinutes;
      const contextKey = built.context;
      const hpi = getSeasonHPI(seasonPhase);
      const twitchNote = built.singleLegShare === null ? built.diagnostics.some((d2) => d2.code === "twitch_suppressed") ? "No fast-twitch work today \u2014 prep only, we're protecting the CNS." : "" : `Fast-twitch layer: ${Math.round(built.singleLegShare * 100)}% single-leg. Baseball and softball are one-leg, quick-burst games \u2014 quickness is built one leg at a time.`;
      return {
        modality,
        title: titleByContext[contextKey] ?? titleByContext.default,
        why: [whyByContext[contextKey] ?? whyByContext.default, twitchNote, hpi.qiDirective].filter(Boolean).join(" "),
        roadmapReason: `${roadmapByContext[contextKey] ?? roadmapByContext.default} (${hpi.element} phase \u2014 ${hpi.yinYangEmphasis})`,
        phase: isGameDay || isRecoveryDay ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Move slow first, fast last \u2014 tissue before intent.",
          "Every rep is honest \u2014 no drift, no going through the motions.",
          "Fascial and fast-twitch drills earn everything downstream.",
          "Quick feet, quiet feet \u2014 the ground gets hit hard and left fast."
        ],
        stopRules: [
          "Sharp pain (not muscle soreness) \u2014 stop and update Hammer where.",
          "Any pull or tightness on a fast-twitch drill \u2014 end the fast-twitch portion.",
          "Ground contacts getting loud or slow \u2014 the twitch work is done for today.",
          "Dizziness or shortness of breath \u2014 pause, hydrate, restart slower."
        ],
        durationMin: dur,
        route: "hammer:open-warmup-generator",
        ctaLabel: "Open warm-up",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: titleByContext[contextKey] ?? "Hammer warm-up",
          activityType: "warmup",
          icon: "flame",
          color: "#f97316",
          durationMinutes: dur,
          description: whyByContext[contextKey] ?? "Daily dynamic warm-up prescribed by Hammer.",
          checklist: drillsToChecklist(drills),
          source: `hammer.daily.warmup.${contextKey}`
        }
      };
    }
    case "speed": {
      const focus = speed.focus;
      const titleMap = {
        deload: "Speed \u2014 deload",
        tempo_recovery: "Speed \u2014 tempo recovery",
        unilateral_symmetry: "Speed \u2014 unilateral symmetry",
        offseason_volume: "Speed \u2014 off-season volume",
        inseason_freshness: "Speed \u2014 in-season freshness",
        max_velocity: "Speed \u2014 max velocity",
        acceleration_base: "Speed \u2014 acceleration base"
      };
      const drillsMap = {
        deload: [
          { name: "Easy tempo runs", dosage: "4 x 60 yards @ 60%", cue: "smooth and tall, no straining" },
          { name: "Mobility cool-down", dosage: "5 min hips + ankles" }
        ],
        tempo_recovery: [
          { name: "A-skips", dosage: "2 x 20 yards", cue: "tall posture, quick foot strike" },
          { name: "Build-up runs", dosage: "2 x 40 yards (build to 70%)", cue: "accelerate gradually, no jerks" },
          { name: "Tempo runs", dosage: `${speed.recommendedReps} x 60 yards @ 70%`, cue: "even pace, full recovery walk back", stopIf: "any tightness \u2014 switch to walk only" }
        ],
        unilateral_symmetry: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Single-leg pogos", dosage: "3 x 6 per side", cue: "stiff ankle, equal hop height both sides" },
          { name: "Unilateral bounds", dosage: `${speed.recommendedReps} x 20 yards alternating`, cue: "land balanced, no collapse" },
          { name: "Split-stance starts", dosage: "4 x 10 yards per side", cue: "drive the back knee, punch the ground" }
        ],
        offseason_volume: [
          { name: "A-skips + B-skips", dosage: "2 x 20 yards each" },
          { name: "Build-up runs", dosage: "2 x 40 yards (build to 90%)" },
          { name: "40-yard sprints", dosage: `${speed.recommendedReps} x 40 yards @ 90%`, cue: "drive arms knee-to-cheek, eyes down for first 10y", stopIf: "any pull or strain \u2014 shut it down" },
          { name: "Resisted starts (sled or band)", dosage: "3 x 10 yards", cue: "push the ground back, stay angled forward" },
          { name: "Long-acceleration runs", dosage: "2 x 60 yards @ 95%", cue: "smooth rise, no top-end straining" }
        ],
        inseason_freshness: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "2 x 30 yards (to 90%)", cue: "smooth, no maximal effort yet" },
          { name: "20-yard sprints", dosage: `${speed.recommendedReps} x 20 yards @ 95%`, cue: "full 60s recovery between reps", stopIf: "any tightness whatsoever \u2014 stop today" }
        ],
        max_velocity: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "3 x 40 yards (build to 95%)" },
          { name: "Flying 20s", dosage: `${speed.recommendedReps} x 20 yards @ 100% (with 20y build-in)`, cue: "tall posture, relaxed face, fast turnover", stopIf: "any pull \u2014 stop the session" },
          { name: "Walk-back recovery", dosage: "2-3 min between reps", cue: "fully recovered before next rep \u2014 speed work is not conditioning" }
        ],
        acceleration_base: [
          { name: "A-skips", dosage: "2 x 20 yards" },
          { name: "Build-up runs", dosage: "2 x 30 yards (to 90%)" },
          { name: "10-yard starts", dosage: `${speed.recommendedReps} x 10 yards @ 100%`, cue: "low body angle, punch the ground, drive arms hard", stopIf: "any pull or strain" },
          { name: "Optional resisted starts", dosage: "3 x 10 yards (sled or band)" }
        ]
      };
      const durationMap = {
        deload: 12,
        tempo_recovery: 18,
        unilateral_symmetry: 22,
        offseason_volume: 30,
        inseason_freshness: 15,
        max_velocity: 25,
        acceleration_base: 22
      };
      const phaseMap = {
        deload: "deload",
        tempo_recovery: "recover",
        unilateral_symmetry: "build",
        offseason_volume: "build",
        inseason_freshness: "sharpen",
        max_velocity: "sharpen",
        acceleration_base: "build"
      };
      const suppressed = focus === "deload" || focus === "tempo_recovery";
      const drills = recoverDay ? [{ name: "Easy walk or light tempo", dosage: "10 min", cue: "no max effort today" }] : drillsMap[focus];
      return {
        modality,
        title: recoverDay ? "Speed \u2014 skipped (recovery)" : titleMap[focus],
        why: recoverDay ? "Readiness is low. Protecting tomorrow's session matters more than today's reps." : speed.rationale + (goal ? ` ${goal}` : ""),
        roadmapReason: recoverDay ? "Today is recover-first because your readiness signal dropped below 40%." : `Today is ${phaseMap[focus]} because ${speed.rationale}.`,
        phase: recoverDay ? "recover" : phaseMap[focus],
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Speed work is not conditioning \u2014 full recovery between reps.",
          "Quality over quantity. One great rep beats five mediocre ones."
        ],
        stopRules: [
          "Any pull, twinge, or sudden tightness \u2014 stop the session entirely.",
          "Times dropping more than 10% from your best of the day \u2014 stop, you're done."
        ],
        durationMin: recoverDay ? 0 : durationMap[focus],
        route: recoverDay || suppressed ? "/bounce-back-bay" : "/my-daily-game-plan",
        ctaLabel: recoverDay ? "Recover instead" : "Open Hammers Today",
        status: recoverDay ? "suppressed" : "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: recoverDay ? null : {
          title: `Hammer speed \u2014 ${focus.replace(/_/g, " ")}`,
          activityType: "running",
          icon: "zap",
          color: "#0ea5e9",
          durationMinutes: durationMap[focus],
          description: `Speed session: ${speed.rationale}`,
          checklist: drillsToChecklist(drills),
          source: `hammer.daily.speed.${focus}`
        }
      };
    }
    case "strength": {
      if (liftingAge === null) {
        const drills2 = [
          { name: "Goblet squat", dosage: "3 x 8, light \u2014 leave 4 reps in the tank", cue: "chest tall, knees track over toes", stopIf: "Knee or back pain" },
          { name: "Push-up (or incline push-up)", dosage: "3 x 8", cue: "body in one line, elbows about 45 degrees" },
          { name: "Split squat", dosage: "3 x 6 each leg", cue: "back knee straight down, front foot flat" },
          { name: "Single-arm row", dosage: "3 x 8 each side", cue: "pull to the hip, no twisting" },
          { name: "Dead bug", dosage: "3 x 6 each side", cue: "low back stays glued to the floor" }
        ];
        return {
          modality,
          title: "Strength \u2014 conservative start",
          why: "I don't have your lifting history yet, so I'm starting you light and safe rather than skipping the day.",
          assumption: "Assuming you're new to structured lifting. Update Hammer how long you've been lifting and I'll load this properly.",
          roadmapReason: "No lifting history on file \u2014 prescribing the entry-level session until you tell me otherwise.",
          phase: "build",
          steps: drillsToSteps(drills2),
          drills: drills2,
          cues: ["Technique before load. Every rep looks the same."],
          stopRules: ["Any sharp pain \u2014 stop the exercise.", "If a set gets ugly, end it there."],
          durationMin: 30,
          route: "/training-block",
          ctaLabel: "Open lift",
          status: "ready",
          missing: ["lifting_history"],
          missingContextKeys: ["lifting_history"],
          gamePlanTemplate: {
            title: "Hammer strength \u2014 conservative start",
            activityType: "workout",
            icon: "dumbbell",
            color: "#dc2626",
            durationMinutes: 30,
            description: "Entry-level strength session.",
            checklist: drillsToChecklist(drills2),
            source: "internal"
          }
        };
      }
      const phaseTemplate = seasonPhase === "off" ? { name: "off-season volume", sets: "4x6", durationBase: 55, phase: "build" } : seasonPhase === "pre" ? { name: "pre-season strength", sets: "4x4", durationBase: 50, phase: "build" } : seasonPhase === "in" ? { name: "in-season potentiation", sets: "3x3", durationBase: 35, phase: "maintain" } : seasonPhase === "post" ? { name: "post-season recovery", sets: "2x8", durationBase: 30, phase: "recover" } : { name: "standard", sets: "3x5", durationBase: 50, phase: "build" };
      const heavyLiftBlocked = injuryRegions.includes("back") || injuryRegions.includes("lumbar") || injuryRegions.includes("knee") || injuryRegions.includes("hamstring");
      const drills = bodyweightOnly ? [
        { name: "Bodyweight squat or split squat", dosage: "3 x 8 quality reps", cue: "knees track toes, chest tall" },
        { name: "Push-up progression", dosage: "3 x 8", cue: "body in a straight line, full lock-out" },
        { name: "Band row", dosage: "3 x 10", cue: "pull elbows back, squeeze the shoulder blades" },
        { name: "Plank + dead-bug finisher", dosage: "2 x 30s", cue: "ribs down, no lower-back arch" }
      ] : youthScale ? [
        { name: "Bodyweight squat or goblet squat (light)", dosage: "2 x 8", cue: "movement quality only" },
        { name: "Push-up progression", dosage: "2 x 6" },
        { name: "Row variation", dosage: "2 x 8" },
        { name: "Plank + bird-dog finisher", dosage: "2 x 30s" }
      ] : heavyLiftBlocked ? [
        { name: "Goblet squat or hip hinge (sub-max)", dosage: `3 x 8`, cue: "smooth, controlled, no grinding reps", stopIf: "any sharp pain in injured area" },
        { name: "DB bench or push-up", dosage: "3 x 6" },
        { name: "Row or chin-up", dosage: "3 x 8" },
        { name: "Posterior chain accessory (controlled)", dosage: "2 x 10" }
      ] : [
        { name: "Main lift: trap-bar deadlift or squat", dosage: phaseTemplate.sets, cue: "brace hard, drive the floor away", stopIf: "form breakdown \u2014 drop the weight" },
        { name: "Push: bench press or DB press", dosage: phaseTemplate.sets, cue: "feet planted, full lock-out" },
        { name: "Pull: row or chin-up", dosage: "3 x 8" },
        { name: "Posterior chain accessory", dosage: "2 x 10" }
      ];
      if (devPriorities.includes("power")) {
        drills.push({ name: "Power finisher: jump or med-ball throw", dosage: "4 x 3", cue: "max intent, full recovery" });
      } else if (devPriorities.includes("mobility")) {
        drills.push({ name: "Mobility finisher", dosage: "8 min hips + t-spine" });
      } else if (devPriorities.includes("speed")) {
        drills.push({ name: "Short-contact pogos", dosage: "3 x 8", cue: "stiff ankles" });
      }
      const anthroOut = anthroSignal && !youthScale && !bodyweightOnly ? selectStrengthSwaps(anthro) : { swaps: [], rationale: null };
      for (const sw of anthroOut.swaps) {
        drills.push({
          name: sw.preferred,
          dosage: phaseTemplate.sets,
          cue: sw.cue,
          setup: sw.demote ? `Preferred over: ${sw.demote}` : void 0
        });
      }
      const duration = recoverDay ? 30 : workloadHigh ? Math.max(25, phaseTemplate.durationBase - 15) : youthScale ? 25 : bodyweightOnly ? lowAvail ? 25 : 30 : lowAvail ? Math.max(35, phaseTemplate.durationBase - 10) : phaseTemplate.durationBase;
      return {
        modality,
        title: youthScale ? "Strength \u2014 youth template" : bodyweightOnly ? `Strength \u2014 bodyweight (${equipment})` : heavyLiftBlocked ? "Strength \u2014 injury-modified" : workloadHigh ? `Strength \u2014 auto-deload (${phaseTemplate.name})` : `Strength \u2014 ${phaseTemplate.name}`,
        why: recoverDay ? "Deload day \u2014 preserve quality, drop volume." : workloadHigh ? "Workload is high \u2014 protecting recovery; volume reduced." : heavyLiftBlocked ? `Injury-aware template (${injuryRegions.join(", ")}) \u2014 sub-max patterning only.` : youthScale ? "Movement quality bias for developing athletes; no max-effort loading." : `Force production (${phaseTemplate.name}).` + (goal ? ` ${goal}` : ""),
        roadmapReason: (workloadHigh ? "Auto-deload \u2014 workload elevated across the last 7 days." : recoverDay ? "Reduced today because readiness dropped below 40%." : `Today is ${phaseTemplate.phase} because we're in ${seasonPhase ?? "an undeclared"} season phase.`) + (anthroOut.rationale ? ` ${anthroOut.rationale}` : ""),
        phase: workloadHigh || recoverDay ? "deload" : phaseTemplate.phase,
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Every rep is a deposit. Trash reps cost the same as quality reps.",
          "If you can't keep technique on the last rep, the set is over."
        ],
        stopRules: [
          "Sharp pain (especially back, knee, shoulder) \u2014 stop the lift immediately.",
          "Two missed reps in a row at the prescribed weight \u2014 drop the weight 10%."
        ],
        durationMin: duration,
        route: "/training-block",
        ctaLabel: "Open lift",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer strength \u2014 ${phaseTemplate.name}`,
          activityType: "workout",
          icon: "dumbbell",
          color: "#dc2626",
          durationMinutes: duration,
          description: `Strength session: ${phaseTemplate.name}.`,
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "hitting": {
      const ownedHitting = new Set(
        proj.equipmentList ?? []
      );
      const equipmentUnknown = !equipment && ownedHitting.size === 0;
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const declaredDrills = ownedHitting.size > 0 ? hittingDrillsForEquipment(ownedHitting, seasonPhase) : null;
      const drills = structureSkillSession(mergeOwnerSlotDrills(declaredDrills ?? (equipmentUnknown ? [
        { name: "Dry swings \u2014 barrel path", dosage: "3 rounds of 10", cue: "shoulder-to-shoulder hold, no hand push", stage: "prep" },
        { name: "Dry swing drill \u2014 balanced finish", dosage: "20 swings", cue: "keep the barrel on path, finish balanced", stage: "drills" },
        {
          name: "Game-speed dry swings with counts",
          dosage: "15 swings",
          stage: "full_go",
          setup: "Use your bat in a clear, safe space. Picture an at-bat starting 1-1, then 2-2. No ball, tee or partner is needed. Use these same 15 swings; do not add more.",
          cue: "Every swing with intent; see an imaginary pitch, decide, then swing. Reset fully between swings.",
          stopIf: "Hand or wrist pain, unsafe space or loss of balance \u2014 stop the game-speed round."
        },
        { name: "Film 5 swings on your phone and tag them", dosage: "best 5 swings", stage: "log" }
      ] : inSeason ? [
        { name: "Tee work \u2014 barrel path", dosage: "10 quality swings", cue: "stay through the ball, do not pull off" },
        { name: "Front toss \u2014 pitch recognition", dosage: "10 swings", cue: "see ball deep, hands stay back" },
        { name: "Live BP \u2014 game-quality", dosage: "10 swings (quality > volume)" }
      ] : offSeason ? [
        { name: "Tee work \u2014 barrel path", dosage: "30 swings (3 rounds of 10)", cue: "shoulder-to-shoulder hold, no hand push" },
        { name: "Front toss \u2014 sequence drill", dosage: "25 swings", cue: "land, see, then swing" },
        { name: "Live BP or machine", dosage: "40 swings", cue: "track every pitch, even no-swings" },
        { name: "Video + tag swings in PIE", dosage: "5-10 best swings flagged" }
      ] : [
        { name: "Tee work \u2014 barrel path", dosage: "20 swings", cue: "shoulder-to-shoulder hold" },
        { name: "Front toss \u2014 sequence drill", dosage: "15 swings" },
        { name: "Live BP or machine", dosage: "25 swings" },
        { name: "Video + tag in PIE", dosage: "best 5 swings flagged" }
      ]), ["hammers_today:skill"], { sport: normalizeSport(ctx.get("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball", owned: ownedHitting, skill: "hitting" }), { skill: "hitting", sport: normalizeSport(ctx.get("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball", owned: ownedHitting, injuryRegions, recoveryDay: recoverDay });
      return {
        modality,
        title: equipmentUnknown ? "Hitting \u2014 bat-and-space session" : declaredDrills ? `Hitting \u2014 built from your gear${inSeason ? " (in-season)" : offSeason ? " (off-season)" : ""}` : inSeason ? "Hitting \u2014 in-season quality" : offSeason ? "Hitting \u2014 off-season build" : "Hitting",
        assumption: equipmentUnknown ? "Assuming you have a bat and somewhere safe to swing. Update Hammer what you actually have and I'll upgrade this." : void 0,
        why: (inSeason ? "Sharpen timing without spending." : offSeason ? "Volume + mechanical rebuild." : "Quality reps targeting your weakness pattern.") + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason ? "In-season \u2014 focus on timing and feel, not volume." : offSeason ? "Off-season \u2014 high volume + mechanical work while there is no game pressure." : "Default hitting block calibrated to season phase.",
        phase: inSeason ? "sharpen" : offSeason ? "build" : "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Track every pitch, even no-swings.",
          "Quality first \u2014 bail on a round if you start grooving bad habits."
        ],
        stopRules: ["Hand or wrist pain \u2014 stop and switch to dry swings only.", "If timing breaks down badly, end the round, reset, restart."],
        durationMin: inSeason ? 20 : offSeason ? 45 : 35,
        route: "/practice?module=hitting",
        ctaLabel: "Open hitting",
        status: "ready",
        missing: equipmentUnknown ? ["equipment_access"] : [],
        missingContextKeys: equipmentUnknown ? ["equipment_effective"] : [],
        gamePlanTemplate: {
          title: `Hammer hitting \u2014 ${inSeason ? "in-season" : offSeason ? "off-season" : "standard"}`,
          activityType: "practice",
          icon: "target",
          color: "#8b5cf6",
          durationMinutes: inSeason ? 20 : offSeason ? 45 : 35,
          description: "Hitting block with tee, toss, and live BP work.",
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "throwing": {
      if (pos === "DH" || pos === "designated_hitter") {
        return {
          modality,
          title: "Throwing \u2014 not in your role",
          why: "Position does not require a throwing block today.",
          roadmapReason: "DH role \u2014 throwing block suppressed.",
          phase: "skill",
          steps: [],
          drills: [],
          cues: [],
          stopRules: [],
          durationMin: 0,
          route: "/practice",
          ctaLabel: "Skip",
          status: "suppressed",
          missing: [],
          missingContextKeys: [],
          gamePlanTemplate: null
        };
      }
      const sportRaw = ctx.get("sport_primary")?.value ?? null;
      const scheduleAny = proj;
      const sched = scheduleAny?.schedule ?? {};
      const armSore = !!ctx.get("daily_log")?.value?.arm_sore;
      const ageYears = ctx.get("age_years")?.value ?? null;
      const readinessScore2 = typeof readiness?.score === "number" ? readiness.score : null;
      const eassCtx = {
        sport: normalizeSport(sportRaw),
        position: normalizePosition(pos),
        seasonPhase,
        ageYears,
        trainingAgeYears: liftingAge ?? null,
        injuryRegions: [...injuryRegions],
        armSore,
        isGameDay: !!sched.isGameDay || !!pitcherOutings?.startsToday,
        // If schedule doesn't declare throwing day explicitly, treat non-game days as throwing days
        // when the athlete's development priorities include throwing/velocity, otherwise alternate.
        isThrowingDay: pitcherOutings?.startsTomorrow || pitcherOutings?.relieverAvailableSoon ? false : sched.isThrowingDay ?? !sched.isGameDay,
        isRecoveryDay: !!sched.isRecoveryDay || recoverDay || !!pitcherOutings?.pitchedYesterday,
        readinessScore: readinessScore2
      };
      const eass = buildEassPrescription(eassCtx);
      const outingReason = pitcherOutings?.pitchedYesterday ? "You pitched yesterday. Today's arm care is easy recovery work." : pitcherOutings?.startsToday ? "You start today. Save your throwing work for the outing." : pitcherOutings?.startsTomorrow ? "You start tomorrow. Today's throwing keeps you ready." : pitcherOutings?.relieverAvailableSoon ? "You're available to pitch. Keep your arm ready without a separate hard session." : "";
      const drills = mergeOwnerSlotDrills(eass.drills.map((d2) => ({
        name: d2.name,
        slug: d2.slug,
        setup: d2.setup,
        dosage: d2.dosage,
        stage: d2.stage ?? (d2.intensity === "prep" ? "prep" : "drills"),
        cue: d2.cue,
        stopIf: d2.stopIf,
        guide: guideFor(d2.slug) ?? guideFor(d2.name) ?? void 0
      })), ["hammers_today:skill"], { sport: normalizeSport(sportRaw) === "softball" ? "softball" : "baseball", owned: new Set(proj.equipmentList ?? []), skill: "throwing" });
      const thrOut = anthroSignal ? selectThrowingAdaptations(anthro) : {
        cues: [],
        supplemental: [],
        rationale: null
      };
      for (const s of thrOut.supplemental) {
        drills.push({
          name: s.name,
          dosage: s.dosage,
          cue: s.cue
        });
      }
      const anthroCues = thrOut.cues.map((c) => c.cue);
      return {
        modality,
        title: eass.title,
        why: eass.why + (outingReason ? ` ${outingReason}` : "") + (goal ? ` ${goal}` : ""),
        roadmapReason: eass.roadmapReason + (thrOut.rationale ? ` ${thrOut.rationale}` : ""),
        phase: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "recover" : eass.mode === "throwing_day_maintain" || eass.mode === "game_day_prep" ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: [...eass.cues, ...anthroCues],
        stopRules: eass.stopRules,
        durationMin: eass.durationMin,
        route: "/practice?module=throwing",
        ctaLabel: eass.mode === "arm_protected" ? "Open arm-care" : eass.mode === "recovery_day" ? "Open recovery" : "Open throwing",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer throwing \u2014 EASS (${eass.mode})`,
          activityType: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "recovery" : "practice",
          icon: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "heart" : "target",
          color: eass.mode === "arm_protected" || eass.mode === "recovery_day" ? "#f43f5e" : "#0ea5e9",
          durationMinutes: eass.durationMin,
          description: eass.why,
          checklist: drillsToChecklist(drills),
          source: `hammer.daily.throwing.eass.${eass.mode}`
        }
      };
    }
    case "defense": {
      const ownedDefense = new Set(proj.equipmentList ?? []);
      const missingGear = [
        ...!ownedDefense.has("field") && !ownedDefense.has("open_space") ? ["safe field space"] : [],
        ...!ownedDefense.has("glove") ? ["glove"] : [],
        ...!ownedDefense.has("ball") ? ["ball"] : []
      ];
      if (missingGear.length) return {
        modality,
        title: pos ? `Defense \u2014 ${pos}` : "Defense \u2014 general fundamentals",
        why: "Fielding equipment has not been confirmed.",
        roadmapReason: `Your fielding work needs ${missingGear.join(", ")}. Confirm what you have before starting.`,
        because: ["Your saved equipment list does not include everything this fielding session needs."],
        phase: "skill",
        steps: ["Confirm your fielding equipment before starting."],
        drills: [],
        cues: [],
        stopRules: ["Do not start fielding or throwing without the listed equipment and safe space."],
        durationMin: null,
        route: "#hammer-onboarding",
        ctaLabel: "Confirm my equipment",
        status: "awaiting-input",
        missing: ["equipment_access"],
        missingContextKeys: ["equipment_effective"],
        gamePlanTemplate: null
      };
      if (!pos) {
        return {
          modality,
          title: "Defense \u2014 general fundamentals",
          why: "Your fielding position has not been confirmed.",
          roadmapReason: "Choose your position before starting so your fielding work fits your role.",
          phase: "skill",
          steps: ["Confirm your fielding position before starting."],
          drills: [],
          cues: [],
          stopRules: ["Do not start fielding or throwing until your position is confirmed."],
          durationMin: null,
          route: "#hammer-onboarding",
          ctaLabel: "Set my position",
          status: "awaiting-input",
          missing: ["position_primary"],
          missingContextKeys: ["position_primary"],
          gamePlanTemplate: null
        };
      }
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const sportRaw = ctx.get("sport_primary")?.value ?? null;
      const secondaryRaw = coercePositionTokens([
        ctx.get("position_secondary")?.value,
        ctx.get("positions_secondary")?.value
      ]);
      const defenseSchedAny = proj;
      const tournamentToday = !!(defenseSchedAny?.schedule?.tournamentToday || defenseSchedAny?.schedule?.isTournamentDay);
      const defenseSport = normalizeSport(sportRaw) === "softball" ? "softball" : "baseball";
      const defenseTier = resolveDefenseTier(liftingAge, seasonPhase);
      const prescription = selectDefenseDrills({
        position: pos,
        secondaryPositions: secondaryRaw,
        sport: defenseSport,
        seasonPhase,
        injuryRegions: [...injuryRegions],
        tournamentToday,
        goal,
        tier: defenseTier
      });
      const drills = structureSkillSession(mergeOwnerSlotDrills(prescription?.drills ? [...prescription.drills] : [
        { name: "Pre-pitch + first-step reads", dosage: "20 reps", cue: "low athletic stance, weight on balls of feet" },
        { name: "Glove work \u2014 4 corners", dosage: "15 reps", cue: "field through the ball, don't stab" }
      ], ["hammers_today:defense", "defensive_library"], { sport: defenseSport, owned: ownedDefense }), { skill: "defense", sport: defenseSport, owned: ownedDefense, injuryRegions, recoveryDay: recoverDay || tournamentToday || !skillExecutionAllowed });
      const cues = prescription?.cues ?? ["Field through the ball.", "Footwork before glove."];
      const stopRules = prescription?.stopRules ?? ["Knee, ankle, or hip pain \u2014 stop and update Hammer."];
      const durationMin = prescription?.durationMin ?? (inSeason ? 15 : offSeason ? 35 : 25);
      const title = prescription?.title ?? `Defense \u2014 ${pos}`;
      const why = prescription?.why ?? (inSeason ? "Game-rep quality over volume." : offSeason ? "Footwork and range building." : "Position-specific reads, footwork, and finishes.") + (goal ? ` ${goal}` : "");
      return {
        modality,
        title,
        why,
        roadmapReason: tournamentToday ? "Tournament day \u2014 primer only, save the legs." : inSeason ? "In-season \u2014 game-rep quality." : offSeason ? "Off-season \u2014 load volume + range." : "Pre-season \u2014 sharpen reads and finishes.",
        phase: inSeason ? "sharpen" : tournamentToday ? "maintain" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues,
        stopRules,
        durationMin,
        route: "/practice?module=defense",
        ctaLabel: "Open defense",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: `Hammer defense \u2014 ${pos}`,
          activityType: "practice",
          icon: "target",
          color: "#10b981",
          durationMinutes: durationMin,
          description: `Defensive block for ${pos} (${defenseSport}).`,
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "baserunning": {
      const legBlocked = injuryRegions.includes("hamstring") || injuryRegions.includes("ankle") || injuryRegions.includes("knee") || injuryRegions.includes("groin");
      if (legBlocked) {
        const drills2 = [
          { name: "Pickoff read film", dosage: "10 min", cue: "watch the pitcher's first move" },
          { name: "Lead/secondary footwork (walk pace)", dosage: "10 reps", cue: "feet only, no max-effort sprint", stopIf: "any leg pain" }
        ];
        return {
          modality,
          title: "Baserunning \u2014 IQ only (leg-protected)",
          why: `Injury (${injuryRegions.join(", ")}) \u2014 mental reps only today.`,
          roadmapReason: "Injury supremacy \u2014 leg work suppressed.",
          phase: "recover",
          steps: drillsToSteps(drills2),
          drills: drills2,
          cues: ["Decision speed beats foot speed."],
          stopRules: ["Any leg pain \u2014 stop."],
          durationMin: 10,
          route: "/practice?module=baserunning",
          ctaLabel: "Open practice log",
          status: "ready",
          missing: [],
          missingContextKeys: [],
          gamePlanTemplate: {
            title: "Hammer baserunning \u2014 IQ only",
            activityType: "short_practice",
            icon: "brain",
            color: "#6366f1",
            durationMinutes: 10,
            description: "Pickoff reads and footwork at walk pace.",
            checklist: drillsToChecklist(drills2),
            source: "internal"
          }
        };
      }
      const inSeason = seasonPhase === "in";
      const runningSport = normalizeSport(ctx.get("sport_primary")?.value ?? null) === "softball" ? "softball" : "baseball";
      const drills = structureSkillSession(inSeason ? [
        { name: runningSport === "softball" ? "Pitch-release reads" : "Pickoff reads", dosage: "8 reps", cue: runningSport === "softball" ? "Stay on the base until the pitch is released; then read and move." : "first move = first step" },
        { name: "First-to-third / tag-up scenarios", dosage: "5 reps", executionKind: "baserunning_scenarios" }
      ] : [
        { name: runningSport === "softball" ? "Release + first-step footwork" : "Lead + secondary footwork", dosage: "10 reps", cue: runningSport === "softball" ? "Start on the base; leave only when the pitch is released." : "balanced lead, no lean" },
        { name: runningSport === "softball" ? "Pitch-release reads (with partner if possible)" : "Pickoff reads (with partner if possible)", dosage: "10 reps" },
        { name: "First-to-third / tag-up scenarios", dosage: "5 reps", executionKind: "baserunning_scenarios" }
      ], { skill: "baserunning", sport: runningSport, owned: new Set(proj.equipmentList ?? []), injuryRegions, recoveryDay: recoverDay || !skillExecutionAllowed });
      return {
        modality,
        title: inSeason ? "Baserunning \u2014 game scenarios" : "Baserunning IQ",
        why: inSeason ? "Sharpen game-decision speed." : "Decision speed beats foot speed.",
        roadmapReason: inSeason ? "In-season \u2014 decision-speed scenarios." : "Off-season \u2014 base footwork + reads.",
        phase: inSeason ? "sharpen" : "build",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Read the first move; trust it."],
        stopRules: ["Any leg pain \u2014 stop and switch to film only."],
        durationMin: inSeason ? 10 : 15,
        route: "/practice?module=baserunning",
        ctaLabel: "Open baserunning",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer baserunning",
          activityType: "short_practice",
          icon: "zap",
          color: "#14b8a6",
          durationMinutes: inSeason ? 10 : 15,
          description: "Baserunning IQ + footwork.",
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "game_iq": {
      const roleStr = ctx.get("role")?.value ?? null;
      const isPitcher3 = roleStr === "pitcher" || roleStr === "two_way";
      const isHitter = roleStr === "hitter" || roleStr === "position" || roleStr === "two_way" || roleStr === null;
      const lensHint = isPitcher3 && !isHitter ? "pitching" : isHitter && !isPitcher3 ? "offense" : "all";
      const inSeason = seasonPhase === "in";
      const drills = [
        {
          name: "Daily IQ micro-reps",
          dosage: inSeason ? "2 due scenarios (~2 min)" : "3\u20134 due scenarios (~3 min)",
          cue: "Three B's \u2014 Ball, Bag, Backup. Read the situation BEFORE the pitch.",
          stopIf: "Mental fatigue \u2014 stop after current scenario, don't grind."
        },
        {
          name: "One bonus rep on your weakest lens",
          dosage: "1 scenario",
          cue: lensHint === "pitching" ? "Pitcher PFP / hold-runner reads." : lensHint === "offense" ? "Baserunning decision / first-and-third reads." : "Whatever the system flags as weakest."
        }
      ];
      const route = `/iq/review?lens=${lensHint}`;
      return {
        modality,
        title: inSeason ? "Game IQ \u2014 daily micro-reps" : "Game IQ \u2014 situational reps",
        why: "Decision speed wins games. SM-2 spaced repetition keeps every Ball/Bag/Backup situation fresh." + (goal ? ` ${goal}` : ""),
        roadmapReason: inSeason ? "In-season \u2014 short, high-frequency reps keep the mental side sharp without adding load." : "Off-season \u2014 build deep situational library while physical load is high.",
        phase: "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: [
          "Picture the play before the pitch.",
          "Wrong answers are gold \u2014 they expose blind spots."
        ],
        stopRules: [
          "If you're guessing 3+ in a row, stop \u2014 review the situation page instead."
        ],
        durationMin: inSeason ? 3 : 5,
        route,
        ctaLabel: "Start reps",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer \u2014 Game IQ micro-reps",
          activityType: "short_practice",
          icon: "brain",
          color: "#6366f1",
          durationMinutes: inSeason ? 3 : 5,
          description: "Daily Three B's situational reps (spaced-repetition).",
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "fueling": {
      const inSeason = seasonPhase === "in";
      const offSeason = seasonPhase === "off";
      const shortHorizon = proj.goalHorizon === "short";
      const drills = inSeason ? [
        { name: "Pre-game meal", dosage: "complex carb + small protein, 90\u2013120 min before first pitch", cue: "carbs forward today" },
        { name: "Intra-game", dosage: "water + electrolytes; carb gel if game runs > 90 min" },
        { name: "Post-game", dosage: "0.4 g/kg protein + carb within 45 min" }
      ] : offSeason ? [
        { name: "Pre-session", dosage: "complex carb + protein 60\u201390 min before" },
        { name: "Intra-session", dosage: "water + electrolytes if > 60 min" },
        { name: "Post-session", dosage: "0.3 g/kg protein + carb within 60 min" },
        { name: "Daily protein target", dosage: "hit target for body-comp goal", cue: "log it in Nutrition Hub" }
      ] : [
        { name: "Pre-session", dosage: "complex carb + small protein 60\u201390 min before" },
        { name: "Intra-session", dosage: "water + electrolytes if > 60 min" },
        { name: "Post-session", dosage: "0.3 g/kg protein + carb within 60 min" }
      ];
      return {
        modality,
        title: inSeason ? "Fueling \u2014 game-day carb-forward" : offSeason ? "Fueling \u2014 body-comp aware" : "Fueling",
        why: (inSeason ? "Carb-forward during competition; recover hard between games." : offSeason ? "Use the runway: dial composition before volume drops." : "Carbs before output. Protein and fluids after.") + (shortHorizon ? " Short horizon \u2014 execution > optimization." : ""),
        roadmapReason: inSeason ? "Game-day fueling priority." : offSeason ? "Off-season \u2014 body-comp focus available." : "Standard fueling.",
        phase: "skill",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Carbs before output. Protein after."],
        stopRules: ["Cramping or lightheadedness \u2014 stop, hydrate with electrolytes."],
        durationMin: null,
        route: "/nutrition-hub",
        ctaLabel: "Open Nutrition Hub",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer fueling",
          activityType: "meal",
          icon: "apple",
          color: "#10b981",
          durationMinutes: null,
          description: "Today's fueling targets.",
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
    case "recovery": {
      const elevated = recoverDay || workloadHigh || seasonPhase === "in" || injuryRegions.length > 0;
      const drills = recoveryDrills(elevated);
      return {
        modality,
        title: recoverDay ? "Recovery \u2014 priority" : workloadHigh ? "Recovery \u2014 workload-elevated" : injuryRegions.length > 0 ? "Recovery \u2014 injury-aware" : seasonPhase === "in" ? "Recovery \u2014 in-season" : "Recovery",
        why: (() => {
          const base2 = recoverDay ? "Readiness is low. Recovery outranks training today." : workloadHigh ? "Workload is elevated \u2014 recovery is today's priority." : injuryRegions.length > 0 ? `Injury-aware recovery (${injuryRegions.join(", ")}).` : seasonPhase === "in" ? "In-season \u2014 parasympathetic downshift between games." : "Lock in sleep, mobility, and parasympathetic downshift.";
          const hpi = getSeasonHPI(seasonPhase);
          return `${base2} ${hpi.qiDirective} Breath primer: ${hpi.breathPrimer}`;
        })(),
        roadmapReason: `${recoverDay ? "Readiness below threshold \u2014 recovery first." : workloadHigh ? "Recent 7-day workload elevated." : "Default recovery block."} (${getSeasonHPI(seasonPhase).element} phase \u2014 ${getSeasonHPI(seasonPhase).yinYangEmphasis})`,
        phase: "recover",
        steps: drillsToSteps(drills),
        drills,
        cues: ["Recovery is a skill. Do it like a workout."],
        stopRules: ["Sharp pain during mobility \u2014 back off."],
        durationMin: elevated ? 25 : 15,
        route: "/bounce-back-bay",
        ctaLabel: "Open recovery",
        status: "ready",
        missing: [],
        missingContextKeys: [],
        gamePlanTemplate: {
          title: "Hammer recovery",
          activityType: "recovery",
          icon: "heart",
          color: "#f43f5e",
          durationMinutes: elevated ? 25 : 15,
          description: "Recovery block.",
          checklist: drillsToChecklist(drills),
          source: "internal"
        }
      };
    }
  }
}
var MINOR_CONCERN_AFFECTED = {
  arm_load: ["throwing"],
  speed_max: ["speed"],
  heavy_lift: ["strength"],
  jump_load: ["speed", "strength"],
  contact: ["baserunning", "defense"]
};
function applyMinorParentSupremacy(blocks, proj) {
  if (proj.isMinor !== true || proj.parentConcerns.length === 0) return blocks;
  const affected = /* @__PURE__ */ new Map();
  for (const concern of proj.parentConcerns) {
    for (const m of MINOR_CONCERN_AFFECTED[concern] ?? []) {
      const list2 = affected.get(m) ?? [];
      list2.push(concern);
      affected.set(m, list2);
    }
  }
  if (affected.size === 0) return blocks;
  return blocks.map((b) => {
    const concerns = affected.get(b.modality);
    if (!concerns) return b;
    const note = `Parent supremacy: deferred pending guardian review (concerns: ${concerns.join(", ")}).`;
    return {
      ...b,
      status: "awaiting-input",
      why: `${b.why} ${note}`,
      missing: [...b.missing, ...concerns.map((c) => `parent-concern:${c}`)]
    };
  });
}
function applyCategoryGoalOrdering(blocks, proj) {
  const goals = proj.categoryGoals;
  if (!goals) return blocks;
  const headOrder = ["warmup"];
  const tailOrder = ["fueling", "recovery"];
  const isAnchored = (m) => headOrder.includes(m) || tailOrder.includes(m);
  const annotated = blocks.map((b) => {
    const cat = modalityToCategory(b.modality);
    if (!cat) return b;
    const rank = rankFor(goals, cat);
    if (!rank) return b;
    const intentId = intentFor(goals, cat);
    const intentLabel = intentId ? CATEGORY_INTENTS[cat].find((p) => p.id === intentId)?.label ?? null : null;
    const tag = intentLabel ? `Goal #${rank} (${CATEGORY_LABELS[cat]} \u2192 ${intentLabel}).` : `Goal #${rank} (${CATEGORY_LABELS[cat]}).`;
    return {
      ...b,
      why: `${tag} ${b.why}`,
      roadmapReason: `${tag} ${b.roadmapReason}`
    };
  });
  const middle = annotated.filter((b) => !isAnchored(b.modality));
  const head = headOrder.map((m) => annotated.find((b) => b.modality === m)).filter((b) => !!b);
  const tail = tailOrder.map((m) => annotated.find((b) => b.modality === m)).filter((b) => !!b);
  middle.sort((a, b) => {
    const ca = modalityToCategory(a.modality);
    const cb = modalityToCategory(b.modality);
    const ra = ca ? rankFor(goals, ca) ?? 99 : 99;
    const rb = cb ? rankFor(goals, cb) ?? 99 : 99;
    return ra - rb;
  });
  return [...head, ...middle, ...tail];
}
function suppressBlock(b, rationale, opts) {
  if (b.status === "awaiting-input") return b;
  const keep = opts?.keepActivation === true;
  return {
    ...b,
    status: "suppressed",
    drills: keep ? b.drills.slice(0, 1) : [],
    steps: keep ? b.steps.slice(0, 1) : [],
    durationMin: keep ? Math.min(b.durationMin ?? 0, 10) : 0,
    why: `${rationale} ${b.why}`,
    roadmapReason: rationale,
    gamePlanTemplate: keep ? b.gamePlanTemplate : null
  };
}
function annotate(b, rationale) {
  return {
    ...b,
    why: `${rationale} ${b.why}`,
    roadmapReason: `${rationale} ${b.roadmapReason}`
  };
}
var PREGAME_PRIMER_FALLBACK = [
  { name: "Ready position + first-step reads", dosage: "8 reps, easy", cue: "small hop as the ball is released" },
  { name: "Short-hop glove work", dosage: "10 reps, easy", cue: "soft hands out front" },
  { name: "Glove-to-hand exchange", dosage: "10 reps", cue: "four seams, hands to the middle of your chest" }
];
function gameDayDefensePrimer(b, original, tournament) {
  const src = b.drills.length > 0 ? b : original;
  const picked = (src?.drills ?? []).slice(0, tournament ? 2 : 3);
  const drills = (picked.length > 0 ? picked : PREGAME_PRIMER_FALLBACK.slice(0, tournament ? 2 : 3)).map(
    (d2) => ({ ...d2, dosage: `${d2.dosage} \u2014 easy, pregame only` })
  );
  const baseTitle = (original?.title ?? b.title).replace(/ — .*$/, "");
  return {
    ...b,
    title: `${baseTitle} \u2014 pregame primer`,
    why: tournament ? "You're playing multiple games today. This wakes up your feet and hands and stops there \u2014 the rest is saved for the games." : "You're playing today. This wakes up your feet, hands, and exchange, then stops \u2014 full defense work is off so you save your legs for the game.",
    roadmapReason: tournament ? "Tournament day \u2014 primer only, legs saved for the games." : "Game day \u2014 primer only, legs saved for the game.",
    assumption: void 0,
    phase: "maintain",
    steps: drillsToSteps(drills),
    drills,
    cues: original?.cues ?? b.cues,
    stopRules: original?.stopRules ?? b.stopRules,
    durationMin: tournament ? 6 : 10,
    route: original?.route ?? "/practice?module=defense",
    ctaLabel: "Open defense",
    status: "ready",
    gameDayPrimer: true,
    gamePlanTemplate: null
  };
}
function blockKey(b) {
  return `${b.modality}:${b.side ?? ""}`;
}
function applyScheduleModulation(blocks, signal, originals, defenseFullOverride = false) {
  if (signal.postureToday === "normal") return blocks;
  const rationale = signal.rationale;
  switch (signal.postureToday) {
    case "game":
    case "tournament": {
      return blocks.map((b) => {
        switch (b.modality) {
          case "warmup":
            return annotate(b, rationale);
          case "fueling":
          case "recovery":
            return annotate(b, rationale);
          case "throwing":
          case "hitting":
            return signal.postureToday === "tournament" ? suppressBlock(b, rationale) : suppressBlock(b, rationale, { keepActivation: true });
          case "defense": {
            if (b.status === "awaiting-input") return b;
            const original = originals?.get(blockKey(b));
            if (defenseFullOverride) {
              return annotate(
                original && original.drills.length > 0 ? original : b,
                "You chose to run full defense anyway on a game day."
              );
            }
            return gameDayDefensePrimer(b, original, signal.postureToday === "tournament");
          }
          case "speed":
          case "strength":
          case "baserunning":
            return suppressBlock(b, rationale);
          default:
            return b;
        }
      });
    }
    case "camp": {
      return blocks.map(
        (b) => b.modality === "warmup" || b.modality === "fueling" || b.modality === "recovery" ? annotate(b, rationale) : suppressBlock(b, rationale)
      );
    }
    case "travel": {
      return blocks.map((b) => {
        if (b.modality === "warmup" || b.modality === "fueling" || b.modality === "recovery") {
          return annotate(b, rationale);
        }
        if (b.modality === "speed" || b.modality === "strength") {
          return suppressBlock(b, rationale);
        }
        return suppressBlock(b, rationale, { keepActivation: true });
      });
    }
    case "team_practice": {
      return blocks.map((b) => {
        if (b.modality === "hitting" || b.modality === "throwing" || b.modality === "defense" || b.modality === "baserunning") {
          return suppressBlock(b, rationale, { keepActivation: true });
        }
        if (b.modality === "strength") {
          return suppressBlock(b, rationale);
        }
        return annotate(b, rationale);
      });
    }
    case "taper": {
      return blocks.map((b) => {
        if (b.modality === "strength") {
          return suppressBlock(b, rationale, { keepActivation: true });
        }
        if (b.modality === "speed") {
          return annotate(
            { ...b, durationMin: Math.min(b.durationMin ?? 0, 15) },
            rationale
          );
        }
        return annotate(b, rationale);
      });
    }
    default:
      return blocks;
  }
}
function applySideBias(blocks, bias) {
  if (!bias) return blocks;
  return blocks.map((b) => {
    const r = b.modality === "hitting" ? bias.hit : b.modality === "throwing" ? bias.throw : null;
    if (!r || b.status === "suppressed") return b;
    const extraStep = `Extra activation set on your ${r.weakerSide === "L" ? "Left" : "Right"} side \u2014 close the L/R asymmetry first.`;
    return {
      ...b,
      steps: [...b.steps, extraStep],
      cues: [...b.cues, r.note]
    };
  });
}
var GAME_PATTERN_DRILL = {
  chase: { name: "Two-Ball Recognition", dosage: "3 x 10", cue: "See it early, decide once", equipment: ["net"] }
};
function applyGpSignalBias(blocks, gp, ownedEquipment = /* @__PURE__ */ new Set()) {
  if (!gp) return { blocks, tags: [] };
  const enoughHittingSignal = gp.atBats >= 6 || gp.pitchesSeen >= 20;
  const enoughDefenseSignal = gp.defensivePlays >= 6;
  const tags = [];
  const biased = /* @__PURE__ */ new Set();
  const annotated = blocks.map((b) => {
    if (b.status === "suppressed") return b;
    const extraCues = [];
    const because = [];
    const hitRead = gp.atBats < 20 ? " (early read)" : "";
    const defRead = gp.defensivePlays < 15 ? " (early read)" : "";
    if (b.modality === "game_iq" && enoughHittingSignal && gp.chasePct !== null && gp.chasePct >= 32) {
      extraCues.push(`Last 7d chase ${gp.chasePct}% \u2014 bias pitch-recognition reps today.`);
      because.push(`Because in your last 7 days of games you chased ${gp.chasePct}% of pitches out of the zone over ${gp.atBats} at-bats${hitRead}.`);
      biased.add("game_iq");
      tags.push(`gp:chase:${gp.chasePct}`);
    }
    if (b.modality === "hitting" && enoughHittingSignal && gp.whiffPct !== null && gp.whiffPct >= 28) {
      extraCues.push(`Last 7d whiff ${gp.whiffPct}% on swings \u2014 bat-path / contact emphasis.`);
      because.push(`Because in your last 7 days of games you missed on ${gp.whiffPct}% of your swings over ${gp.atBats} at-bats${hitRead}.`);
      biased.add("hitting");
      tags.push(`gp:whiff:${gp.whiffPct}`);
    }
    if (b.modality === "defense" && enoughDefenseSignal && gp.miscueClusters.length > 0) {
      const lead = gp.miscueClusters[0];
      extraCues.push(`${lead.errors} errors at ${lead.position} in last 7d \u2014 first-step / glove-side reps.`);
      because.push(`Because you made ${lead.errors} errors at ${lead.position} in your last 7 days of games (${gp.defensivePlays} plays)${defRead}.`);
      biased.add("defense");
      tags.push(`gp:def:${lead.position}`);
    }
    let drills = b.drills;
    if (b.modality === "hitting" && b.status === "ready" && enoughHittingSignal && gp.chasePct !== null && gp.chasePct >= 32) {
      const pick = GAME_PATTERN_DRILL.chase;
      const hasGear = pick.equipment.every((e) => ownedEquipment.has(e));
      const idx = drills.findIndex((d2) => d2.prescriptionOrigin !== "owner" && (d2.stage === void 0 || d2.stage === "drills"));
      if (hasGear && idx >= 0 && !drills.some((d2) => d2.name === pick.name)) {
        drills = drills.map((d2, i) => i === idx ? { name: pick.name, dosage: pick.dosage, cue: pick.cue, equipmentNote: pick.equipment.join(", "), stage: "drills" } : d2);
        because.push(`Because in your last 7 days of games you chased ${gp.chasePct}% of pitches out of the zone over ${gp.atBats} at-bats${hitRead}. "${pick.name}" works on it today.`);
        biased.add("hitting");
        tags.push(`gp:chase_drill:${gp.chasePct}`);
      }
    }
    if (extraCues.length === 0 && drills === b.drills) return b;
    return { ...b, drills, cues: [...b.cues, ...extraCues], because: [...b.because ?? [], ...because] };
  });
  if (biased.size === 0) return { blocks: annotated, tags };
  const ready = annotated.filter((b) => b.status !== "suppressed");
  const suppressed = annotated.filter((b) => b.status === "suppressed");
  const biasedReady = ready.filter((b) => biased.has(b.modality));
  const otherReady = ready.filter((b) => !biased.has(b.modality));
  return { blocks: [...biasedReady, ...otherReady, ...suppressed], tags };
}
function splitLateralityBlocks(blocks, ctx, identityOverride) {
  const bats = ctx.get("bats_hand")?.value ?? null;
  const throws = ctx.get("throws_hand")?.value ?? null;
  const isSwitchHitter = identityOverride?.isSwitchHitter ?? bats === "S";
  const isAmbi = identityOverride?.isAmbidextrousThrower ?? throws === "S";
  if (!isSwitchHitter && !isAmbi) return blocks;
  const NON_DOM_KEEP = /(band|prep|scap|cuff|warm|activation|neural|catch-play|light)/i;
  const cloneSide = (b, side, sideLabel, opts) => {
    const filter = opts?.drillsFilter ?? (() => true);
    const scale = opts?.dosageScale ?? 1;
    const scaleDosage2 = (dosage) => {
      if (scale === 1) return dosage;
      return dosage.replace(/\b(\d+)\b/, (_m, n) => {
        const scaled = Math.max(1, Math.round(parseInt(n, 10) * scale));
        return `${scaled}`;
      });
    };
    const drills = b.drills.filter(filter).map(
      (d2) => scale === 1 ? d2 : { ...d2, dosage: scaleDosage2(d2.dosage) }
    );
    return {
      ...b,
      side,
      title: `${b.title} \u2014 ${sideLabel}`,
      drills,
      steps: drillsToSteps(drills),
      cues: opts?.extraCue ? [opts.extraCue, ...b.cues] : b.cues,
      gamePlanTemplate: b.gamePlanTemplate ? {
        ...b.gamePlanTemplate,
        title: `${b.gamePlanTemplate.title} \u2014 ${sideLabel}`,
        checklist: drillsToChecklist(drills),
        source: `${b.gamePlanTemplate.source}.${side.toLowerCase()}`
      } : null
    };
  };
  const out = [];
  for (const b of blocks) {
    if (b.status === "suppressed") {
      out.push(b);
      continue;
    }
    if (isSwitchHitter && b.modality === "hitting") {
      out.push(
        cloneSide(b, "L", "Left-handed", {
          extraCue: "Switch hitter \u2014 left-handed reps. Full volume; treat this side like your only side today."
        }),
        cloneSide(b, "R", "Right-handed", {
          extraCue: "Switch hitter \u2014 right-handed reps. Full volume; treat this side like your only side today."
        })
      );
      continue;
    }
    if (isAmbi && b.modality === "throwing") {
      out.push(
        cloneSide(b, "R", "Dominant arm", {
          extraCue: "Ambidextrous thrower \u2014 dominant-arm workload. Full EASS envelope."
        }),
        cloneSide(b, "L", "Non-dominant arm", {
          drillsFilter: (d2) => NON_DOM_KEEP.test(d2.name),
          dosageScale: 0.5,
          extraCue: "Ambidextrous thrower \u2014 non-dominant arm keeps neural prep + light catch only. Never chase distance or intent here."
        })
      );
      continue;
    }
    out.push(b);
  }
  return out;
}
function applyWeeklyMicrocycle(blocks, resolved) {
  return blocks.map((b) => {
    const decision = resolved.perModality[b.modality];
    if (!decision) return b;
    if (b.status === "awaiting-input" || b.status === "suppressed") {
      return {
        ...b,
        roadmapReason: `${b.roadmapReason} \xB7 ${decision.microcycleLabel}`
      };
    }
    if (!decision.scheduled && SCHEDULABLE_MODALITIES.includes(b.modality)) {
      const nextLine = decision.nextScheduledLabel !== null ? `Returns ${decision.nextScheduledLabel}.` : "Not scheduled again this week.";
      return {
        ...b,
        status: "off-day",
        title: `${labelForModality(b.modality)} \u2014 off today \xB7 ${nextLine}`,
        why: `${decision.reason} Today's slot is intentionally empty so the next session hits fresh.`,
        roadmapReason: decision.reason,
        phase: "recover",
        // Keep at most one low-cost primer (mobility / film / breath).
        drills: [],
        steps: [
          decision.nextScheduledLabel ? `Optional 5-min mobility or film study \u2014 full ${b.modality} returns ${decision.nextScheduledLabel}.` : "Optional 5-min mobility or film study."
        ],
        cues: [],
        stopRules: [],
        durationMin: 0,
        gamePlanTemplate: null
      };
    }
    const scale = decision.intensity === "activation" ? 0.3 : decision.intensity === "secondary" ? 0.6 : 1;
    const scaledDrills = scale === 1 ? b.drills : b.drills.map((d2) => ({ ...d2, dosage: scaleDosageLabel2(d2.dosage, scale) }));
    const scaledDuration = scale === 1 || b.durationMin === null ? b.durationMin : Math.max(10, Math.round(b.durationMin * scale));
    return {
      ...b,
      drills: scaledDrills,
      steps: scale === 1 ? b.steps : drillsToSteps(scaledDrills),
      durationMin: scaledDuration,
      roadmapReason: `${decision.microcycleLabel} \xB7 ${b.roadmapReason}`
    };
  });
}
function labelForModality(m) {
  switch (m) {
    case "warmup":
      return "Warm-up";
    case "speed":
      return "Speed";
    case "strength":
      return "Strength";
    case "hitting":
      return "Hitting";
    case "throwing":
      return "Throwing";
    case "defense":
      return "Defense";
    case "baserunning":
      return "Baserunning";
    case "game_iq":
      return "Game IQ";
    case "fueling":
      return "Fueling";
    case "recovery":
      return "Recovery";
  }
}
function applyDefenseAlwaysVisible(blocks, originals, defenseFullOverride) {
  return blocks.map((b) => {
    if (b.modality !== "defense") return b;
    if (b.status === "awaiting-input") return b;
    if (b.gameDayPrimer) return b;
    const original = originals.get(blockKey(b));
    const restingToday = b.status === "off-day" || b.status === "suppressed" || b.drills.length === 0;
    if (!restingToday) return b;
    if (defenseFullOverride) {
      const src = original && original.drills.length > 0 ? original : b;
      const drills = src.drills.slice(0, 3).map((d2) => ({
        ...d2,
        dosage: `${d2.dosage} \u2014 light, your call`
      }));
      return {
        ...b,
        status: "ready",
        title: "Defense \u2014 light block (your call)",
        why: "You asked for defense on a day it was scheduled off. This is kept short and light so it does not cost you tomorrow.",
        roadmapReason: "Athlete override \u2014 light defense on a rest day.",
        phase: "maintain",
        drills,
        steps: drillsToSteps(drills),
        durationMin: 10,
        assumption: void 0,
        route: "/practice?module=defense",
        ctaLabel: "Open defense",
        offDayOverridable: true,
        gamePlanTemplate: null
      };
    }
    return {
      ...b,
      status: "off-day",
      title: b.title.includes("off today") ? b.title : "Defense \u2014 off today",
      why: b.status === "suppressed" && b.why ? b.why : "Defense is off today on purpose so your legs, hands, and arm come back fresh for the next session.",
      steps: b.steps.length > 0 ? b.steps : ["Optional: 5 minutes of glove work or film study if you want to touch it."],
      offDayOverridable: true
    };
  });
}
function ensureRenderable(blocks) {
  return blocks.map((b) => {
    if (b.status === "awaiting-input") return b;
    const hasBody = b.drills.length > 0 || b.steps.length > 0;
    if (hasBody && b.title.trim() !== "" && b.why.trim() !== "") return b;
    const label2 = labelForModality(b.modality);
    return {
      ...b,
      title: b.title.trim() === "" ? `${label2} \u2014 nothing scheduled today` : b.title,
      why: b.why.trim() === "" ? `${label2} is not scheduled today. Hammer will bring it back when it fits the week.` : b.why,
      steps: hasBody ? b.steps : [`${label2} is off today \u2014 nothing to do here. Ask Hammer if you want work anyway.`]
    };
  });
}
function scaleDosageLabel2(dosage, scale) {
  const m = /^(\d+)\s*(?:x|×)\s*(\d+)/i.exec(dosage);
  if (!m) return dosage;
  const sets = Math.max(1, Math.round(parseInt(m[1], 10) * scale));
  return dosage.replace(/^(\d+)/, String(sets));
}
function buildHammerDailyPlan(ctx, scheduleSignal = NORMAL_SIGNAL, sideBias = null, gpSignal = null, identityOverride, today = /* @__PURE__ */ new Date(), roadmapInputs = {}) {
  const proj = projectEnvelope(ctx);
  const focusProjection = { ...proj, categoryGoals: masteryGoalWeights(proj.categoryGoals, roadmapInputs.masteryFocus) };
  const speed = selectSpeedFocus(proj);
  const rung = resolveRoadmapRung(proj);
  const quarter = resolveSeasonQuarter(
    proj,
    {
      phaseStartedAt: roadmapInputs.phaseStartedAt ?? null,
      resolvedPhase: roadmapInputs.resolvedSeasonPhase ?? null,
      phaseSource: roadmapInputs.seasonPhaseSource ?? null
    },
    today
  );
  const sportRaw = ctx.get("sport_primary")?.value ?? null;
  const positionRaw = ctx.get("position_primary")?.value ?? ctx.get("position")?.value ?? null;
  const eliteTarget = resolveEliteTarget(sportRaw);
  const throwingLadder = prescribeThrowingLadder(rung.descriptor.rung, quarter, positionRaw);
  const skillTargets = SKILL_MODALITIES.reduce((acc, m) => {
    acc[m] = resolveSkillDaysTarget(
      rung.descriptor.rung,
      m,
      positionRaw,
      proj.injuryRegions,
      proj.lifecycleBand,
      proj.liftingAgeYears
    );
    return acc;
  }, {});
  const earnedDaysByModality = countEarnedSkillDays(roadmapInputs.recentCompletions ?? [], today);
  const rungIdx = RUNG_ORDER.indexOf(rung.descriptor.rung);
  const nextRung = rungIdx >= 0 && rungIdx < RUNG_ORDER.length - 1 ? RUNG_ORDER[rungIdx + 1] : null;
  const skillLadder = projectSkillLadder(
    rung.descriptor.rung,
    nextRung,
    proj,
    positionRaw,
    earnedDaysByModality
  );
  const positionOverrideArg = roadmapInputs.positionOverride ?? null;
  const firstPass = ALL_MODALITIES.map(
    (m) => builder({ modality: m, ctx, proj, speed, positionOverride: positionOverrideArg, pitcherOutings: roadmapInputs.pitcherOutings, skillExecutionAllowed: scheduleSignal.postureToday === "normal" })
  );
  const goalAccess = roadmapInputs.subscriptionModules === void 0 ? null : priorityAccess(roadmapInputs.subscriptionModules, normalizeSport(sportRaw) === "softball" ? "softball" : "baseball");
  const goalEligible = (modality) => !goalAccess || (modality === "hitting" ? goalAccess.hasHitting : modality === "throwing" ? goalAccess.hasThrowing || goalAccess.hasPitching : modality === "defense" || modality === "baserunning" ? goalAccess.hasThrowing : true);
  const goalWeek = weeklyGoalBlocks(
    resolveWeeklyTemplate(proj),
    skillTargets,
    focusProjection,
    positionRaw,
    new Set(firstPass.filter((b) => b.status === "ready" && goalEligible(b.modality)).map((b) => b.modality))
  );
  const weeklyTemplate = goalWeek.template;
  const microcycle = applyMicrocycle(weeklyTemplate, today, goalWeek.targets);
  const weeklyRoadmap = projectWeeklyRoadmap(weeklyTemplate, today, goalWeek.targets);
  const activeToday = new Set(
    firstPass.filter((b) => b.status === "ready" || b.status === "awaiting-input").map((b) => b.modality)
  );
  const derivedBias = activeToday.has("speed") ? "speed" : activeToday.has("strength") ? "lift" : activeToday.has("throwing") ? "throwing" : activeToday.has("hitting") ? "hitting" : null;
  const rawBlocks = derivedBias === null ? firstPass : firstPass.map(
    (b) => b.modality === "warmup" ? builder({ modality: "warmup", ctx, proj, speed, positionOverride: positionOverrideArg, modalityBiasOverride: derivedBias }) : b
  );
  const lateralized = splitLateralityBlocks(rawBlocks, ctx, identityOverride);
  const guarded = applyMinorParentSupremacy(lateralized, proj);
  const ordered = applyCategoryGoalOrdering(guarded, proj);
  const cycled = applyWeeklyMicrocycle(ordered, microcycle);
  const recovered = applyRecoveryWindows(
    cycled,
    rung.descriptor.rung,
    quarter,
    roadmapInputs.recentCompletions ?? [],
    today
  );
  const withThrowingLadder = recovered.map((b) => {
    if (b.modality !== "throwing") return b;
    if (b.status !== "ready") return b;
    return {
      ...b,
      steps: [throwingLadder.headline, ...b.steps],
      roadmapReason: `${throwingLadder.rationale} \xB7 ${b.roadmapReason}`
    };
  });
  const preModulationOriginals = new Map(rawBlocks.map((b) => [blockKey(b), b]));
  const modulated = applyScheduleModulation(
    withThrowingLadder,
    scheduleSignal,
    preModulationOriginals,
    roadmapInputs.defenseFullOverride === true
  );
  const sided = applySideBias(modulated, sideBias);
  const { blocks: biasedBlocks, tags: gpBiasTags } = applyGpSignalBias(
    sided,
    gpSignal,
    new Set(proj.equipmentList ?? [])
  );
  const practiceLoad = categoryPracticeLoads(roadmapInputs.practiceRecords ?? [], today.toLocaleDateString("en-CA"), sportRaw ?? "");
  const practiced = applyPracticePlanContext(ensureRenderable(
    applyDefenseAlwaysVisible(
      biasedBlocks,
      preModulationOriginals,
      roadmapInputs.defenseFullOverride === true
    )
  ), practiceLoad);
  const goalOrdered = secondGoalFirst(practiced.map((b) => {
    if (!goalWeek.reason || (goalWeek.modality ? b.modality !== goalWeek.modality : modalityToCategory(b.modality) !== focusProjection.categoryGoals?.goals.find((g) => g.rank === 1)?.category)) return b;
    const reason = scheduleSignal.postureToday !== "normal" || b.status !== "ready" ? `${goalWeek.reason} Today's safety and schedule rules still decide whether you train.` : goalWeek.reason;
    return { ...b, because: [...b.because ?? [], reason] };
  }), focusProjection);
  const fullRestDay = roadmapInputs.fullRestDay === true || scheduleSignal.postureToday === "normal" && weeklyRoadmap.find((day) => day.isToday)?.restDay === true;
  const bunting = roadmapInputs.bunting;
  const masteryOrdered = applyMasteryFocus(goalOrdered, roadmapInputs.masteryFocus);
  const bunted = bunting ? applyBuntingPlan(masteryOrdered, {
    sport: normalizeSport(sportRaw) === "softball" ? "softball" : "baseball",
    modules: roadmapInputs.subscriptionModules ?? [],
    bats: identityOverride?.isSwitchHitter ? "S" : ["R", "L", "S"].includes(String(ctx.get("bats_hand")?.value)) ? ctx.get("bats_hand")?.value : null,
    ...bunting.traits,
    battingGames: bunting.evidence.battingGames,
    battingWindow: bunting.evidence.battingWindow,
    outcomes: bunting.evidence.outcomes,
    legalWeekdays: weeklyRoadmap.filter((d2) => !d2.restDay && d2.modalities.some((m) => m.key === "hitting" && m.intensity !== "activation")).map((d2) => d2.dow),
    restDay: fullRestDay,
    gameDay: scheduleSignal.postureToday !== "normal"
  }, {
    weekday: today.getDay(),
    weekIndex: Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7) / 6048e5),
    owned: proj.equipmentList,
    age: bunting.age,
    phase: bunting.phase,
    catalog: bunting.catalog,
    userId: bunting.userId
  }) : masteryOrdered;
  const blocks = fullRestDay ? bunted.map((b) => {
    if (["fueling", "game_iq"].includes(b.modality)) return b;
    const drills = ["warmup", "recovery"].includes(b.modality) ? b.drills.filter((d2) => isSoftRecovery(d2.slug)) : [];
    return {
      ...b,
      drills,
      steps: drills.length ? drillsToSteps(drills) : ["Rest today. No physical training is scheduled."],
      status: b.status === "awaiting-input" ? "awaiting-input" : drills.length ? "ready" : "off-day",
      offDayOverridable: false,
      gamePlanTemplate: null,
      why: "Rest today \u2014 gentle recovery only. Save real training for your next training day.",
      roadmapReason: "Full rest day \u2014 soft recovery only.",
      durationMin: drills.length ? b.durationMin : null
    };
  }) : bunted;
  if (proj.categoryGoals && typeof console !== "undefined" && false) {
    console.debug("[dailyPlan] ordered by ranked goals \u2192", summarizeGoals(proj.categoryGoals));
  }
  if (scheduleSignal.postureToday !== "normal" && typeof console !== "undefined" && false) {
    console.debug(
      `[dailyPlan] schedule posture=${scheduleSignal.postureToday} \u2014 ${scheduleSignal.rationale}`
    );
  }
  if (typeof console !== "undefined" && false) {
    console.debug(
      `[dailyPlan] microcycle=${weeklyTemplate.id} \xB7 rung=${rung.descriptor.rung} \xB7 ${quarter.label}`
    );
  }
  if (gpBiasTags.length > 0 && typeof console !== "undefined" && false) {
    console.debug("[dailyPlan] gp-signal bias \u2192", gpBiasTags);
  }
  return {
    blocks: enforceSkillStageOrder(blocks),
    practiceLoad,
    seasonPhase: proj.seasonPhase,
    missingnessCount: blocks.filter((b) => b.status === "awaiting-input").length,
    speedFocus: speed,
    schedulePosture: scheduleSignal.postureToday,
    scheduleSignal,
    sideBias,
    gpBiasTags,
    microcycle,
    weeklyRoadmap,
    weeklyTemplate,
    roadmap: {
      rung: rung.descriptor,
      rungRationale: rung.rationale,
      quarter,
      eliteTarget,
      throwingLadder,
      skillLadder
    }
  };
}
function countEarnedSkillDays(recent, today) {
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1e3);
  const buckets = {
    hitting: /* @__PURE__ */ new Set(),
    throwing: /* @__PURE__ */ new Set(),
    defense: /* @__PURE__ */ new Set(),
    baserunning: /* @__PURE__ */ new Set()
  };
  for (const c of recent) {
    if (c.at < sevenDaysAgo || c.at > today) continue;
    const dayKey = c.at.toISOString().slice(0, 10);
    if (c.modality === "bat_speed_max") buckets.hitting.add(dayKey);
    else if (c.modality === "throwing_max") buckets.throwing.add(dayKey);
  }
  return {
    hitting: buckets.hitting.size,
    throwing: buckets.throwing.size,
    defense: 0,
    baserunning: 0
  };
}

// src/lib/hammer/context/contextProjection.ts
function normalizeConfidence(raw) {
  if (!raw) return "missing";
  switch (raw) {
    case "high":
    case "corroborated":
    case "derived":
      return "high";
    case "self_report":
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "missing":
    default:
      return raw === "missing" ? "missing" : "low";
  }
}
function fromEnvelope(envelope, key2, label2, domain) {
  const e = envelope?.[key2];
  const value = e?.value ?? null;
  const missing2 = e?.missing ?? (value === null || value === void 0);
  return {
    key: key2,
    label: label2,
    domain,
    value: missing2 ? null : value,
    source: e?.source ?? `envelope.${key2}`,
    confidence: normalizeConfidence(e?.confidence),
    missing: missing2,
    lastUpdated: e?.last_updated ?? null,
    lineage: {
      owner: e?.owner ?? "unknown",
      source: e?.source ?? `envelope.${key2}`,
      rawConfidence: e?.confidence ?? "missing"
    }
  };
}
function spineVariables(env) {
  return [
    fromEnvelope(env, "sport_primary", "Sport", "identity"),
    fromEnvelope(env, "goal_summary", "Primary goal", "goals"),
    fromEnvelope(env, "goal_horizon", "Goal horizon", "goals"),
    fromEnvelope(env, "category_goals", "Ranked category goals", "goals"),
    fromEnvelope(env, "weekly_availability_days", "Days per week", "schedule"),
    fromEnvelope(env, "weekly_availability_hours", "Hours per week", "schedule"),
    fromEnvelope(env, "typical_session_length_min", "Session length (min)", "schedule"),
    fromEnvelope(env, "training_focus", "Training focus", "goals"),
    fromEnvelope(env, "development_priorities", "Development priorities", "development"),
    fromEnvelope(env, "lifting_age_years", "Lifting age", "development"),
    fromEnvelope(env, "years_in_sport", "Years in sport", "development"),
    fromEnvelope(env, "school_grade", "School year", "identity"),
    fromEnvelope(env, "season_phase", "Season phase", "season"),
    fromEnvelope(env, "injury_history", "Injury constraints", "injury"),
    fromEnvelope(env, "equipment_effective", "Equipment (effective)", "equipment"),
    fromEnvelope(env, "lifecycle_band", "Lifecycle band", "lifecycle"),
    fromEnvelope(env, "safeguarding_minor", "Safeguarding (minor)", "identity"),
    fromEnvelope(env, "anthropometrics", "Anthropometrics", "physiology"),
    fromEnvelope(env, "position_primary", "Primary position", "identity"),
    fromEnvelope(env, "position_secondary", "Secondary positions", "identity"),
    fromEnvelope(env, "throws_hand", "Throws hand", "identity"),
    fromEnvelope(env, "bats_hand", "Bats side", "identity"),
    fromEnvelope(env, "competition_level", "Competition level", "identity"),
    fromEnvelope(env, "competition_age_group", "Age group", "identity"),
    fromEnvelope(env, "competition_home_state", "Home state", "identity"),
    fromEnvelope(env, "competition_play_state", "Play state", "identity"),
    fromEnvelope(env, "competition_events", "Notable events", "identity"),
    fromEnvelope(env, "education_stage", "Education stage", "identity"),
    fromEnvelope(env, "other_sports", "Other sports", "identity"),
    fromEnvelope(env, "lifting_history", "Lifting history", "development")
  ];
}
function contextFromEnvelope(env, extra = []) {
  const vars = [...spineVariables(env), ...extra];
  const missing2 = vars.filter((v) => v.missing);
  return {
    variables: vars,
    missing: missing2,
    missingCount: missing2.length,
    isLoading: false,
    envelope: env,
    get(key2) {
      return vars.find((v) => v.key === key2);
    }
  };
}

// supabase/functions/_shared/wic/masteryIdentity.ts
function areaWindowPolicy(settings, area) {
  const inherited = settings ? { initialSize: settings.initial_window, transitionAt: settings.transition_at, laterSize: settings.later_window } : OWNER_WINDOW_POLICY;
  if (!settings || area === "batting") return inherited;
  const values = [settings[`${area}_initial_window`], settings[`${area}_transition_at`], settings[`${area}_later_window`]];
  if (values.every((v) => v == null)) return inherited;
  const [initialSize, transitionAt, laterSize] = values;
  if (initialSize == null || transitionAt == null || laterSize == null) throw new Error("Incomplete area window policy");
  const policy = { initialSize, transitionAt, laterSize };
  if (!validWindowPolicy(policy)) throw new Error("Invalid area window policy");
  return policy;
}
var OWNER_WINDOW_POLICY = { initialSize: 100, transitionAt: 500, laterSize: 500 };
function validWindowPolicy(p) {
  return [p.initialSize, p.transitionAt, p.laterSize].every((n) => Number.isSafeInteger(n) && n > 0) && p.transitionAt % p.initialSize === 0;
}
function opportunityWindows(count, p = OWNER_WINDOW_POLICY) {
  if (!Number.isSafeInteger(count) || count < 0 || !validWindowPolicy(p)) throw new Error("Invalid opportunity window");
  const windows = [];
  let start = 1;
  while (start <= count) {
    const size = start <= p.transitionAt ? p.initialSize : p.laterSize;
    const end = start + size - 1;
    windows.push({ start, end, size, sample: Math.min(size, count - start + 1), complete: end <= count });
    start = end + 1;
  }
  return windows;
}
var HITS = /* @__PURE__ */ new Set(["1B", "2B", "3B", "HR", "single", "double", "triple", "home_run"]);
var OUTS = /* @__PURE__ */ new Set(["K", "SO", "K_swinging", "K_looking", "strikeout", "GO", "FO", "LO", "PO", "FC", "ROE", "E", "groundout", "flyout", "lineout", "popout", "out", "fielders_choice", "error"]);
var NON_AB = /* @__PURE__ */ new Set(["BB", "IBB", "walk", "HBP", "hbp", "SF", "sac_fly", "SAC", "sac_bunt", "CI", "catchers_interference"]);
function battingIdentity(events, p = OWNER_WINDOW_POLICY) {
  const unique = /* @__PURE__ */ new Map();
  let invalid = false;
  for (const e of events) {
    const old = unique.get(e.id);
    if (!e.id || !e.source || !Number.isFinite(Date.parse(e.date)) || !Number.isFinite(e.order) || old && JSON.stringify(old) !== JSON.stringify(e)) {
      invalid = true;
      continue;
    }
    unique.set(e.id, e);
  }
  const ordered = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.id.localeCompare(b.id));
  if (ordered.some((e) => !HITS.has(e.result ?? "") && !OUTS.has(e.result ?? "") && !NON_AB.has(e.result ?? ""))) invalid = true;
  const abs = ordered.filter((e) => HITS.has(e.result ?? "") || OUTS.has(e.result ?? ""));
  const windows = opportunityWindows(abs.length, p);
  const completed = invalid ? [] : windows.filter((w) => w.complete).map((w) => {
    const rows2 = abs.slice(w.start - 1, w.end);
    const previous = w.start > 1 ? abs[w.start - 2] : null;
    const firstIndex = previous ? ordered.indexOf(previous) + 1 : 0;
    const lastRow = rows2[rows2.length - 1];
    const pas = ordered.slice(firstIndex, lastRow ? ordered.indexOf(lastRow) + 1 : firstIndex);
    return {
      start: w.start,
      end: w.end,
      hits: rows2.filter((e) => HITS.has(e.result ?? "")).length,
      atBats: rows2.length,
      plateAppearances: pas.length,
      paIds: pas.map((e) => e.id),
      pitchCounts: Object.fromEntries(pas.map((e) => [e.id, e.pitchCount ?? null])),
      homeRuns: rows2.filter((e) => e.result === "HR" || e.result === "home_run").length,
      strikeouts: rows2.filter((e) => ["K", "SO", "K_swinging", "K_looking", "strikeout"].includes(e.result ?? "")).length,
      ballsInPlay: rows2.filter((e) => !["HR", "home_run", "K", "SO", "K_swinging", "K_looking", "strikeout"].includes(e.result ?? "")).length,
      sourceIds: pas.map((e) => e.id),
      from: rows2[0]?.date ?? "",
      through: lastRow?.date ?? ""
    };
  });
  const latest = completed[completed.length - 1] ?? null;
  const last = windows[windows.length - 1];
  const current = last && !last.complete ? last : { start: abs.length + 1, end: abs.length + (abs.length < p.transitionAt ? p.initialSize : p.laterSize), size: abs.length < p.transitionAt ? p.initialSize : p.laterSize, sample: 0, complete: false };
  return { status: latest ? "Measured" : "Need more data", completeHistory: !invalid, latest, completed, current, totalAtBats: abs.length, average: latest ? latest.hits / latest.atBats : null };
}
function fieldingIdentity(events, p = OWNER_WINDOW_POLICY) {
  const unique = /* @__PURE__ */ new Map();
  let invalid = false;
  let unclassified = 0;
  for (const e of events) {
    const old = unique.get(e.id);
    if (!e.id || !e.source || !Number.isFinite(Date.parse(e.date)) || !Number.isFinite(e.order) || old && JSON.stringify(old) !== JSON.stringify(e)) {
      invalid = true;
      unclassified++;
      continue;
    }
    unique.set(e.id, e);
  }
  const ordered = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.id.localeCompare(b.id));
  const chances = ordered.filter((e) => {
    const scored = e.error === true || e.assist === true || e.putout === true;
    if (!scored || e.error === null) {
      invalid = true;
      unclassified++;
      return false;
    }
    return true;
  });
  const windows = opportunityWindows(chances.length, p);
  const completed = invalid ? [] : windows.filter((w) => w.complete).map((w) => {
    const rows2 = chances.slice(w.start - 1, w.end);
    const errors = rows2.filter((e) => e.error === true).length;
    return { ...w, chances: rows2.length, errors, successful: rows2.length - errors, rate: (rows2.length - errors) / rows2.length, sourceIds: rows2.map((e) => e.id), from: rows2[0]?.date ?? "", through: rows2[rows2.length - 1]?.date ?? "" };
  });
  const latest = completed[completed.length - 1] ?? null;
  const last = windows[windows.length - 1];
  const size = chances.length < p.transitionAt ? p.initialSize : p.laterSize;
  const current = last && !last.complete ? last : { start: chances.length + 1, end: chances.length + size, size, sample: 0, complete: false };
  return { status: latest ? "Measured" : "Need more data", completeHistory: !invalid, latest, completed, current, totalChances: chances.length, unclassified };
}
function speedIdentity(evidence, eliteGrade = 65) {
  const valid = evidence.filter((e) => e.kind === "measured" && e.id && e.source && Number.isFinite(Date.parse(e.date)) && Number.isFinite(e.value) && e.value > 0 && e.minimum !== null && e.minimum > 0 && e.sample >= e.minimum);
  const usable = valid.filter((e) => typeof e.grade === "number" && Number.isFinite(e.grade) && e.grade >= 0 && e.grade <= 80 && (e.grade < 20 || e.grade % 5 === 0));
  const ambiguous = /* @__PURE__ */ new Set();
  const unique = /* @__PURE__ */ new Map();
  for (const e of usable) {
    const old = unique.get(e.id);
    if (old && JSON.stringify(old) !== JSON.stringify(e)) ambiguous.add(e.id);
    else unique.set(e.id, e);
  }
  const rows2 = [...unique.values()].filter((e) => !ambiguous.has(e.id));
  const latest = /* @__PURE__ */ new Map();
  for (const row of rows2) {
    const key2 = `${row.source}:${row.measure}:${row.unit}`;
    const old = latest.get(key2);
    if (!old || row.date > old.date) latest.set(key2, row);
  }
  const current = [...latest.values()];
  const elite = current.length ? current.some((e) => (e.grade ?? 0) >= eliteGrade) : null;
  return { status: elite === null ? "Need more data" : elite ? "Elite" : "Building", elite, evidence: current };
}

// src/data/gradeBenchmarks.ts
var GRADE_BENCHMARKS = {
  ten_yard_dash: {
    source: "PG/PBR event timing data, MLB Combine \u2014 baseball only",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 1.85, grade: 20 },
      { raw: 1.75, grade: 30 },
      { raw: 1.65, grade: 40 },
      { raw: 1.55, grade: 50 },
      { raw: 1.467, grade: 60 },
      { raw: 1.383, grade: 70 },
      { raw: 1.3, grade: 80 }
    ],
    softball: []
  },
  seven_yard_dash: {
    source: "PG/PBR softball event timing \u2014 softball acceleration test",
    as_of: null,
    estimate: true,
    baseball: [],
    softball: [
      { raw: 1.55, grade: 20 },
      { raw: 1.473, grade: 30 },
      { raw: 1.397, grade: 40 },
      { raw: 1.32, grade: 50 },
      { raw: 1.247, grade: 60 },
      { raw: 1.173, grade: 70 },
      { raw: 1.1, grade: 80 }
    ]
  },
  thirty_yard_dash: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 4.3, grade: 20 },
      { raw: 4.117, grade: 30 },
      { raw: 3.933, grade: 40 },
      { raw: 3.75, grade: 50 },
      { raw: 3.567, grade: 60 },
      { raw: 3.383, grade: 70 },
      { raw: 3.2, grade: 80 }
    ],
    softball: [
      { raw: 4.6, grade: 20 },
      { raw: 4.4, grade: 30 },
      { raw: 4.2, grade: 40 },
      { raw: 4, grade: 50 },
      { raw: 3.817, grade: 60 },
      { raw: 3.633, grade: 70 },
      { raw: 3.45, grade: 80 }
    ]
  },
  sixty_yard_dash: {
    source: "owner",
    as_of: "2026-09-08",
    baseball: [
      { raw: 7.5, grade: 20 },
      { raw: 7.267, grade: 30 },
      { raw: 7.033, grade: 40 },
      { raw: 6.8, grade: 50 },
      { raw: 6.533, grade: 60 },
      { raw: 6.267, grade: 70 },
      { raw: 6, grade: 80 }
    ],
    softball: []
  },
  forty_yard_dash: {
    source: "PG/PBR softball event timing \u2014 softball top-end speed test",
    as_of: null,
    estimate: true,
    baseball: [],
    softball: [
      { raw: 5.75, grade: 20 },
      { raw: 5.517, grade: 30 },
      { raw: 5.283, grade: 40 },
      { raw: 5.05, grade: 50 },
      { raw: 4.833, grade: 60 },
      { raw: 4.617, grade: 70 },
      { raw: 4.4, grade: 80 }
    ]
  },
  ten_thirty_split: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3, grade: 20 },
      { raw: 2.8, grade: 30 },
      { raw: 2.6, grade: 40 },
      { raw: 2.4, grade: 50 },
      { raw: 2.233, grade: 60 },
      { raw: 2.067, grade: 70 },
      { raw: 1.9, grade: 80 }
    ],
    softball: [
      { raw: 3.3, grade: 20 },
      { raw: 3.067, grade: 30 },
      { raw: 2.833, grade: 40 },
      { raw: 2.6, grade: 50 },
      { raw: 2.433, grade: 60 },
      { raw: 2.267, grade: 70 },
      { raw: 2.1, grade: 80 }
    ]
  },
  thirty_sixty_split: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3.4, grade: 20 },
      { raw: 3.2, grade: 30 },
      { raw: 3, grade: 40 },
      { raw: 2.8, grade: 50 },
      { raw: 2.633, grade: 60 },
      { raw: 2.467, grade: 70 },
      { raw: 2.3, grade: 80 }
    ],
    softball: [
      { raw: 3.7, grade: 20 },
      { raw: 3.467, grade: 30 },
      { raw: 3.233, grade: 40 },
      { raw: 3, grade: 50 },
      { raw: 2.817, grade: 60 },
      { raw: 2.633, grade: 70 },
      { raw: 2.45, grade: 80 }
    ]
  },
  pro_agility: {
    source: "NFL/MLB Combine cross-reference, PG data",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 4.9, grade: 20 },
      { raw: 4.7, grade: 30 },
      { raw: 4.5, grade: 40 },
      { raw: 4.3, grade: 50 },
      { raw: 4.1, grade: 60 },
      { raw: 3.9, grade: 70 },
      { raw: 3.7, grade: 80 }
    ],
    softball: [
      { raw: 5.1, grade: 20 },
      { raw: 4.9, grade: 30 },
      { raw: 4.7, grade: 40 },
      { raw: 4.5, grade: 50 },
      { raw: 4.283, grade: 60 },
      { raw: 4.067, grade: 70 },
      { raw: 3.85, grade: 80 }
    ]
  },
  lateral_shuffle: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3.6, grade: 20 },
      { raw: 3.367, grade: 30 },
      { raw: 3.133, grade: 40 },
      { raw: 2.9, grade: 50 },
      { raw: 2.717, grade: 60 },
      { raw: 2.533, grade: 70 },
      { raw: 2.35, grade: 80 }
    ],
    softball: [
      { raw: 3.8, grade: 20 },
      { raw: 3.567, grade: 30 },
      { raw: 3.333, grade: 40 },
      { raw: 3.1, grade: 50 },
      { raw: 2.9, grade: 60 },
      { raw: 2.7, grade: 70 },
      { raw: 2.5, grade: 80 }
    ]
  },
  first_step_5yd: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 1.4, grade: 20 },
      { raw: 1.3, grade: 30 },
      { raw: 1.2, grade: 40 },
      { raw: 1.1, grade: 50 },
      { raw: 1, grade: 60 },
      { raw: 0.9, grade: 70 },
      { raw: 0.8, grade: 80 }
    ],
    softball: [
      { raw: 1.5, grade: 20 },
      { raw: 1.4, grade: 30 },
      { raw: 1.3, grade: 40 },
      { raw: 1.2, grade: 50 },
      { raw: 1.09, grade: 60 },
      { raw: 0.98, grade: 70 },
      { raw: 0.87, grade: 80 }
    ]
  },
  sl_broad_jump: {
    source: "NSCA normative tables, PG data",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 55, grade: 20 },
      { raw: 62, grade: 30 },
      { raw: 69, grade: 40 },
      { raw: 76, grade: 50 },
      { raw: 85.667, grade: 60 },
      { raw: 95.333, grade: 70 },
      { raw: 105, grade: 80 }
    ],
    softball: [
      { raw: 48, grade: 20 },
      { raw: 55.333, grade: 30 },
      { raw: 62.667, grade: 40 },
      { raw: 70, grade: 50 },
      { raw: 79.333, grade: 60 },
      { raw: 88.667, grade: 70 },
      { raw: 98, grade: 80 }
    ]
  },
  sl_lateral_broad_jump: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 45, grade: 20 },
      { raw: 51.667, grade: 30 },
      { raw: 58.333, grade: 40 },
      { raw: 65, grade: 50 },
      { raw: 74.333, grade: 60 },
      { raw: 83.667, grade: 70 },
      { raw: 93, grade: 80 }
    ],
    softball: [
      { raw: 42, grade: 20 },
      { raw: 48.333, grade: 30 },
      { raw: 54.667, grade: 40 },
      { raw: 61, grade: 50 },
      { raw: 69.667, grade: 60 },
      { raw: 78.333, grade: 70 },
      { raw: 87, grade: 80 }
    ]
  },
  sl_vert_jump: {
    source: "NSCA, PG event data",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 18, grade: 20 },
      { raw: 21, grade: 30 },
      { raw: 24, grade: 40 },
      { raw: 27, grade: 50 },
      { raw: 30.667, grade: 60 },
      { raw: 34.333, grade: 70 },
      { raw: 38, grade: 80 }
    ],
    softball: [
      { raw: 16, grade: 20 },
      { raw: 19, grade: 30 },
      { raw: 22, grade: 40 },
      { raw: 25, grade: 50 },
      { raw: 28.333, grade: 60 },
      { raw: 31.667, grade: 70 },
      { raw: 35, grade: 80 }
    ]
  },
  vertical_jump: {
    source: "NSCA normative tables",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 22, grade: 20 },
      { raw: 25, grade: 30 },
      { raw: 28, grade: 40 },
      { raw: 31, grade: 50 },
      { raw: 34.667, grade: 60 },
      { raw: 38.333, grade: 70 },
      { raw: 42, grade: 80 }
    ],
    softball: [
      { raw: 19, grade: 20 },
      { raw: 21.667, grade: 30 },
      { raw: 24.333, grade: 40 },
      { raw: 27, grade: 50 },
      { raw: 30.667, grade: 60 },
      { raw: 34.333, grade: 70 },
      { raw: 38, grade: 80 }
    ]
  },
  standing_broad_jump: {
    source: "NSCA normative tables",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 70, grade: 20 },
      { raw: 78.333, grade: 30 },
      { raw: 86.667, grade: 40 },
      { raw: 95, grade: 50 },
      { raw: 105, grade: 60 },
      { raw: 115, grade: 70 },
      { raw: 125, grade: 80 }
    ],
    softball: [
      { raw: 62, grade: 20 },
      { raw: 70.333, grade: 30 },
      { raw: 78.667, grade: 40 },
      { raw: 87, grade: 50 },
      { raw: 96.667, grade: 60 },
      { raw: 106.333, grade: 70 },
      { raw: 116, grade: 80 }
    ]
  },
  mb_situp_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 20, grade: 20 },
      { raw: 25, grade: 30 },
      { raw: 30, grade: 40 },
      { raw: 35, grade: 50 },
      { raw: 41.667, grade: 60 },
      { raw: 48.333, grade: 70 },
      { raw: 55, grade: 80 }
    ],
    softball: [
      { raw: 17, grade: 20 },
      { raw: 21.333, grade: 30 },
      { raw: 25.667, grade: 40 },
      { raw: 30, grade: 50 },
      { raw: 36, grade: 60 },
      { raw: 42, grade: 70 },
      { raw: 48, grade: 80 }
    ]
  },
  seated_chest_pass: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 16, grade: 20 },
      { raw: 20, grade: 30 },
      { raw: 24, grade: 40 },
      { raw: 28, grade: 50 },
      { raw: 33, grade: 60 },
      { raw: 38, grade: 70 },
      { raw: 43, grade: 80 }
    ],
    softball: [
      { raw: 13, grade: 20 },
      { raw: 16.333, grade: 30 },
      { raw: 19.667, grade: 40 },
      { raw: 23, grade: 50 },
      { raw: 27.667, grade: 60 },
      { raw: 32.333, grade: 70 },
      { raw: 37, grade: 80 }
    ]
  },
  mb_rotational_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 22, grade: 20 },
      { raw: 26.333, grade: 30 },
      { raw: 30.667, grade: 40 },
      { raw: 35, grade: 50 },
      { raw: 40, grade: 60 },
      { raw: 45, grade: 70 },
      { raw: 50, grade: 80 }
    ],
    softball: [
      { raw: 19, grade: 20 },
      { raw: 23, grade: 30 },
      { raw: 27, grade: 40 },
      { raw: 31, grade: 50 },
      { raw: 36, grade: 60 },
      { raw: 41, grade: 70 },
      { raw: 46, grade: 80 }
    ]
  },
  mb_overhead_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 22, grade: 20 },
      { raw: 27.333, grade: 30 },
      { raw: 32.667, grade: 40 },
      { raw: 38, grade: 50 },
      { raw: 44.333, grade: 60 },
      { raw: 50.667, grade: 70 },
      { raw: 57, grade: 80 }
    ],
    softball: [
      { raw: 18, grade: 20 },
      { raw: 23, grade: 30 },
      { raw: 28, grade: 40 },
      { raw: 33, grade: 50 },
      { raw: 39, grade: 60 },
      { raw: 45, grade: 70 },
      { raw: 51, grade: 80 }
    ]
  },
  tee_exit_velocity: {
    source: "owner",
    as_of: "2026-09-08",
    baseball: [
      { raw: 70, grade: 20 },
      { raw: 77.667, grade: 30 },
      { raw: 85.333, grade: 40 },
      { raw: 93, grade: 50 },
      { raw: 97.667, grade: 60 },
      { raw: 102.333, grade: 70 },
      { raw: 107, grade: 80 }
    ],
    softball: [
      { raw: 50, grade: 20 },
      { raw: 56, grade: 30 },
      { raw: 62, grade: 40 },
      { raw: 68, grade: 50 },
      { raw: 74, grade: 60 },
      { raw: 80, grade: 70 },
      { raw: 86, grade: 80 }
    ]
  },
  max_tee_distance: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 200, grade: 20 },
      { raw: 243.333, grade: 30 },
      { raw: 286.667, grade: 40 },
      { raw: 330, grade: 50 },
      { raw: 370, grade: 60 },
      { raw: 410, grade: 70 },
      { raw: 450, grade: 80 }
    ],
    softball: [
      { raw: 130, grade: 20 },
      { raw: 163.333, grade: 30 },
      { raw: 196.667, grade: 40 },
      { raw: 230, grade: 50 },
      { raw: 263.333, grade: 60 },
      { raw: 296.667, grade: 70 },
      { raw: 330, grade: 80 }
    ]
  },
  bat_speed: {
    source: "Statcast bat tracking, league-wide (MLB avg 71.5 mph, elite 78-80+)",
    as_of: "2026-01-01",
    baseball: [
      { raw: 55, grade: 20 },
      { raw: 60.333, grade: 30 },
      { raw: 65.667, grade: 40 },
      { raw: 71, grade: 50 },
      { raw: 77, grade: 60 },
      { raw: 83, grade: 70 },
      { raw: 89, grade: 80 }
    ],
    softball: [
      { raw: 48, grade: 20 },
      { raw: 53, grade: 30 },
      { raw: 58, grade: 40 },
      { raw: 63, grade: 50 },
      { raw: 69, grade: 60 },
      { raw: 75, grade: 70 },
      { raw: 81, grade: 80 }
    ]
  },
  avg_exit_velo_bp: {
    source: "Driveline, MLB Combine avg",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 65, grade: 20 },
      { raw: 71.667, grade: 30 },
      { raw: 78.333, grade: 40 },
      { raw: 85, grade: 50 },
      { raw: 91, grade: 60 },
      { raw: 97, grade: 70 },
      { raw: 103, grade: 80 }
    ],
    softball: [
      { raw: 46, grade: 20 },
      { raw: 51.667, grade: 30 },
      { raw: 57.333, grade: 40 },
      { raw: 63, grade: 50 },
      { raw: 69, grade: 60 },
      { raw: 75, grade: 70 },
      { raw: 81, grade: 80 }
    ]
  },
  long_toss_distance: {
    source: "Driveline, PG event data",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 170, grade: 20 },
      { raw: 206.667, grade: 30 },
      { raw: 243.333, grade: 40 },
      { raw: 280, grade: 50 },
      { raw: 326.667, grade: 60 },
      { raw: 373.333, grade: 70 },
      { raw: 420, grade: 80 }
    ],
    softball: [
      { raw: 125, grade: 20 },
      { raw: 153.333, grade: 30 },
      { raw: 181.667, grade: 40 },
      { raw: 210, grade: 50 },
      { raw: 243.333, grade: 60 },
      { raw: 276.667, grade: 70 },
      { raw: 310, grade: 80 }
    ]
  },
  pitching_velocity: {
    source: "MLB Combine avg 2019-2023, PG/PBR event data",
    as_of: "2023-12-31",
    baseball: [
      { raw: 84, grade: 20 },
      { raw: 87.5, grade: 30 },
      { raw: 91, grade: 40 },
      { raw: 94.5, grade: 50 },
      { raw: 97.733, grade: 60 },
      { raw: 100.967, grade: 70 },
      { raw: 104.2, grade: 80 }
    ],
    softball: [
      { raw: 52, grade: 20 },
      { raw: 56.667, grade: 30 },
      { raw: 61.333, grade: 40 },
      { raw: 66, grade: 50 },
      { raw: 70, grade: 60 },
      { raw: 74, grade: 70 },
      { raw: 78, grade: 80 }
    ]
  },
  position_throw_velo: {
    source: "owner",
    as_of: "2026-09-08",
    baseball: [
      { raw: 75, grade: 20 },
      { raw: 79.333, grade: 30 },
      { raw: 83.667, grade: 40 },
      { raw: 88, grade: 50 },
      { raw: 90.333, grade: 60 },
      { raw: 92.667, grade: 70 },
      { raw: 95, grade: 80 }
    ],
    softball: [
      { raw: 52, grade: 20 },
      { raw: 58, grade: 30 },
      { raw: 64, grade: 40 },
      { raw: 70, grade: 50 },
      { raw: 76, grade: 60 },
      { raw: 82, grade: 70 },
      { raw: 88, grade: 80 }
    ]
  },
  pulldown_velocity: {
    source: "owner",
    as_of: "2026-09-08",
    baseball: [
      { raw: 78, grade: 20 },
      { raw: 83, grade: 30 },
      { raw: 88, grade: 40 },
      { raw: 93, grade: 50 },
      { raw: 99, grade: 60 },
      { raw: 105, grade: 70 },
      { raw: 111, grade: 80 }
    ],
    softball: [
      { raw: 55, grade: 20 },
      { raw: 60, grade: 30 },
      { raw: 65, grade: 40 },
      { raw: 70, grade: 50 },
      { raw: 74.667, grade: 60 },
      { raw: 79.333, grade: 70 },
      { raw: 84, grade: 80 }
    ]
  },
  fielding_exchange_time: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 0.85, grade: 20 },
      { raw: 0.8, grade: 30 },
      { raw: 0.75, grade: 40 },
      { raw: 0.7, grade: 50 },
      { raw: 0.633, grade: 60 },
      { raw: 0.567, grade: 70 },
      { raw: 0.5, grade: 80 }
    ],
    softball: [
      { raw: 2, grade: 20 },
      { raw: 1.783, grade: 30 },
      { raw: 1.567, grade: 40 },
      { raw: 1.35, grade: 50 },
      { raw: 1.183, grade: 60 },
      { raw: 1.017, grade: 70 },
      { raw: 0.85, grade: 80 }
    ]
  },
  pop_time: {
    source: "Baseball Savant pop time leaderboard (MLB avg 2.00s to 2B)",
    as_of: "2026-01-01",
    baseball: [
      { raw: 2.5, grade: 20 },
      { raw: 2.333, grade: 30 },
      { raw: 2.167, grade: 40 },
      { raw: 2, grade: 50 },
      { raw: 1.867, grade: 60 },
      { raw: 1.733, grade: 70 },
      { raw: 1.6, grade: 80 }
    ],
    softball: [
      { raw: 2.2, grade: 20 },
      { raw: 2.12, grade: 30 },
      { raw: 2.04, grade: 40 },
      { raw: 1.96, grade: 50 },
      { raw: 1.89, grade: 60 },
      { raw: 1.82, grade: 70 },
      { raw: 1.75, grade: 80 }
    ]
  },
  sixty_yard_shuttle: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 15.5, grade: 20 },
      { raw: 14.667, grade: 30 },
      { raw: 13.833, grade: 40 },
      { raw: 13, grade: 50 },
      { raw: 12.267, grade: 60 },
      { raw: 11.533, grade: 70 },
      { raw: 10.8, grade: 80 }
    ],
    softball: [
      { raw: 16.5, grade: 20 },
      { raw: 15.667, grade: 30 },
      { raw: 14.833, grade: 40 },
      { raw: 14, grade: 50 },
      { raw: 13.267, grade: 60 },
      { raw: 12.533, grade: 70 },
      { raw: 11.8, grade: 80 }
    ]
  },
  sl_balance_eyes_closed: {
    source: "Research - balance norms for athletes",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 10, grade: 20 },
      { raw: 18.333, grade: 30 },
      { raw: 26.667, grade: 40 },
      { raw: 35, grade: 50 },
      { raw: 53.333, grade: 60 },
      { raw: 71.667, grade: 70 },
      { raw: 90, grade: 80 }
    ],
    softball: [
      { raw: 10, grade: 20 },
      { raw: 18.333, grade: 30 },
      { raw: 26.667, grade: 40 },
      { raw: 35, grade: 50 },
      { raw: 53.333, grade: 60 },
      { raw: 71.667, grade: 70 },
      { raw: 90, grade: 80 }
    ]
  },
  deceleration_10yd: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 2.8, grade: 20 },
      { raw: 2.533, grade: 30 },
      { raw: 2.267, grade: 40 },
      { raw: 2, grade: 50 },
      { raw: 1.8, grade: 60 },
      { raw: 1.6, grade: 70 },
      { raw: 1.4, grade: 80 }
    ],
    softball: [
      { raw: 3, grade: 20 },
      { raw: 2.733, grade: 30 },
      { raw: 2.467, grade: 40 },
      { raw: 2.2, grade: 50 },
      { raw: 1.983, grade: 60 },
      { raw: 1.767, grade: 70 },
      { raw: 1.55, grade: 80 }
    ]
  },
  three_hundred_yd_shuttle: {
    source: "NSCA normative tables",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 68, grade: 20 },
      { raw: 63.667, grade: 30 },
      { raw: 59.333, grade: 40 },
      { raw: 55, grade: 50 },
      { raw: 51.333, grade: 60 },
      { raw: 47.667, grade: 70 },
      { raw: 44, grade: 80 }
    ],
    softball: [
      { raw: 73, grade: 20 },
      { raw: 68.667, grade: 30 },
      { raw: 64.333, grade: 40 },
      { raw: 60, grade: 50 },
      { raw: 56, grade: 60 },
      { raw: 52, grade: 70 },
      { raw: 48, grade: 80 }
    ]
  },
  sprint_repeat_avg: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 4.8, grade: 20 },
      { raw: 4.533, grade: 30 },
      { raw: 4.267, grade: 40 },
      { raw: 4, grade: 50 },
      { raw: 3.8, grade: 60 },
      { raw: 3.6, grade: 70 },
      { raw: 3.4, grade: 80 }
    ],
    softball: [
      { raw: 5.1, grade: 20 },
      { raw: 4.833, grade: 30 },
      { raw: 4.567, grade: 40 },
      { raw: 4.3, grade: 50 },
      { raw: 4.083, grade: 60 },
      { raw: 3.867, grade: 70 },
      { raw: 3.65, grade: 80 }
    ]
  },
  sl_3x_bound: {
    source: "NSCA bound norms + sport-specific elastic output research",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 23, grade: 20 },
      { raw: 26.333, grade: 30 },
      { raw: 29.667, grade: 40 },
      { raw: 33, grade: 50 },
      { raw: 37.667, grade: 60 },
      { raw: 42.333, grade: 70 },
      { raw: 47, grade: 80 }
    ],
    softball: [
      { raw: 21, grade: 20 },
      { raw: 24, grade: 30 },
      { raw: 27, grade: 40 },
      { raw: 30, grade: 50 },
      { raw: 34.333, grade: 60 },
      { raw: 38.667, grade: 70 },
      { raw: 43, grade: 80 }
    ]
  },
  shoulder_rom_internal: {
    source: "Research - GIRD norms, throwing athlete ROM studies",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 28, grade: 20 },
      { raw: 33.667, grade: 30 },
      { raw: 39.333, grade: 40 },
      { raw: 45, grade: 50 },
      { raw: 52.667, grade: 60 },
      { raw: 60.333, grade: 70 },
      { raw: 68, grade: 80 }
    ],
    softball: [
      { raw: 30, grade: 20 },
      { raw: 35.667, grade: 30 },
      { raw: 41.333, grade: 40 },
      { raw: 47, grade: 50 },
      { raw: 54.667, grade: 60 },
      { raw: 62.333, grade: 70 },
      { raw: 70, grade: 80 }
    ]
  },
  shoulder_rom_external: {
    source: "Research - throwing athlete ROM studies",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 65, grade: 20 },
      { raw: 72.333, grade: 30 },
      { raw: 79.667, grade: 40 },
      { raw: 87, grade: 50 },
      { raw: 94.667, grade: 60 },
      { raw: 102.333, grade: 70 },
      { raw: 110, grade: 80 }
    ],
    softball: [
      { raw: 66, grade: 20 },
      { raw: 73.333, grade: 30 },
      { raw: 80.667, grade: 40 },
      { raw: 88, grade: 50 },
      { raw: 95.667, grade: 60 },
      { raw: 103.333, grade: 70 },
      { raw: 111, grade: 80 }
    ]
  },
  hip_internal_rotation: {
    source: "Research - hip mobility norms for rotational athletes",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 20, grade: 20 },
      { raw: 24.667, grade: 30 },
      { raw: 29.333, grade: 40 },
      { raw: 34, grade: 50 },
      { raw: 40, grade: 60 },
      { raw: 46, grade: 70 },
      { raw: 52, grade: 80 }
    ],
    softball: [
      { raw: 22, grade: 20 },
      { raw: 26.667, grade: 30 },
      { raw: 31.333, grade: 40 },
      { raw: 36, grade: 50 },
      { raw: 42, grade: 60 },
      { raw: 48, grade: 70 },
      { raw: 54, grade: 80 }
    ]
  },
  ankle_dorsiflexion: {
    source: "Research - knee-to-wall test norms",
    as_of: null,
    estimate: true,
    baseball: [
      { raw: 2.2, grade: 20 },
      { raw: 2.8, grade: 30 },
      { raw: 3.4, grade: 40 },
      { raw: 4, grade: 50 },
      { raw: 4.667, grade: 60 },
      { raw: 5.333, grade: 70 },
      { raw: 6, grade: 80 }
    ],
    softball: [
      { raw: 2.5, grade: 20 },
      { raw: 3.067, grade: 30 },
      { raw: 3.633, grade: 40 },
      { raw: 4.2, grade: 50 },
      { raw: 4.867, grade: 60 },
      { raw: 5.533, grade: 70 },
      { raw: 6.2, grade: 80 }
    ]
  }
};
var SOFTBALL_GRADED_METRICS = /* @__PURE__ */ new Set([
  "seven_yard_dash",
  "forty_yard_dash",
  "shoulder_rom_internal",
  "shoulder_rom_external",
  "hip_internal_rotation",
  "ankle_dorsiflexion",
  "sl_balance_eyes_closed"
]);
function isSoftballGradable(metricKey) {
  return SOFTBALL_GRADED_METRICS.has(metricKey);
}
var SOFTBALL_UNGRADED_METRICS = Object.entries(GRADE_BENCHMARKS).filter(([key2, entry]) => (entry.softball?.length ?? 0) > 0 && !SOFTBALL_GRADED_METRICS.has(key2)).map(([key2]) => key2);

// src/data/performanceTestRegistry.ts
var PERFORMANCE_METRICS = [
  // ── SPEED ──────────────────────────────────────────────
  {
    key: "ten_yard_dash",
    category: "speed",
    label: "10-Yard Dash",
    unit: "s",
    min: 1,
    max: 3,
    step: 0.01,
    higherIsBetter: false,
    tier: "free",
    sports: ["baseball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "From a standing start, sprint 10 yards. Time with stopwatch or laser."
  },
  {
    key: "seven_yard_dash",
    category: "speed",
    label: "7-Yard Dash",
    unit: "s",
    min: 0.8,
    max: 2.5,
    step: 0.01,
    higherIsBetter: false,
    tier: "free",
    sports: ["softball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "From a standing start, sprint 7 yards (home-to-first-step distance for softball acceleration). Time with stopwatch or laser."
  },
  {
    key: "thirty_yard_dash",
    category: "speed",
    label: "30-Yard Dash",
    unit: "s",
    min: 3,
    max: 6,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "From a standing start, sprint 30 yards. Use electronic timing if available."
  },
  {
    key: "forty_yard_dash",
    category: "speed",
    label: "40-Yard Dash",
    unit: "s",
    min: 4,
    max: 8,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["softball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "From a standing start, sprint 40 yards. Standard softball top-end speed test."
  },
  {
    key: "sixty_yard_dash",
    category: "speed",
    label: "60-Yard Dash",
    unit: "s",
    min: 5.5,
    max: 10,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "From a standing start, sprint 60 yards. Standard MLB combine distance."
  },
  {
    key: "ten_thirty_split",
    category: "speed",
    label: "10-30 Split",
    unit: "s",
    min: 2,
    max: 5,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Time between 10-yard and 30-yard marks during a 60-yard sprint."
  },
  {
    key: "thirty_sixty_split",
    category: "speed",
    label: "30-60 Split",
    unit: "s",
    min: 2,
    max: 5,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Time between 30-yard and 60-yard marks during a 60-yard sprint."
  },
  // ── QUICKNESS ──────────────────────────────────────────
  {
    key: "pro_agility",
    category: "quickness",
    label: "5-10-5 Pro Agility",
    unit: "s",
    min: 3.5,
    max: 6.5,
    step: 0.01,
    higherIsBetter: false,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "Start at center cone, sprint 5 yards right, 10 yards left, 5 yards back to center."
  },
  {
    key: "lateral_shuffle",
    category: "quickness",
    label: "Lateral Shuffle (10yd)",
    unit: "s",
    min: 2,
    max: 5,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["throwing", "general"],
    instructions: "Shuffle laterally for 10 yards. Stay low, no crossover steps."
  },
  {
    key: "first_step_5yd",
    category: "quickness",
    label: "First Step (5yd)",
    unit: "s",
    min: 0.5,
    max: 2,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "React to stimulus and sprint 5 yards. Measures reaction + first step explosiveness."
  },
  // ── POWER — LOWER BODY ─────────────────────────────────
  {
    key: "sl_broad_jump",
    category: "power_lower",
    label: "SL Broad Jump",
    unit: "in",
    min: 20,
    max: 120,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "Single-leg standing broad jump. Measure from take-off line to nearest heel contact.",
    bilateral: true,
    bilateralType: "leg"
  },
  {
    key: "sl_lateral_broad_jump",
    category: "power_lower",
    label: "SL Lateral Broad Jump",
    unit: "in",
    min: 20,
    max: 100,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "Single-leg lateral jump. Land and stick on opposite leg.",
    bilateral: true,
    bilateralType: "leg"
  },
  {
    key: "sl_vert_jump",
    category: "power_lower",
    label: "SL Vertical Jump",
    unit: "in",
    min: 10,
    max: 45,
    step: 0.5,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["pitching", "throwing", "general"],
    instructions: "Single-leg vertical jump. Reach as high as possible. Measure difference from standing reach.",
    bilateral: true,
    bilateralType: "leg"
  },
  {
    key: "vertical_jump",
    category: "power_lower",
    label: "Vertical Jump",
    unit: "in",
    min: 12,
    max: 48,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "throwing", "general"],
    instructions: "Two-leg vertical jump. Measure difference between standing reach and peak reach."
  },
  {
    key: "standing_broad_jump",
    category: "power_lower",
    label: "Standing Broad Jump",
    unit: "in",
    min: 40,
    max: 130,
    step: 0.5,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Two-leg standing broad jump. Measure from take-off line to nearest heel contact."
  },
  // ── POWER — UPPER BODY / ROTATIONAL ────────────────────
  {
    key: "mb_situp_throw",
    category: "power_upper",
    label: "MB Situp Throw (5lb)",
    unit: "ft",
    min: 5,
    max: 60,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "Lie on back, 5lb medicine ball overhead. Sit up and throw for distance."
  },
  {
    key: "seated_chest_pass",
    category: "power_upper",
    label: "Seated Chest Pass (5lb)",
    unit: "ft",
    min: 5,
    max: 45,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "Seated with legs extended, 5lb medicine ball at chest. Push-pass for distance."
  },
  {
    key: "mb_rotational_throw",
    category: "power_upper",
    label: "MB Rotational Throw (5lb)",
    unit: "ft",
    min: 10,
    max: 50,
    step: 0.5,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["hitting", "general"],
    instructions: "Standing perpendicular to wall, 5lb ball. Rotate trunk and throw for distance.",
    bilateral: true,
    bilateralType: "side"
  },
  {
    key: "mb_overhead_throw",
    category: "power_upper",
    label: "MB Overhead Throw (5lb)",
    unit: "ft",
    min: 10,
    max: 60,
    step: 0.5,
    higherIsBetter: true,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Standing, 5lb ball overhead. Throw forward for distance using full body extension."
  },
  // ── EXIT VELOCITY & BAT SPEED ──────────────────────────
  {
    key: "tee_exit_velocity",
    category: "exit_velocity",
    label: "Tee Exit Velocity",
    unit: "mph",
    min: 30,
    max: 120,
    step: 0.1,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting"],
    instructions: "Hit off tee. Measure exit velocity with radar gun or HitTrax."
  },
  {
    key: "max_tee_distance",
    category: "exit_velocity",
    label: "Max Tee Distance",
    unit: "ft",
    min: 50,
    max: 500,
    step: 1,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting"],
    instructions: "Hit off tee for maximum distance. Measure carry + roll."
  },
  {
    key: "bat_speed",
    category: "exit_velocity",
    label: "Bat Speed",
    unit: "mph",
    min: 30,
    max: 100,
    step: 0.1,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["hitting"],
    instructions: "Measure bat speed with Blast Motion, Diamond Kinetics, or equivalent sensor."
  },
  {
    key: "avg_exit_velo_bp",
    category: "exit_velocity",
    label: "Avg Exit Velo (BP, 10 swings)",
    unit: "mph",
    min: 30,
    max: 115,
    step: 0.1,
    higherIsBetter: true,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["hitting"],
    instructions: "Take 10 swings in BP. Record average exit velocity."
  },
  // ── THROWING VELOCITY & ARM STRENGTH ───────────────────
  {
    key: "long_toss_distance",
    category: "throwing_velocity",
    label: "Long Toss Distance",
    unit: "ft",
    min: 50,
    max: 450,
    step: 1,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["pitching", "throwing", "general"],
    instructions: "Max long toss on a line. Measure total carry distance."
  },
  {
    key: "pitching_velocity",
    category: "throwing_velocity",
    label: "Pitching Velocity",
    unit: "mph",
    min: 30,
    max: 105,
    step: 0.1,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["pitching"],
    instructions: "Fastball velocity from the mound. Use radar gun, average of 3 pitches."
  },
  {
    key: "position_throw_velo",
    category: "throwing_velocity",
    label: "Position Player Throw Velo",
    unit: "mph",
    min: 30,
    max: 105,
    step: 0.1,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["throwing", "hitting", "general"],
    instructions: "Max effort throw from position (e.g., SS to 1B). Radar gun."
  },
  {
    key: "pulldown_velocity",
    category: "throwing_velocity",
    label: "Pulldown Velocity",
    unit: "mph",
    min: 40,
    max: 110,
    step: 0.1,
    higherIsBetter: true,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["pitching"],
    instructions: "Crow-hop throw at max effort into net or wall. Radar gun."
  },
  // ── FIELDING ───────────────────────────────────────────
  {
    key: "fielding_exchange_time",
    category: "fielding",
    label: "Fielding Exchange Time",
    unit: "s",
    min: 0.5,
    max: 3,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["throwing", "general"],
    instructions: "Time from ball entering glove to release on throw. Use video analysis."
  },
  {
    key: "pop_time",
    category: "fielding",
    label: "Pop Time (Catchers)",
    unit: "s",
    min: 1.5,
    max: 2.5,
    step: 0.01,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["throwing"],
    instructions: "Time from pitch hitting mitt to ball reaching 2nd base (catchers only)."
  },
  {
    key: "sixty_yard_shuttle",
    category: "fielding",
    label: "60yd Shuttle",
    unit: "s",
    min: 10,
    max: 20,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Sprint 20 yards and back 3 times (60 total yards). Touch line each rep."
  },
  // ── BODY CONTROL ───────────────────────────────────────
  {
    key: "sl_balance_eyes_closed",
    category: "body_control",
    label: "SL Balance (Eyes Closed)",
    unit: "s",
    min: 0,
    max: 120,
    step: 1,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Stand on one leg, eyes closed. Time until loss of balance. Max 120s.",
    bilateral: true,
    bilateralType: "leg"
  },
  {
    key: "deceleration_10yd",
    category: "body_control",
    label: "Deceleration (10yd stop)",
    unit: "s",
    min: 1,
    max: 4,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Sprint 20 yards, decelerate to full stop by 10-yard mark. Time the stop zone."
  },
  // ── ENERGY SYSTEM ──────────────────────────────────────
  {
    key: "three_hundred_yd_shuttle",
    category: "energy_system",
    label: "300yd Shuttle",
    unit: "s",
    min: 45,
    max: 90,
    step: 0.1,
    higherIsBetter: false,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Sprint 25 yards and back, 6 times (300 total). Full effort."
  },
  {
    key: "sprint_repeat_avg",
    category: "energy_system",
    label: "Sprint Repeatability (6\xD730yd avg)",
    unit: "s",
    min: 3.5,
    max: 6,
    step: 0.01,
    higherIsBetter: false,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: "Sprint 30 yards \xD7 6 reps, 30s rest between. Record average time."
  },
  // ── FASCIAL ELASTICITY ─────────────────────────────────
  {
    key: "sl_3x_bound",
    category: "mobility",
    label: "Single Leg 3x Bound",
    unit: "ft",
    min: 10,
    max: 80,
    step: 0.5,
    higherIsBetter: true,
    tier: "free",
    sports: ["baseball", "softball"],
    modules: ["hitting", "pitching", "throwing", "general"],
    instructions: "Three consecutive single-leg bounds for distance. Measure total distance from start line to final landing. Test each leg.",
    bilateral: true,
    bilateralType: "leg"
  },
  {
    key: "shoulder_rom_internal",
    category: "mobility",
    label: "Shoulder ROM Internal",
    unit: "deg",
    min: 20,
    max: 90,
    step: 1,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["pitching", "throwing", "general"],
    instructions: "Supine, 90\xB0 abduction. Rotate arm inward. Measure angle with goniometer.",
    bilateral: true,
    bilateralType: "side"
  },
  {
    key: "shoulder_rom_external",
    category: "mobility",
    label: "Shoulder ROM External",
    unit: "deg",
    min: 50,
    max: 120,
    step: 1,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["pitching", "throwing", "general"],
    instructions: "Supine, 90\xB0 abduction. Rotate arm outward. Measure angle with goniometer.",
    bilateral: true,
    bilateralType: "side"
  },
  {
    key: "hip_internal_rotation",
    category: "mobility",
    label: "Hip Internal Rotation",
    unit: "deg",
    min: 15,
    max: 60,
    step: 1,
    higherIsBetter: true,
    tier: "paid",
    sports: ["baseball", "softball"],
    modules: ["hitting", "pitching", "general"],
    instructions: "Seated, knee at 90\xB0. Rotate foot outward (hip internally). Measure angle.",
    bilateral: true,
    bilateralType: "side"
  },
  {
    key: "ankle_dorsiflexion",
    category: "mobility",
    label: "Ankle Dorsiflexion",
    unit: "in",
    min: 1,
    max: 8,
    step: 0.25,
    higherIsBetter: true,
    tier: "elite",
    sports: ["baseball", "softball"],
    modules: ["general"],
    instructions: 'Half-kneeling, toe 5" from wall. Knee-to-wall test. Measure max distance.',
    bilateral: true,
    bilateralType: "leg"
  }
];
var METRIC_BY_KEY = {};
PERFORMANCE_METRICS.forEach((m) => {
  METRIC_BY_KEY[m.key] = m;
});

// src/lib/benchmarks/canonical.ts
var DUPLICATE_RESOLUTIONS = {
  // GRADE_BENCHMARKS records "MLB Statcast pop time data"; the scale row
  // carries only the generic research boilerplate. Specific source wins.
  pop_time: {
    canonical: "pop_time",
    winner: "grade_benchmarks",
    reason: "GRADE_BENCHMARKS cites MLB Statcast; the scale_reference row carries only generic research boilerplate."
  },
  catcher_pop_time: {
    canonical: "pop_time",
    winner: "grade_benchmarks",
    reason: "Reads the pop_time anchors so both surfaces agree."
  },
  // GRADE_BENCHMARKS says "Estimate" outright — an estimate is not a source.
  // The scale row documents the Realmuto transfer breakdown and is dated.
  fielding_exchange_time: {
    canonical: "exchange_time_sec",
    winner: "scale_reference",
    reason: "GRADE_BENCHMARKS is an admitted estimate; the scale_reference row is documented and dated."
  },
  // Both sides are sourced, so the dated side wins — and the scale rows are
  // position-specific, which the single generic key cannot express.
  position_throw_velo: {
    canonical: "throw_velo_mph_infield",
    winner: "scale_reference",
    reason: "Both sourced; scale_reference is dated and position-specific. Infield is the position-neutral default."
  }
};
var SCALE_ANCHOR_SNAPSHOT = [
  {
    metric: "exchange_time_sec",
    direction: "lower_better",
    floor_value: 0.85,
    avg_value: 0.7,
    record_value: 0.5,
    source: "Documented elite pop-time breakdowns (Realmuto 1.80s pop = 0.54s transfer).",
    as_of: "2026-08-29"
  },
  {
    metric: "throw_velo_mph_infield",
    direction: "higher_better",
    floor_value: 75,
    avg_value: 88,
    record_value: 95,
    source: "owner",
    as_of: "2026-09-08"
  },
  {
    metric: "throw_velo_mph_outfield",
    direction: "higher_better",
    floor_value: 78,
    avg_value: 92,
    record_value: 98,
    source: "owner",
    as_of: "2026-09-08"
  }
];
function resolutionFor(metricKey) {
  return DUPLICATE_RESOLUTIONS[metricKey];
}
function isScaleOwned(metricKey) {
  return DUPLICATE_RESOLUTIONS[metricKey]?.winner === "scale_reference";
}

// src/lib/benchmarks/gradeScale.ts
var MLB_FLOOR_GRADE = 20;
var GRADE_MIN = 0;
var GRADE_MAX = 80;
var SUB_FLOOR_SLOPE_FRACTION = 0.25;
function roundGrade(value) {
  const clamped = Math.max(GRADE_MIN, Math.min(GRADE_MAX, value));
  if (clamped < MLB_FLOOR_GRADE) return Math.round(clamped * 10) / 10;
  return Math.round(clamped / 5) * 5;
}
function extendBelowFloor(value, floorRaw, averageRaw) {
  const span = averageRaw - floorRaw;
  if (!Number.isFinite(span) || span === 0) return MLB_FLOOR_GRADE;
  const perUnit = 30 / span * SUB_FLOOR_SLOPE_FRACTION;
  const raw = MLB_FLOOR_GRADE + (value - floorRaw) * perUnit;
  return Math.max(GRADE_MIN, Math.min(MLB_FLOOR_GRADE, raw));
}

// src/lib/defense/beatenRunnerGrade.ts
function metricForHandedness(hand) {
  return hand === "L" ? "home_to_first_lhh" : "home_to_first_rhh";
}
function missing(reason) {
  return { grade: null, missing: true, missing_reason: reason };
}
function toScoutingGrade(raw) {
  const clamped = Math.max(GRADE_MIN, Math.min(GRADE_MAX, raw));
  if (clamped < MLB_FLOOR_GRADE) return Math.round(clamped * 10) / 10;
  return Math.round(clamped / 5) * 5;
}
function gradeFromScaleRow(value, metric, scaleRows, noValueReason = "no_play_time") {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return missing(noValueReason);
  }
  const row = scaleRows.find((r) => r.metric === metric);
  if (!row) return missing("no_scale_reference");
  if (row.direction !== "lower_better" && row.direction !== "higher_better") {
    return missing("unsupported_direction");
  }
  const floor = row.floor_value;
  const avg = row.avg_value;
  const record2 = row.record_value;
  const ordered = row.direction === "lower_better" ? record2 < avg && avg < floor : floor < avg && avg < record2;
  if (floor == null || !Number.isFinite(floor) || !Number.isFinite(avg) || !Number.isFinite(record2) || !ordered) {
    return missing("incomplete_scale_reference");
  }
  const sign = row.direction === "lower_better" ? 1 : -1;
  const t = sign * value;
  const rec = sign * record2;
  const av = sign * avg;
  const flo = sign * floor;
  let raw;
  if (t <= rec) {
    raw = 80;
  } else if (t <= av) {
    raw = 50 + (av - t) / (av - rec) * 30;
  } else if (t <= flo) {
    raw = 20 + (flo - t) / (flo - av) * 30;
  } else {
    raw = extendBelowFloor(-t, -flo, -av);
  }
  return { grade: toScoutingGrade(raw), missing: false };
}
function computeBeatenRunnerGrade(totalPlayTimeSec, hand, scaleRows) {
  return gradeFromScaleRow(
    totalPlayTimeSec,
    metricForHandedness(hand),
    scaleRows,
    "no_play_time"
  );
}

// src/lib/gradeEngine.ts
function interpolate(raw, points, higherIsBetter) {
  if (points.length === 0) return 50;
  if (points.length === 1) return points[0].grade;
  const sorted = [...points].sort((a, b) => a.raw - b.raw);
  const floorPoint = higherIsBetter ? sorted[0] : sorted[sorted.length - 1];
  const bestPoint = higherIsBetter ? sorted[sorted.length - 1] : sorted[0];
  const averagePoint = sorted.find((p) => p.grade === 50) ?? (higherIsBetter ? sorted[1] : sorted[sorted.length - 2]);
  const worseThanFloor = higherIsBetter ? raw < floorPoint.raw : raw > floorPoint.raw;
  if (worseThanFloor) {
    return extendBelowFloor(raw, floorPoint.raw, averagePoint.raw);
  }
  const betterThanBest = higherIsBetter ? raw >= bestPoint.raw : raw <= bestPoint.raw;
  if (betterThanBest) return bestPoint.grade;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (raw >= sorted[i].raw && raw <= sorted[i + 1].raw) {
      const t = (raw - sorted[i].raw) / (sorted[i + 1].raw - sorted[i].raw);
      return sorted[i].grade + t * (sorted[i + 1].grade - sorted[i].grade);
    }
  }
  return 50;
}
function rawToGrade(metricKey, rawValue, sport, age) {
  if (sport === "baseball" && isScaleOwned(metricKey)) {
    const canonical = resolutionFor(metricKey).canonical;
    const result = gradeFromScaleRow(rawValue, canonical, SCALE_ANCHOR_SNAPSHOT);
    return result.missing ? null : result.grade;
  }
  if (sport === "softball" && !isSoftballGradable(metricKey)) return null;
  const benchmarkEntry = GRADE_BENCHMARKS[metricKey];
  if (!benchmarkEntry) return null;
  const points = benchmarkEntry[sport];
  if (!points || points.length === 0) return null;
  const metricDef = METRIC_BY_KEY[metricKey];
  const higherIsBetter = metricDef?.higherIsBetter ?? true;
  const grade = interpolate(rawValue, points, higherIsBetter);
  return roundGrade(grade);
}

// supabase/functions/_shared/wic/masteryGuidance.ts
function masteryGuidance(facts) {
  const contactNeedsWork = facts.contactStatus === "Building" && facts.contactSourceIds.length > 0;
  const speedOrPower = facts.speedStatus === "Elite" || facts.powerStatus === "Elite" ? "Satisfied" : "Need more data";
  return {
    observedFocus: contactNeedsWork ? "contact" : null,
    sourceIds: contactNeedsWork ? [...facts.contactSourceIds] : [],
    speedOrPower,
    fullWeakestPillarKnown: false,
    leftPowerStealEmphasis: facts.leftPower || facts.leftPowerGoal,
    reason: contactNeedsWork ? "Your completed batting window is below the owner\u2019s balls-in-play standard. Contact needs work; the overall weakest pillar is not yet known." : "The overall weakest required pillar needs more evidence.",
    alternativeReason: speedOrPower === "Satisfied" ? "The elite speed-or-power requirement has supporting evidence." : "No data-backed comparison yet identifies whether elite speed or home-run power is more attainable."
  };
}

// supabase/functions/_shared/wic/masteryStandards.ts
var IDENTITY_SOURCE = "Camryn Williams \xB7 October 26, 2026 \xB7 Coaching Console settings";
var SOFTBALL_HITTING_SOURCE = "Camryn Williams \xB7 October 27, 2026 \xB7 softball starting standard (whiff and zone contact to be calibrated from Hammers softball data)";
var SOFTBALL_POWER_DEFAULTS = { pro: { elite: 0.067, leftPower: 0.033, lacking: 0.017 }, college: { elite: 0.125, leftPower: 0.063, lacking: 0.031 }, high_school: { elite: 0.1, leftPower: 0.05, lacking: 0.025 }, youth: { elite: 0.1, leftPower: 0.05, lacking: 0.025 } };
function hittingStandardsFor(sport, level, settings) {
  if (sport !== "softball") return settings;
  const p = level ? SOFTBALL_POWER_DEFAULTS[level] : null;
  return { ...settings, elite_hr_rate: p?.elite ?? null, left_power_hr_rate: p?.leftPower ?? null, lacking_power_hr_rate: p?.lacking ?? null };
}
var swings = /* @__PURE__ */ new Set(["swinging_strike", "foul", "in_play", "bunt_foul", "bunt_in_play"]);
var misses = /* @__PURE__ */ new Set(["swinging_strike"]);
var takes = /* @__PURE__ */ new Set(["ball", "called_strike", "hbp"]);
function contactIdentity(window2, pitches, level, settings) {
  const cutoff = level ? { k: settings[`contact_${level}_k`], whiff: settings[`contact_${level}_whiff`], zone: settings[`contact_${level}_zone`] } : null;
  const ids = new Set(window2?.paIds ?? window2?.sourceIds ?? []);
  const rows2 = pitches.filter((p) => p.atBatId && ids.has(p.atBatId));
  const unique = /* @__PURE__ */ new Map();
  let conflict = false;
  for (const p of rows2) {
    const old = unique.get(p.id);
    if (!p.id || old && JSON.stringify(old) !== JSON.stringify(p)) conflict = true;
    unique.set(p.id, p);
  }
  const actual = [...unique.values()];
  const full = !!window2 && !conflict && ids.size > 0 && [...ids].every((id) => {
    const expected = window2.pitchCounts?.[id];
    return typeof expected === "number" && Number.isInteger(expected) && expected > 0 && actual.filter((p) => p.atBatId === id).length === expected;
  }) && actual.every((p) => swings.has(p.result ?? "") || takes.has(p.result ?? ""));
  const swung = actual.filter((p) => swings.has(p.result ?? ""));
  const whiffs = swung.filter((p) => misses.has(p.result ?? ""));
  const located = full && swung.every((p) => Number.isInteger(p.zone) && Number(p.zone) >= 1 && Number(p.zone) <= 9 || !!p.outZone);
  const zoneSwings = swung.filter((p) => Number.isInteger(p.zone) && Number(p.zone) >= 1 && Number(p.zone) <= 9);
  const pa = window2?.plateAppearances;
  const k = window2 && typeof pa === "number" && pa > 0 && window2.strikeouts !== void 0 ? window2.strikeouts / pa : null;
  const whiff = full && swung.length ? whiffs.length / swung.length : null;
  const zone = located && zoneSwings.length ? zoneSwings.filter((p) => !misses.has(p.result ?? "")).length / zoneSwings.length : null;
  const judge = (v, c, lower) => v === null || c == null ? "Need more data" : (lower ? v < c : v >= c) ? "Elite" : "Building";
  const parts = { k: { value: k, status: judge(k, cutoff?.k, true), numerator: window2?.strikeouts ?? null, denominator: pa ?? null, cutoff: cutoff?.k ?? null }, whiff: { value: whiff, status: judge(whiff, cutoff?.whiff, true), numerator: full ? whiffs.length : null, denominator: full ? swung.length : null, cutoff: cutoff?.whiff ?? null }, zone: { value: zone, status: judge(zone, cutoff?.zone, false), numerator: located ? zoneSwings.filter((p) => !misses.has(p.result ?? "")).length : null, denominator: located ? zoneSwings.length : null, cutoff: cutoff?.zone ?? null } };
  const statuses = Object.values(parts).map((p) => p.status);
  const status = statuses.includes("Building") ? "Building" : statuses.every((s) => s === "Elite") ? "Elite" : "Need more data";
  return { status, parts, earlyWhiffs: full && actual.every((p) => p.strikes !== null) ? whiffs.filter((p) => Number(p.strikes) < 2).length : null, earlySwings: full && actual.every((p) => p.strikes !== null) ? swung.filter((p) => Number(p.strikes) < 2).length : null, sourceIds: window2 ? [...window2.sourceIds, ...full ? actual.map((p) => p.id) : []] : [], source: IDENTITY_SOURCE, definition: "Whiff% = swings and misses \xF7 swings \xB7 Baseball Savant", level };
}
function powerIdentity(window2, settings) {
  const rate = window2 ? window2.homeRuns / window2.atBats : null;
  const threshold = settings.elite_hr_rate;
  const status = rate === null || threshold == null ? "Need more data" : rate >= threshold ? "Elite" : "Building";
  const k = window2?.strikeouts;
  const ratio = window2 && k !== void 0 && k > 0 ? window2.homeRuns / k : null;
  return { status, rate, threshold: threshold ?? null, sourceIds: window2?.sourceIds ?? [], source: IDENTITY_SOURCE, chase: { homeRuns: window2?.homeRuns ?? null, strikeouts: k ?? null, ratio, target: settings.power_chase_ratio ?? null, met: window2 && k !== void 0 && settings.power_chase_ratio != null ? window2.homeRuns > 0 && window2.homeRuns >= k * settings.power_chase_ratio : null } };
}
function steerIdentity(pillars) {
  const judged = pillars.filter((p) => p.status !== "Need more data" && p.sourceIds.length && p.progress !== null && Number.isFinite(p.progress));
  const alternatives = judged.filter((p) => p.pillar === "speed" || p.pillar === "power");
  const satisfied = alternatives.some((p) => p.status === "Elite");
  const chosen = !satisfied && alternatives.length === 2 ? [...alternatives].sort((a, b) => Number(b.progress) - Number(a.progress))[0] : null;
  const required = judged.filter((p) => ["contact", "defense", "arm"].includes(p.pillar) || p === chosen);
  const weak = required.filter((p) => p.status === "Building").sort((a, b) => Number(a.progress) - Number(b.progress))[0] ?? null;
  return { focus: weak?.pillar ?? null, sourceIds: weak?.sourceIds ?? [], speedOrPower: satisfied ? "Satisfied" : chosen?.pillar ?? "Need more data", missing: pillars.filter((p) => p.status === "Need more data").map((p) => p.pillar), comparison: "Progress toward owner standards, not a prediction of attainability", reason: weak ? `Your judged ${weak.pillar} pillar is furthest below its owner standard. Work on it inside your existing safe plan.` : "Need more data to choose a development focus." };
}
function validHumanGrade(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 20 && value <= 80 && value % 5 === 0;
}

// supabase/functions/_shared/wic/goals/naturalFirst.ts
var NEAR_GRADE = [55, 60];
var NEAR_STAT_PCT = 0.2;
var GOAL_SHARE_MIN = 0.3;
var ELITE_GRADE = 65;
function distanceToElite(p) {
  if (p.elite) return 0;
  if (typeof p.grade === "number") return Math.max(0, ELITE_GRADE - p.grade) / ELITE_GRADE;
  return typeof p.statDistancePct === "number" ? p.statDistancePct : null;
}
function isNear(p) {
  if (p.elite) return false;
  if (typeof p.grade === "number") return p.grade >= NEAR_GRADE[0] && p.grade <= NEAR_GRADE[1];
  return typeof p.statDistancePct === "number" && p.statDistancePct <= NEAR_STAT_PCT;
}
function naturalFirstStrategy(i) {
  const goal = i.pillars.find((p) => p.pillar === i.chosen);
  const goalFar = !goal || !goal.elite && !isNear(goal);
  let near = i.pillars.filter((p) => p.pillar !== i.chosen && isNear(p));
  if (i.bodyMassTrend === "heavier") near = [...near].sort((a, b) => (b.pillar === "power" ? 1 : 0) - (a.pillar === "power" ? 1 : 0));
  near = near.length > 1 && i.bodyMassTrend !== "heavier" ? [...near].sort((a, b) => (distanceToElite(a) ?? 1) - (distanceToElite(b) ?? 1)) : near;
  const maintain = i.pillars.filter((p) => p.elite).map((p) => p.pillar);
  if (goalFar && near.length) {
    const primary = near[0].pillar;
    return {
      mode: "secure_natural",
      primary,
      goalShare: GOAL_SHARE_MIN,
      maintain,
      message: `We're securing your ${primary} first; you're close to elite. Your ${i.chosen} work continues every week.`
    };
  }
  return { mode: "goal_first", primary: i.chosen, goalShare: 1, maintain, message: `Your ${i.chosen} goal leads your plan.` };
}
var restrict = /\b(lose weight|weight loss|cut(ting)? calories|calorie (deficit|restriction)|diet down|drop (pounds|weight))\b/i;
function nutritionFocus(primary, age) {
  const minor = age == null || age < 18;
  const lines = primary === "power" ? ["Eat enough protein at every meal to support lean muscle.", "Fuel training days fully."] : primary === "speed" ? minor ? ["Eat balanced meals that fuel growth and sprint work."] : ["Keep a lean body composition with balanced meals."] : ["Fuel training with balanced meals."];
  if (minor) lines.push("Talk with a parent or professional before changing how you eat.");
  return lines.filter((l) => !(minor && restrict.test(l)));
}

// supabase/functions/_shared/wic/goals/developmentStrategy.ts
var LABEL = { contact: "contact", power: "home-run power", speed: "speed", arm: "arm", defense: "defense", pitching: "pitching" };
function chosenGoalPillar(goals) {
  const top = [...goals].sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99))[0];
  if (!top) return null;
  const c = String(top.category);
  return c === "hitting" ? top.intent === "power_hitting" ? "power" : "contact" : c === "speed" || c === "baserunning" ? "speed" : c === "fielding" ? "defense" : c === "throwing" ? "arm" : c === "pitching" ? "pitching" : null;
}
function developmentStrategy(i) {
  const judged = i.pillars.filter((p) => p.status !== "Need more data" && p.sourceIds.length > 0);
  const maintain = judged.filter((p) => p.status === "Elite").map((p) => p.pillar);
  const minor = i.age == null || i.age < 18;
  const sleep = `Sleep ${minor ? "9\u201310" : "8\u20139"} hours; recovery days stay soft so your work lands.`;
  if (!i.chosen) {
    return { mode: "no_goal", primary: null, chosenGoal: null, goalShare: 0, maintain, reason: "Pick a goal so your plan can lead with it.", nutrition: nutritionFocus("contact", i.age), sleep, sixWeekLine: "No goal chosen yet.", sourceIds: [] };
  }
  const states = judged.map((p) => ({ pillar: p.pillar, grade: p.grade, statDistancePct: p.grade == null && p.progress != null ? Math.max(0, 1 - p.progress) : null, elite: p.status === "Elite" }));
  const s = naturalFirstStrategy({ chosen: i.chosen, pillars: states, age: i.age, bodyMassTrend: i.bodyMassTrend ?? null });
  const primaryFact = judged.find((p) => p.pillar === s.primary);
  const keep = maintain.length ? ` Your elite ${maintain.map((p) => LABEL[p]).join(", ")} gets a maintenance dose.` : "";
  const reason = s.mode === "secure_natural" ? `We're securing your ${LABEL[s.primary]} first; you're close to elite. Your ${LABEL[i.chosen]} goal keeps at least ${Math.round(GOAL_SHARE_MIN * 100)}% of the goal work every week.${keep}` : `Your ${LABEL[i.chosen]} goal leads your plan.${keep}`;
  return {
    mode: s.mode,
    primary: s.primary,
    chosenGoal: i.chosen,
    goalShare: s.goalShare,
    maintain,
    reason,
    nutrition: nutritionFocus(s.primary, i.age),
    sleep,
    sixWeekLine: reason,
    sourceIds: s.mode === "secure_natural" && primaryFact ? [...primaryFact.sourceIds] : []
  };
}

// supabase/functions/_shared/wic/masteryPitchingStandards.ts
var base = [
  { key: "k_bb", dir: "min", value: 5 },
  { key: "first_pitch_strike_pct", dir: "min", value: 0.67 },
  { key: "two_ball_pct", dir: "max", value: 0.3 },
  { key: "whip", dir: "max", value: 1 },
  { key: "opp_avg", dir: "max", value: 0.2 },
  { key: "soft_contact_pct", dir: "min", value: 0.25 },
  { key: "scoring_pos_inning_pct", dir: "max", value: 0.25 },
  { key: "sb_per_game", dir: "max", value: 0.2 },
  { key: "opp_sb_success_pct", dir: "max", value: 0.6 },
  { key: "time_to_plate_s", dir: "max", value: 1.3 },
  { key: "pfp_clean_pct", dir: "min", value: 0.98 }
];
var bbKB = { pro: [0.3, 0.06], college: [0.32, 0.055], high_school: [0.35, 0.05], youth: [0.35, 0.05] };
var sbBase = [
  { key: "k_bb", dir: "min", value: 6 },
  { key: "whip", dir: "max", value: 0.85 },
  { key: "opp_avg", dir: "max", value: 0.17 },
  { key: "era", dir: "max", value: 1.25 },
  { key: "two_ball_pct", dir: "max", value: 0.3 },
  { key: "scoring_pos_inning_pct", dir: "max", value: 0.2 },
  { key: "sb_per_game", dir: "max", value: 0.3 },
  { key: "pfp_clean_pct", dir: "min", value: 0.98 }
];
function startingStandards(sport, level, overrides2 = {}) {
  let list2;
  if (sport === "baseball") {
    const [k, bb] = bbKB[level];
    list2 = [{ key: "k_pct", dir: "min", value: k }, { key: "bb_pct", dir: "max", value: bb }, ...base];
  } else {
    const hs = level === "high_school" || level === "youth";
    list2 = [{ key: "k_per_7", dir: "min", value: hs ? 12 : 10 }, { key: "bb_per_7", dir: "max", value: hs ? 1.2 : 1.5 }, ...sbBase];
  }
  return list2.map((s) => {
    const o = overrides2[`${sport}_${level}_${s.key}`];
    return typeof o === "number" && Number.isFinite(o) ? { ...s, value: o } : s;
  });
}

// supabase/functions/_shared/wic/masteryPitching.ts
function pitchingIdentity(games, settings, policy = OWNER_WINDOW_POLICY, sport = "baseball", level = null) {
  const std = level ? startingStandards(sport, level, settings) : [];
  const kMin = std.find((s) => s.key === "k_pct")?.value ?? null;
  const bbMax = std.find((s) => s.key === "bb_pct")?.value ?? null;
  const opportunities = [];
  let invalid = false;
  for (const g of [...games].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const groups = /* @__PURE__ */ new Map();
    for (const p of g.pitches) if (p.opportunity !== null && p.outcome) {
      const old = groups.get(p.opportunity) ?? [];
      old.push(p.outcome);
      groups.set(p.opportunity, old);
    }
    const numbered = [...groups.keys()].sort((a, b) => a - b);
    const derived = g.complete && numbered.length > 0 && numbered.every((n, i) => n === i + 1) && [...groups.values()].every((v) => v.length === 1) && g.pitches.every((p) => p.opportunity !== null);
    const count = derived ? numbered.length : g.battersFaced;
    if (count === null) {
      invalid = true;
      continue;
    }
    if (!Number.isSafeInteger(count) || count < 0) {
      invalid = true;
      continue;
    }
    if (derived && g.battersFaced !== null && g.battersFaced !== count) {
      invalid = true;
      continue;
    }
    for (let i = 1; i <= count; i++) opportunities.push({ id: `${g.id}:bf:${i}`, date: g.date, outcome: derived ? groups.get(i)?.[0] ?? null : null });
  }
  const windows = opportunityWindows(opportunities.length, policy);
  const completed = invalid ? [] : windows.filter((w) => w.complete).map((w) => {
    const rows2 = opportunities.slice(w.start - 1, w.end);
    const outcomesKnown = rows2.every((r) => r.outcome !== null);
    const k = outcomesKnown ? rows2.filter((r) => r.outcome === "K").length / rows2.length : null;
    const bb = outcomesKnown ? rows2.filter((r) => r.outcome === "BB").length / rows2.length : null;
    const hr = outcomesKnown ? rows2.filter((r) => r.outcome === "HR").length / rows2.length : null;
    const set = kMin != null && bbMax != null;
    const status = !outcomesKnown || !set ? "Need more data" : Number(k) >= Number(kMin) && Number(bb) <= Number(bbMax) ? "Elite" : "Building";
    return { ...w, status, k, bb, hr, outcomesKnown, sourceIds: rows2.map((r) => r.id), from: rows2[0]?.date, through: rows2[rows2.length - 1]?.date };
  });
  const latest = completed[completed.length - 1] ?? null;
  const size = opportunities.length < policy.transitionAt ? policy.initialSize : policy.laterSize;
  return { status: latest?.status ?? "Need more data", latest, completed, policy, totalBattersFaced: opportunities.length, completeHistory: !invalid, current: windows.find((w) => !w.complete) ?? { start: opportunities.length + 1, end: opportunities.length + size, size, sample: 0, complete: false }, reason: !level ? "Competition level is unknown." : sport === "softball" ? "Softball is judged stat by stat (per 7 innings) in the pitching section." : !latest?.outcomesKnown ? "Complete BF outcomes are needed." : "Source: completed pitching game opportunities." };
}

// src/lib/baserunning/homeToFirstGrade.ts
function computeHomeToFirstGrade(splitSec, hand, scaleRows) {
  return computeBeatenRunnerGrade(splitSec, hand, scaleRows);
}

// src/lib/throwing/throwVeloGrade.ts
var THROW_VELO_METRICS = {
  infield: "throw_velo_mph_infield",
  outfield: "throw_velo_mph_outfield",
  catcher: "throw_velo_mph_catcher"
};
var THROWING_SCALE_METRICS = Object.values(
  THROW_VELO_METRICS
);
function throwVeloMetric(context) {
  return THROW_VELO_METRICS[context];
}
function computeThrowVeloGrade(metric, context, value, scaleRows) {
  if (metric !== "throw_velo_mph") return null;
  const scaleMetric = throwVeloMetric(context);
  if (!scaleMetric) return null;
  return gradeFromScaleRow(value, scaleMetric, scaleRows, "no_play_time");
}

// src/lib/catching/popTimeGrade.ts
var CATCHER_POP_TIME_METRIC = "catcher_pop_time";
function computePopTimeGrade(popTimeSec, scaleRows, opts) {
  if (popTimeSec == null || !Number.isFinite(popTimeSec) || popTimeSec <= 0) {
    return { grade: null, missing: true, missing_reason: "no_play_time" };
  }
  if (!scaleRows.some((r) => r.metric === CATCHER_POP_TIME_METRIC)) {
    return { grade: null, missing: true, missing_reason: "no_scale_reference" };
  }
  const grade = rawToGrade(
    "pop_time",
    popTimeSec,
    opts?.sport ?? "baseball",
    opts?.age ?? 25
  );
  if (grade == null) {
    return { grade: null, missing: true, missing_reason: "no_scale_reference" };
  }
  return { grade, missing: false };
}

// supabase/functions/_shared/wic/growth/growthMode.ts
var GROWTH_MODE_RULE = {
  /** 2 cm ≈ 0.787 in; the doc states ¾ in. The ¾ in figure is the trigger. */
  inchTrigger: 0.75,
  /** "about 3 months" */
  windowDays: 92,
  /** "Growth Mode for 8 weeks" */
  activeDays: 56,
  version: "growth_mode_v2_height_only"
};

// supabase/functions/_shared/wic/phases/youthThrowing.ts
var PITCH_SMART_BANDS = [
  { label: "7\u20138", minAge: 0, maxAge: 8, dailyMax: 50, rest: [[1, 0], [21, 1], [36, 2]] },
  { label: "9\u201310", minAge: 9, maxAge: 10, dailyMax: 75, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "11\u201312", minAge: 11, maxAge: 12, dailyMax: 85, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "13\u201314", minAge: 13, maxAge: 14, dailyMax: 95, rest: [[1, 0], [21, 1], [36, 2], [51, 3], [66, 4]] },
  { label: "15\u201316", minAge: 15, maxAge: 16, dailyMax: 95, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [76, 4]] },
  { label: "17\u201318", minAge: 17, maxAge: 18, dailyMax: 105, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [81, 4]] },
  { label: "19\u201322", minAge: 19, maxAge: 22, dailyMax: 120, rest: [[1, 0], [31, 1], [46, 2], [61, 3], [81, 4], [106, 5]] }
];
function bandIndex(age) {
  const i = PITCH_SMART_BANDS.findIndex((b) => age >= b.minAge && age <= b.maxAge);
  return i < 0 ? PITCH_SMART_BANDS.length - 1 : i;
}
var PITCH_SMART_MAX_AGE = 22;
function isProLevel(level) {
  return /\b(pro|professional|free[_ ]?agent|mlb|milb|ausl)\b/i.test(level ?? "");
}
function pitchSmartApplies(age, level) {
  return age != null && age <= PITCH_SMART_MAX_AGE && !isProLevel(level);
}
function restDaysFor(band, pitches) {
  let d2 = 0;
  for (const [min, days] of band.rest) if (pitches >= min) d2 = days;
  return d2;
}
var GROWTH_RULE = {
  inchTrigger: GROWTH_MODE_RULE.inchTrigger,
  windowDays: GROWTH_MODE_RULE.windowDays,
  weeksPerInch: 8,
  evidence: "E3",
  staffLabel: "growth-adjusted pitching age",
  athleteLine: "You've grown fast, so we're keeping your arm's workload where a slightly younger arm would sit for a few weeks.",
  grounding: "Hammers rule. Published youth work names velocity, height and weight as possible injury predictors among young pitchers, and growth plates as the vulnerable tissue; the advice is to watch the pitcher who grows before his ligament catches up. The eight-week window is our own rule, not a published figure."
};

// supabase/functions/_shared/wic/phases/throwCount.ts
var THROW_WEIGHTS = {
  mound_pitch: 1,
  off_mound_high: 0.75,
  off_mound_low: 0.6,
  off_mound_other_pitch: 0.85,
  pickoff_high: 0.75,
  pickoff_low: 0.6,
  pickoff_no_throw: 0,
  warmup_catch: 0.25,
  pap_max_throw: 1.5,
  med_ball_throw: 0
};

// supabase/functions/_shared/wic/phases/nextThrowDate.ts
var dayMs = 864e5;
var ms = (d2) => Date.parse(`${d2}T00:00:00Z`);
var iso = (n) => new Date(n).toISOString().slice(0, 10);
function kindOfRow(r) {
  const t = String(r.throw_type ?? "").toLowerCase();
  if (/pick/.test(t)) return /no_?throw|footwork/.test(t) ? "pickoff_no_throw" : /low/.test(t) ? "pickoff_low" : "pickoff_high";
  if (/warm|catch_play/.test(t)) return "warmup_catch";
  if (String(r.source) === "pitching") return /off_?mound|flat/.test(t) ? "off_mound_high" : "mound_pitch";
  if (/quick_release|throwdown|crow_hop|pull_?down|velo/.test(t)) return "off_mound_high";
  return "off_mound_low";
}
function equivalentsByDay(rows2) {
  const by = /* @__PURE__ */ new Map();
  for (const r of rows2) {
    if (r.status && /skip|missed|cancel/i.test(String(r.status))) continue;
    const n = Number(r.count ?? 0);
    if (!(n > 0)) continue;
    const d2 = String(r.entry_date);
    by.set(d2, (by.get(d2) ?? 0) + THROW_WEIGHTS[kindOfRow(r)] * n);
  }
  for (const [d2, v] of by) by.set(d2, Math.round(v * 10) / 10);
  return by;
}
function nextThrowDate(age, level, rows2, today) {
  if (!pitchSmartApplies(age, level)) return null;
  const band = PITCH_SMART_BANDS[bandIndex(age)];
  let next = ms(today) + dayMs;
  for (const [d2, eq] of equivalentsByDay(rows2)) {
    if (d2 > today) continue;
    const rest = restDaysFor(band, Math.ceil(eq));
    next = Math.max(next, ms(d2) + (rest + 1) * dayMs);
  }
  return iso(next);
}

// src/lib/intelligence/masteryProjection.ts
var record = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
var list = (v) => Array.isArray(v) ? v.map(record) : [];
var sportRows = (v, sport) => list(v).filter((row) => row.sport === sport);
var PRO_LEVELS = ["pro", "professional", "mlb", "milb", "ausl", "indie_pro", "rookie", "low_a", "high_a", "aa", "aaa", "winter_ball", "foreign_league", "free_agent", "wpf", "npf", "academy_pro"];
var COLLEGE_LEVELS = ["college", "ncaa", "d1", "d2", "d3", "juco", "naia", "cape_cod", "summer_generic", "summer_ball"];
var HS_LEVELS = ["high_school", "high school", "hs", "hs_varsity", "hs_jv"];
var YOUTH_LEVELS = ["youth", "youth_rec", "youth_travel", "middle_school", "little_league", "travel", "rec", "academy_youth"];
function masteryLevelFor(raw) {
  const r = String(raw ?? "").toLowerCase();
  return PRO_LEVELS.includes(r) ? "pro" : COLLEGE_LEVELS.includes(r) ? "college" : HS_LEVELS.includes(r) ? "high_school" : YOUTH_LEVELS.includes(r) ? "youth" : null;
}
function projectMasterySources(raw, sport, settings) {
  const source = record(raw);
  const policy = areaWindowPolicy(settings, "batting");
  const events = list(source.atBats).map((e, i) => ({ id: String(e.id ?? ""), date: String(e.date ?? ""), order: i, result: typeof e.result === "string" ? e.result : null, source: typeof e.source === "string" ? e.source : "", pitchCount: typeof e.pitchCount === "number" ? e.pitchCount : null }));
  const batting = battingIdentity(events, policy);
  const speedEvidence = [];
  const add = (row, id, label2, measure, unit, value, grade) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) speedEvidence.push({ id, source: label2, date: String(row.date ?? ""), measure, unit, value, grade, kind: "measured", sample: 1, minimum: settings ? settings.speed_minimum_samples ?? 1 : null });
  };
  const metrics = PERFORMANCE_METRICS.filter((m) => m.category === "speed" && m.sports.includes(sport));
  for (const test of list(source.tests)) {
    const results = record(test.results);
    for (const metric of metrics) {
      const keys = metric.bilateral ? [`${metric.key}_left`, `${metric.key}_right`] : [metric.key];
      for (const key2 of keys) {
        const value = results[key2];
        add(test, `test:${test.id}:${key2}`, `Entered performance test \xB7 ${test.type}`, key2, metric.unit, value, typeof value === "number" ? rawToGrade(metric.key, value, sport) : null);
      }
    }
  }
  for (const row of list(source.sprints)) {
    const m = record(row.metrics);
    const value = m.time ?? m.seconds;
    add(row, `sprint:${row.id}`, "Logged sprint", `sprint ${row.distance ?? "unknown distance"} feet`, "seconds", value, null);
  }
  const context = record(source.context);
  const scales = list(source.scales);
  const rawLevel = String(context.level || context.leagueTier || "").toLowerCase();
  const level = masteryLevelFor(rawLevel);
  for (const row of list(source.homeFirst)) {
    const hand = row.side;
    const g = hand === "L" || hand === "R" ? computeHomeToFirstGrade(typeof row.seconds === "number" ? row.seconds : null, hand, scales) : null;
    add(row, `home-first:${row.id}`, `Game home-to-first \xB7 ${row.source}`, "home_to_first", "seconds", row.seconds, g && !g.missing ? g.grade : null);
  }
  const speedKeys = sport === "baseball" ? { "10y": "ten_yard_dash", "30y": "thirty_yard_dash", "60y": "sixty_yard_dash" } : { "7y": "seven_yard_dash", "20y": null, "40y": "forty_yard_dash" };
  for (const row of list(source.speedLab)) for (const [key2, metric] of Object.entries(speedKeys)) {
    const raw2 = record(row.distances)[key2];
    const values = Array.isArray(raw2) ? raw2 : [raw2];
    values.forEach((value, i) => add(row, `speed-lab:${row.id}:${key2}:${i}`, "Speed Lab test", key2, "seconds", value, metric && typeof value === "number" ? rawToGrade(metric, value, sport) : null));
  }
  for (const row of list(source.runs)) {
    add(row, `run:${row.id}`, `Game baserunning \xB7 ${row.source}`, String(row.type ?? "unknown run"), "seconds", row.seconds, null);
    add(row, `lead:${row.id}`, `Game baserunning \xB7 ${row.source}`, "steal lead", "steps", row.lead_steps, null);
  }
  for (const row of list(source.royal)) for (const key2 of ["timer1", "timer2", "master"]) {
    const timer = record(record(row.timers)[key2]);
    const elapsed = timer.elapsed;
    if (typeof elapsed === "number") add(row, `royal:${row.id}:${key2}`, `Royal timing \xB7 ${timer.wasSynced === true ? "video synced" : "manual timer"}`, key2, "seconds", elapsed / 1e3, null);
  }
  const counts = /* @__PURE__ */ new Map();
  for (const e of speedEvidence) {
    const key2 = `${e.source}:${e.measure}:${e.unit}`;
    const set = counts.get(key2) ?? /* @__PURE__ */ new Set();
    set.add(e.id);
    counts.set(key2, set);
  }
  const speed = speedIdentity(speedEvidence.map((e) => ({ ...e, sample: counts.get(`${e.source}:${e.measure}:${e.unit}`)?.size ?? 0 })), settings?.elite_grade ?? 65);
  const standards = hittingStandardsFor(sport, level, settings ?? {});
  const eliteGrade = settings?.elite_grade ?? 65;
  const power = powerIdentity(batting.latest, standards);
  if (sport === "softball") power.source = SOFTBALL_HITTING_SOURCE;
  const hrRate = power.rate;
  const goals = record(context.goals);
  const sportGoals = record(goals[sport]);
  const hittingRows = list(record(sportGoals.position).hitting);
  const powerGoal = hittingRows.some((g) => g.id === "oppo_power" || g.intent === "power_hitting") || list(goals.goals).some((g) => g.category === "hitting" && g.intent === "power_hitting");
  const traits = { speedy: speed.elite === true, lacksPower: hrRate !== null && standards.lacking_power_hr_rate != null && hrRate < standards.lacking_power_hr_rate, leftPower: context.bats === "L" && hrRate !== null && standards.left_power_hr_rate != null && hrRate >= standards.left_power_hr_rate, powerGoal: ["L", "S"].includes(String(context.bats)) && powerGoal, powerStatus: power.status, power: power.status === "Need more data" ? null : power.status === "Elite", battingWindow: batting.latest, lowAverage: standards.bunt_low_average ?? 0.3 };
  const defense = fieldingIdentity(list(source.defense).map((e, i) => ({ id: String(e.id ?? ""), date: String(e.date ?? ""), order: i, source: typeof e.source === "string" ? e.source : null, position: typeof e.position === "string" ? e.position : null, error: typeof e.error === "boolean" ? e.error : null, assist: typeof e.assist === "boolean" ? e.assist : null, putout: typeof e.putout === "boolean" ? e.putout : null })), areaWindowPolicy(settings, "defense"));
  const contact = contactIdentity(batting.latest, list(source.contactPitches).map((p) => ({ id: String(p.id ?? ""), atBatId: typeof p.atBatId === "string" ? p.atBatId : null, result: typeof p.result === "string" ? p.result : null, strikes: typeof p.strikes === "number" ? p.strikes : null, zone: typeof p.zone === "number" ? p.zone : null, outZone: typeof p.outZone === "string" ? p.outZone : null })), level, standards);
  if (sport === "softball") contact.source = SOFTBALL_HITTING_SOURCE;
  const position = String(context.position ?? "").toUpperCase();
  const normalizedPosition = ["P", "PITCHER"].includes(position) ? "pitcher" : ["C", "CATCHER"].includes(position) ? "catcher" : ["LF", "CF", "RF", "OF", "OUTFIELD"].includes(position) ? "outfield" : ["1B", "2B", "3B", "SS", "IF", "INFIELD"].includes(position) ? "infield" : null;
  const human = sportRows(source.humanGrades, sport).filter((g) => g.evaluator && ["coach_evaluated", "scout_evaluated"].includes(String(g.source)) && String(g.position ?? "").toUpperCase() === position);
  const judgeGrade = (grade) => grade === null ? "Need more data" : grade >= eliteGrade ? "Elite" : "Building";
  const fieldGrade = human.find((g) => validHumanGrade(g.defense));
  const defenseGrade = fieldGrade ? Number(fieldGrade.defense) : null;
  const defensePillar = { status: judgeGrade(defenseGrade), grade: defenseGrade, source: fieldGrade ? `${fieldGrade.source} \xB7 ${fieldGrade.date} \xB7 ${position}` : null, sourceIds: fieldGrade ? [String(fieldGrade.id)] : [], threshold: eliteGrade };
  const velocity = sportRows(source.throwing, sport).filter((r) => r.position === normalizedPosition && r.metric === "throw_velo_mph" && r.unit === "mph").map((r) => ({ id: r.id, source: r.source, date: r.date, grade: computeThrowVeloGrade(String(r.metric), String(r.position), typeof r.value === "number" ? r.value : null, scales) })).find((r) => r.grade && !r.grade.missing);
  const pop = normalizedPosition === "catcher" ? sportRows(source.catching, sport).filter((r) => ["pop_time", "catcher_pop_time", "pop_time_sec"].includes(String(r.metric)) && ["s", "seconds", "sec"].includes(String(r.unit))).map((r) => ({ id: r.id, source: r.source, date: r.date, grade: computePopTimeGrade(typeof r.value === "number" ? r.value : null, scales, { sport }) })).find((r) => !r.grade.missing) : null;
  const measurement = velocity ?? pop;
  const measurementGrade = measurement?.grade && !measurement.grade.missing ? measurement.grade.grade : null;
  const accuracy = human.find((g) => validHumanGrade(g.arm));
  const accuracyGrade = accuracy ? Number(accuracy.arm) : null;
  const suppliedDate = typeof source.date === "string" ? source.date : null;
  const today = suppliedDate && /^\d{4}-\d{2}-\d{2}$/.test(suppliedDate) && Number.isFinite(Date.parse(`${suppliedDate}T00:00:00Z`)) ? suppliedDate : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const health = record(source.health);
  const pain = list(health.pain).filter((p) => !p.date || String(p.date).slice(0, 10) === today);
  const injury = list(health.injury).filter((p) => !p.date || String(p.date).slice(0, 10) === today);
  const armWords = /arm|shoulder|elbow|forearm|wrist|hand/i;
  const activePain = pain.some((p) => Number(p.scale) > 0 && armWords.test(String(p.location))) || pain.some((p) => Object.entries(record(p.scales)).some(([k, v]) => armWords.test(k) && typeof v === "number" && v > 0)) || injury.some((p) => p.active === true && armWords.test(String(p.region)));
  const dob = typeof context.dateOfBirth === "string" ? new Date(context.dateOfBirth) : null;
  const now = new Date(today);
  const age = dob && Number.isFinite(dob.getTime()) ? now.getUTCFullYear() - dob.getUTCFullYear() - (now.getUTCMonth() < dob.getUTCMonth() || now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate() ? 1 : 0) : null;
  const ledger = list(health.ledger).map((r) => ({ entry_date: String(r.entry_date), source: String(r.source), throw_type: String(r.throw_type), count: typeof r.count === "number" ? r.count : null, status: typeof r.status === "string" ? r.status : null }));
  const yesterday = new Date(Date.parse(today) - 864e5).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.parse(today) + 864e5).toISOString().slice(0, 10);
  const historicalNext = nextThrowDate(age, typeof context.level === "string" ? context.level : null, ledger.filter((r) => r.entry_date < today), yesterday);
  const todayNext = nextThrowDate(age, typeof context.level === "string" ? context.level : null, ledger.filter((r) => r.entry_date === today), today);
  const ledgerFlag = historicalNext !== null && historicalNext > today || todayNext !== null && todayNext > tomorrow;
  const healthKnown = health.shared === true && (pain.length > 0 || injury.length > 0) && age !== null;
  const armGrade = measurementGrade !== null && accuracyGrade !== null ? Math.min(measurementGrade, accuracyGrade) : null;
  const arm = { status: activePain || ledgerFlag ? "Building" : !healthKnown ? "Need more data" : judgeGrade(armGrade), grade: armGrade, accuracyGrade, measurementGrade, activePain, ledgerFlag, healthKnown, sourceIds: [...measurement ? [String(measurement.id)] : [], ...accuracy ? [String(accuracy.id)] : []], source: measurement ? `${measurement.source} \xB7 ${measurement.date} \xB7 ${normalizedPosition}` : null, threshold: eliteGrade };
  const contactProgress = Object.values(contact.parts).filter((p) => p.value !== null && p.cutoff !== null).map((p) => p === contact.parts.zone ? Number(p.value) / Number(p.cutoff) : Number(p.value) === 0 ? 1 : Number(p.cutoff) / Number(p.value));
  const speedGrade = speed.evidence.length ? Math.max(...speed.evidence.map((e) => Number(e.grade))) : null;
  const pillarFacts = [{ pillar: "contact", status: contact.status, sourceIds: contact.sourceIds, progress: contactProgress.length ? Math.min(...contactProgress) : null }, { pillar: "defense", status: defensePillar.status, sourceIds: defensePillar.sourceIds, progress: defenseGrade !== null ? defenseGrade / eliteGrade : null }, { pillar: "arm", status: arm.status, sourceIds: arm.sourceIds, progress: armGrade !== null ? armGrade / eliteGrade : null }, { pillar: "speed", status: speed.status, sourceIds: speed.evidence.map((e) => e.id), progress: speedGrade !== null ? speedGrade / eliteGrade : null }, { pillar: "power", status: power.status, sourceIds: power.sourceIds, progress: hrRate !== null && standards.elite_hr_rate ? hrRate / standards.elite_hr_rate : null }];
  const steering = steerIdentity(pillarFacts);
  const strategy = developmentStrategy({ chosen: chosenGoalPillar(list(goals.goals)), age, pillars: pillarFacts.map((p) => ({ pillar: p.pillar, status: p.status, grade: p.pillar === "defense" ? defenseGrade : p.pillar === "arm" ? armGrade : p.pillar === "speed" ? speedGrade : null, progress: p.progress, sourceIds: p.sourceIds })) });
  const guidance = { ...masteryGuidance({ contactStatus: contact.status, contactSourceIds: contact.sourceIds, speedStatus: speed.status, powerStatus: power.status, leftPower: traits.leftPower, leftPowerGoal: traits.powerGoal }), observedFocus: strategy.mode === "secure_natural" && strategy.sourceIds.length ? strategy.primary : steering.focus, sourceIds: strategy.mode === "secure_natural" && strategy.sourceIds.length ? strategy.sourceIds : steering.sourceIds, reason: strategy.mode === "secure_natural" && strategy.sourceIds.length ? strategy.reason : steering.reason, alternativeReason: steering.speedOrPower === "Need more data" ? "Need more data for speed-or-power focus." : `Speed-or-power requirement: ${steering.speedOrPower}. ${steering.comparison}.` };
  const pitching = pitchingIdentity(list(source.pitcherGames).map((g) => ({ id: String(g.id), date: String(g.date), battersFaced: typeof g.battersFaced === "number" ? g.battersFaced : null, complete: g.complete === true, pitches: list(g.pitches).map((p) => ({ id: String(p.id), opportunity: typeof p.opportunity === "number" ? p.opportunity : null, outcome: typeof p.outcome === "string" ? p.outcome : null })) })), standards, areaWindowPolicy(settings, "pitching"), sport === "softball" ? "softball" : "baseball", level);
  return { batting, speed, traits, policy, settings, sport, recordedSpeedEvidence: speedEvidence, defense, defensePillar, contact, power, arm, guidance, steering, strategy, pitching, level, standardsSource: IDENTITY_SOURCE };
}
export {
  buildHammerDailyPlan,
  contextFromEnvelope,
  projectMasterySources,
  setOwnerPlanDrills,
  setWarmupStageOverrides
};
