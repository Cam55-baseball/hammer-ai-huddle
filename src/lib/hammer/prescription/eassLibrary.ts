/**
 * EASS — Elastic Arm Speed & Underload Throwing System
 *
 * Hammers Modality doctrine for throwing prescription. Velocity is a
 * whole-body skill: ground → leg → pelvis → torso → scapula → shoulder → arm →
 * hand → ball. Fast objects teach fast movement; overload is a rarely-used tool
 * that must be earned by health, phase, training age, and mechanics stability.
 *
 * Pure data + pure selectors. No I/O, no fabrication, no derived-view
 * substitution — every prescription originates from this file's canonical
 * pools and is filtered by real athlete signals from HammerAthleteContext.
 *
 * Safety supremacy:
 *   • Reported arm pain > any inferred readiness.
 *   • Injury (shoulder / UCL / elbow) suppresses overload + max-intent throws.
 *   • Game day = band prep + light catch only. No long-toss, no pulldowns,
 *     no overload.
 *   • Overload (> regulation weight) is off-limits for youth (< u16),
 *     softball pitchers (windmill overload is a wrist injury waiting to
 *     happen), and any athlete inside pre-season / in-season windows.
 *
 * Position awareness:
 *   • Baseball pitcher — full ramp with intent day, recovery day, throwing
 *     day, and non-throwing band-only day.
 *   • Softball windmill pitcher — dedicated windmill circle-of-power drills;
 *     no overhand overload; explicit wrist / lat / hip prep.
 *   • Catcher — pop-time footwork + blocked-throw transfer.
 *   • Infield — quick release + short arm circle.
 *   • Outfield — crow-hop + long-toss carry.
 */

export type EassSport = "baseball" | "softball";
export type EassPosition =
  | "pitcher"
  | "catcher"
  | "infield"
  | "outfield"
  | "utility"
  | "dh";

export type EassSeasonPhase = "off" | "pre" | "in" | "post";

export type EassIntensity = "prep" | "low" | "moderate" | "high" | "max";

export type EassCategory =
  | "band_prep"          // Tier 0 — neural / cuff / scap prep (daily-legal, non-fatiguing)
  | "tennis_ball"        // Tier 1 — fast object; teaches whip and finish out front
  | "underload"          // Tier 1 — 3.5oz / 4oz plyo balls, or lighter softballs
  | "regulation"         // Tier 2 — 5oz (baseball) or 11/12" softball catch-play
  | "long_toss"          // Tier 2 — extended distance carry
  | "pulldown"           // Tier 3 — intent-based downhill throws (baseball only)
  | "intent"             // Tier 3 — max-effort focused throws (velo work)
  | "overload"           // Tier 3 — 6oz+ baseballs (baseball only, gated)
  | "position_skill"     // Position-specific transfer (crow-hop, pop-time, etc.)
  | "windmill_circle"    // Softball pitcher — windmill mechanics + circle drills
  | "cooldown"           // Post-throw arm care + tissue
  | "recovery";          // Recovery-day only, low-CNS

export type EassMode =
  | "throwing_day_build"
  | "throwing_day_maintain"
  | "throwing_day_ramp"
  | "non_throwing_day"
  | "recovery_day"
  | "game_day_prep"
  | "arm_protected";

export interface EassDrill {
  name: string;
  category: EassCategory;
  setup?: string;
  dosage: string;
  cue: string;
  stopIf?: string;
  intensity: EassIntensity;
  overloadClass?: "under" | "regulation" | "over";
}

// -------------------------------------------------------------- BAND / NEURAL PREP

const BAND_PREP_BASEBALL: EassDrill[] = [
  { name: "J-Band series — ER / IR / scap pulls / retractions", category: "band_prep", intensity: "prep",
    setup: "light J-Band anchored at shoulder height",
    dosage: "ER 2x12, IR 2x12, scap pulls 2x12, retractions 2x10, forward flexion 2x10",
    cue: "slow, deliberate, no snap-backs — wake the cuff, do not train it" },
  { name: "Crossover Symmetry — activation series", category: "band_prep", intensity: "prep",
    setup: "crossover bands or J-Band, chest-height anchor",
    dosage: "full activation set: iron scap 2x10, reverse fly 2x10, external rotation 2x10, Y-T-W 2x8",
    cue: "shoulder blades set first, arms follow" },
  { name: "Wrist + forearm neural prep", category: "band_prep", intensity: "prep",
    dosage: "wrist circles 30s each way, pronation/supination 2x10, finger flicks 30s",
    cue: "warm the forearm before you ever load it" },
];

const BAND_PREP_SOFTBALL_WINDMILL: EassDrill[] = [
  { name: "Windmill-specific band prep — circle path activation", category: "band_prep", intensity: "prep",
    setup: "light band, anchored at hip height for windmill path",
    dosage: "hip-to-release path 2x10 each direction, ER 2x12, IR 2x12, lat pull-through 2x10",
    cue: "trace your circle path with the band — this is the shape your arm will make" },
  { name: "Wrist snap + forearm windmill prep", category: "band_prep", intensity: "prep",
    dosage: "wrist snaps 3x15, forearm rotation 2x12, finger flick sequence 30s",
    cue: "the wrist is your last accelerator — warm it or lose velo" },
  { name: "Lat + hip opener", category: "band_prep", intensity: "prep",
    dosage: "banded lat pull 2x10 per side, hip opener 2x8 per side",
    cue: "the windmill starts at the hip and finishes at the wrist" },
];

// -------------------------------------------------------------- TENNIS BALL (Tier 1)

const TENNIS_BALL_BASEBALL: EassDrill[] = [
  { name: "Tennis-ball whip throws — teach fast-object finish", category: "tennis_ball", intensity: "low", overloadClass: "under",
    setup: "partner or wall at 20-30ft",
    dosage: "3x8 throws with intent focus, full arm circle, finish out front",
    cue: "the ball is nothing — your whip is everything. Teach the arm to fire fast." },
  { name: "Rocker-step tennis-ball throws", category: "tennis_ball", intensity: "low", overloadClass: "under",
    dosage: "2x10 throws at 40ft, rocker-step tempo",
    cue: "load the back leg, transfer through, whip finish" },
];

const TENNIS_BALL_SOFTBALL: EassDrill[] = [
  { name: "Tennis-ball windmill whip", category: "tennis_ball", intensity: "low", overloadClass: "under",
    setup: "partner at 25-35ft",
    dosage: "3x10 windmill throws with tennis ball, focus on wrist snap at release",
    cue: "circle stays tight, release out front, wrist fires last" },
];

// -------------------------------------------------------------- UNDERLOAD (Tier 1)

const UNDERLOAD_BASEBALL: EassDrill[] = [
  { name: "3.5oz plyo — reverse throws (wall)", category: "underload", intensity: "low", overloadClass: "under",
    setup: "concrete wall, 8-10ft away, 3.5oz plyo ball",
    dosage: "2x8 reverse throws (arm slot decel work)",
    cue: "decelerate what you accelerate — this protects the back of the shoulder" },
  { name: "3.5oz plyo — pivot pickoff throws", category: "underload", intensity: "low", overloadClass: "under",
    dosage: "2x10 throws at 30-40ft",
    cue: "quick pivot, whip finish, teach arm speed with no weight to fight" },
  { name: "4oz plyo — connection throws", category: "underload", intensity: "moderate", overloadClass: "under",
    dosage: "2x8 throws at partner distance",
    cue: "torso and arm move as one — no arm-only throwing" },
];

const UNDERLOAD_SOFTBALL: EassDrill[] = [
  { name: "11\" softball — underload windmill", category: "underload", intensity: "low", overloadClass: "under",
    dosage: "2x10 windmill throws with 11\" (lighter) ball",
    cue: "same mechanics as game ball, just faster — the arm learns speed with less to fight" },
  { name: "Wrist-flick isolation throws", category: "underload", intensity: "low", overloadClass: "under",
    dosage: "2x12 short-distance flick throws",
    cue: "isolate the last accelerator — wrist fires cleanly at release" },
];

// -------------------------------------------------------------- REGULATION CATCH-PLAY (Tier 2)

function regulationBaseball(inSeason: boolean, isPitcher: boolean): EassDrill[] {
  return [
    { name: "Regulation warm-up toss (5oz)", category: "regulation", intensity: "low", overloadClass: "regulation",
      dosage: inSeason ? "60ft x 10 throws at 60%" : "60ft x 15 throws at 60%",
      cue: "tall posture, finish out front, build slow" },
    { name: "Regulation extension toss (5oz)", category: "regulation", intensity: "moderate", overloadClass: "regulation",
      dosage: inSeason ? "to 90ft x 10 throws at 75%" : "to 120ft x 12 throws at 75%",
      cue: "the ball rises off your fingers on a line — no rainbows",
      stopIf: "any elbow twinge, shoulder pinch, or forearm tightness — stop immediately" },
  ];
}

function regulationSoftball(inSeason: boolean): EassDrill[] {
  return [
    { name: "Regulation warm-up toss (12\" softball)", category: "regulation", intensity: "low", overloadClass: "regulation",
      dosage: inSeason ? "40ft x 10 throws at 60%" : "40ft x 15 throws at 60%",
      cue: "windmill path stays smooth, wrist finishes the throw" },
    { name: "Regulation extension toss", category: "regulation", intensity: "moderate", overloadClass: "regulation",
      dosage: inSeason ? "to 60ft x 10 throws at 75%" : "to 90ft x 12 throws at 75%",
      cue: "circle stays tight, release out front",
      stopIf: "any shoulder, elbow, or wrist pain — stop and report to Hammer" },
  ];
}

// -------------------------------------------------------------- LONG-TOSS (Tier 2)

function longTossBaseball(isOutfield: boolean): EassDrill[] {
  return [
    { name: "Long-toss extension (5oz)", category: "long_toss", intensity: "high", overloadClass: "regulation",
      dosage: `build to comfortable max (${isOutfield ? "300ft+" : "240ft+"} if cleared), ~15 throws total`,
      cue: "same effort, then same effort plus one — never chase distance",
      stopIf: "any twinge, command loss, or velo cliff — stop, pull back, message Hammer" },
  ];
}

function longTossSoftball(): EassDrill[] {
  return [
    { name: "Long-toss extension (windmill legal distance)", category: "long_toss", intensity: "moderate", overloadClass: "regulation",
      dosage: "build to ~150ft x 10 throws (overhand carry only — windmill max at 60ft)",
      cue: "if this is windmill, DO NOT crank the arm past comfortable distance",
      stopIf: "any wrist, elbow, or shoulder complaint — stop" },
  ];
}

// -------------------------------------------------------------- INTENT / PULLDOWNS (Tier 3)

const INTENT_BASEBALL: EassDrill[] = [
  { name: "Intent throws — pulldown phase (5oz)", category: "pulldown", intensity: "max", overloadClass: "regulation",
    setup: "walking the distance back in from long-toss max",
    dosage: "6-8 throws, walk in, do not exceed 90% perceived effort",
    cue: "quality over number — do not chase the gun",
    stopIf: "command loss, mechanics change, or any joint feedback — stop" },
];

const INTENT_SOFTBALL: EassDrill[] = [
  { name: "Windmill intent set — max-effort circle", category: "intent", intensity: "max", overloadClass: "regulation",
    dosage: "6-8 pitches at 90% intent from mound distance",
    cue: "trust your circle — mechanics before max",
    stopIf: "any shoulder / elbow / lat complaint — stop" },
];

// -------------------------------------------------------------- OVERLOAD (Tier 3, baseball only, heavily gated)

const OVERLOAD_BASEBALL: EassDrill[] = [
  { name: "6oz overload plyo — connection throws", category: "overload", intensity: "moderate", overloadClass: "over",
    setup: "6oz plyo ball, partner at 30-45ft",
    dosage: "2x6 throws, focus on staying connected — do NOT arm-only",
    cue: "the heavier ball punishes any arm-only throwing — feel the whole body work",
    stopIf: "any joint feedback whatsoever — stop, this is a bonus tool not a requirement" },
];

// -------------------------------------------------------------- POSITION SKILL

function positionSkillBaseball(pos: EassPosition, inSeason: boolean): EassDrill[] {
  switch (pos) {
    case "pitcher":
      return [
        { name: "Flat-ground command set", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: inSeason ? "20 throws to a target at 75%" : "30 throws, focus pitch + secondary at 80%",
          cue: "miss small, finish the pitch out front",
          stopIf: "command falls off or velo drops noticeably — stop" },
      ];
    case "catcher":
      return [
        { name: "Pop-time footwork (no throw)", category: "position_skill", intensity: "moderate", dosage: "8 reps",
          cue: "transfer first, throw second" },
        { name: "Block-to-throw rep", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: inSeason ? "6 game-rep throws" : "12 throws",
          cue: "low and balanced before you release",
          stopIf: "knee, hip, or shoulder pain — stop" },
      ];
    case "infield":
      return [
        { name: "Routine ground-ball throw", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: inSeason ? "10 throws at 80%" : "20 throws",
          cue: "footwork before arm, throw on plane" },
        { name: "Double-play / quick-release rep", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: inSeason ? "6 reps" : "12 reps",
          cue: "feet square the target, the arm follows" },
      ];
    case "outfield":
      return [
        { name: "Crow-hop throw to a base", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: inSeason ? "8 throws at 85%" : "15 throws",
          cue: "throw through the cutoff line, do not loop it",
          stopIf: "any shoulder or elbow grab — stop" },
        { name: "One-hop accuracy throw", category: "position_skill", intensity: "high", overloadClass: "regulation",
          dosage: "8 throws to a target",
          cue: "one-hop the cutoff, not the catcher" },
      ];
    default:
      return [
        { name: "Mixed-position throws", category: "position_skill", intensity: "moderate", overloadClass: "regulation",
          dosage: inSeason ? "10 throws" : "20 throws",
          cue: "match footwork to the position you're throwing from" },
      ];
  }
}

function positionSkillSoftball(pos: EassPosition, inSeason: boolean): EassDrill[] {
  if (pos === "pitcher") {
    return [
      { name: "Circle-of-power windmill drill", category: "windmill_circle", intensity: "moderate", overloadClass: "regulation",
        dosage: "3x8 windmill circles at 70%, focus on tight circle path",
        cue: "hand stays close to your body through the top of the circle" },
      { name: "K-drill (windmill mechanics)", category: "windmill_circle", intensity: "moderate", overloadClass: "regulation",
        dosage: "2x10 K-drill reps per set",
        cue: "back leg drives, front leg posts, arm circles behind — sequence not simultaneous" },
      { name: "Bullpen build (windmill)", category: "position_skill", intensity: "high", overloadClass: "regulation",
        dosage: inSeason ? "20 pitches at 75% mixing rise/drop/change" : "30 pitches building spin efficiency",
        cue: "spin first, velo second — the movement earns you the velo",
        stopIf: "wrist / elbow / shoulder / lat / hip complaint — stop" },
    ];
  }
  if (pos === "catcher") {
    return [
      { name: "Pop-time footwork (no throw)", category: "position_skill", intensity: "moderate", dosage: "8 reps",
        cue: "quick transfer, feet under you" },
      { name: "Throw-down rep to 2B", category: "position_skill", intensity: "high", overloadClass: "regulation",
        dosage: inSeason ? "6 throws" : "12 throws",
        cue: "low and balanced before you release",
        stopIf: "knee, hip, or shoulder pain — stop" },
    ];
  }
  if (pos === "infield") {
    return [
      { name: "Routine ground-ball throw", category: "position_skill", intensity: "high", overloadClass: "regulation",
        dosage: inSeason ? "10 throws" : "20 throws",
        cue: "footwork before arm" },
    ];
  }
  if (pos === "outfield") {
    return [
      { name: "Crow-hop throw to a base", category: "position_skill", intensity: "high", overloadClass: "regulation",
        dosage: inSeason ? "8 throws" : "15 throws",
        cue: "throw through the cutoff line" },
    ];
  }
  return [
    { name: "Mixed-position throws", category: "position_skill", intensity: "moderate", overloadClass: "regulation",
      dosage: inSeason ? "10 throws" : "20 throws",
      cue: "match footwork to the position you're throwing from" },
  ];
}

// -------------------------------------------------------------- COOLDOWN + RECOVERY

const COOLDOWN_UNIVERSAL: EassDrill[] = [
  { name: "Arm-care cooldown", category: "cooldown", intensity: "low",
    dosage: "sleeper stretch 2x30s per side, cross-body 2x30s, light forearm massage 2 min",
    cue: "long exhales, no straining the joint" },
];

const RECOVERY_ONLY: EassDrill[] = [
  { name: "Cuff/scap activation — low intensity", category: "recovery", intensity: "prep",
    dosage: "ER 1x10, IR 1x10, scap pulls 1x10 — recovery pace only",
    cue: "blood flow, not stimulus" },
  { name: "Wrist + forearm mobility flush", category: "recovery", intensity: "prep",
    dosage: "wrist circles 30s each way, forearm massage 90s per side",
    cue: "gentle — the point is to flush, not to work" },
  { name: "Sleeper + cross-body stretch", category: "recovery", intensity: "prep",
    dosage: "sleeper 2x30s per side, cross-body 2x30s",
    cue: "long exhales, relax into the stretch" },
];

// -------------------------------------------------------------- CONTEXT / DECISIONS

export interface EassContext {
  sport: EassSport;
  position: EassPosition;
  seasonPhase: EassSeasonPhase | null;
  ageYears: number | null;
  trainingAgeYears: number | null;
  injuryRegions: string[];      // e.g. ["shoulder", "elbow", "ucl"]
  armSore: boolean;             // athlete-reported today
  isGameDay: boolean;
  isThrowingDay: boolean;       // false = band prep + tennis-ball only
  isRecoveryDay: boolean;
  readinessScore: number | null; // 0-1
}

export interface EassPrescription {
  mode: EassMode;
  title: string;
  why: string;
  roadmapReason: string;
  drills: EassDrill[];
  cues: string[];
  stopRules: string[];
  durationMin: number;
  overloadUsed: boolean;
  softballWindmill: boolean;
}

const OVERLOAD_CUES = [
  "Overload is a tool, not a requirement — you earned it today.",
  "The heavy ball exposes any arm-only throwing. Stay connected.",
];

const UNIVERSAL_CUES = [
  "Footwork before arm — every throw.",
  "Build distance and intent, never start there.",
  "Fast objects teach fast movement. Underload before overload.",
];

const UNIVERSAL_STOP = [
  "Sharp pain anywhere in the arm — stop, ice, message Hammer.",
  "Elbow grab, shoulder pinch, or forearm tightness — stop the session.",
  "Sudden velo drop or command loss — stop, that's the body talking.",
];

/**
 * Overload eligibility gate. Overload is baseball-only, older-only,
 * off-season only, and blocked by any arm injury / soreness.
 */
function overloadEligible(ctx: EassContext): boolean {
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

/**
 * Pulldowns / max-intent are gated similarly but a step below overload.
 */
function intentEligible(ctx: EassContext): boolean {
  if (ctx.armSore) return false;
  if (ctx.injuryRegions.some((r) => ["shoulder", "elbow", "ucl"].includes(r))) return false;
  if (ctx.isGameDay) return false;
  if ((ctx.ageYears ?? 0) < 13) return false;
  if (ctx.seasonPhase === "in") return ctx.position === "pitcher"; // in-season pitcher bullpens only
  if ((ctx.readinessScore ?? 1) < 0.5) return false;
  return true;
}

/**
 * Build an EASS prescription. Deterministic — same context = same output.
 */
export function buildEassPrescription(ctx: EassContext): EassPrescription {
  const isSoftball = ctx.sport === "softball";
  const isPitcher = ctx.position === "pitcher";

  const armBlocked =
    ctx.injuryRegions.includes("shoulder") ||
    ctx.injuryRegions.includes("ucl") ||
    ctx.injuryRegions.includes("elbow") ||
    ctx.injuryRegions.includes("forearm");

  // ------------ Arm-protected mode (injury supremacy)
  if (armBlocked) {
    const drills: EassDrill[] = [
      ...(isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL).map((d) => ({
        ...d, dosage: d.dosage.replace(/2x/g, "1x"), cue: `${d.cue} — recovery pace today`,
      })),
      { name: "Sub-max catch play", category: "regulation", intensity: "low", overloadClass: "regulation",
        dosage: "10 min, never past comfortable distance, never past 70% intent",
        cue: "every throw is a check-in — does it feel the same as the last one?",
        stopIf: "any sharp pain, twinge, pinch, or velo cliff — stop now and message Hammer" },
      ...COOLDOWN_UNIVERSAL,
    ];
    return {
      mode: "arm_protected",
      title: `EASS Throwing — arm-protected (${isSoftball ? "windmill" : "overhand"})`,
      why: `Injury (${ctx.injuryRegions.join(", ")}) — no max throws today. Elastic prep + arm care only.`,
      roadmapReason: "Injury supremacy — reported pain overrides any inferred readiness.",
      drills, cues: [...UNIVERSAL_CUES, "Athlete-reported pain always outranks anything I infer."],
      stopRules: UNIVERSAL_STOP, durationMin: 22, overloadUsed: false, softballWindmill: isSoftball && isPitcher,
    };
  }

  // ------------ Recovery-only mode
  if (ctx.isRecoveryDay || (ctx.readinessScore ?? 1) < 0.4) {
    return {
      mode: "recovery_day",
      title: "EASS Throwing — recovery day",
      why: "Readiness signal is low — protect the arm, flush the tissues.",
      roadmapReason: "Recovery day — the elastic system rebuilds when you let it.",
      drills: RECOVERY_ONLY,
      cues: ["Recovery is training. Do it well.", "No throws today — the arm banks it."],
      stopRules: UNIVERSAL_STOP, durationMin: 15, overloadUsed: false, softballWindmill: isSoftball && isPitcher,
    };
  }

  // ------------ Game day — band prep + light catch only
  if (ctx.isGameDay) {
    const prep = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
    const lightCatch: EassDrill = {
      name: isSoftball ? "Game-day windmill warm-up toss" : "Game-day warm-up toss",
      category: "regulation", intensity: "low", overloadClass: "regulation",
      dosage: "60ft x 10 throws at 60% (build, never max)",
      cue: "save every real throw for the game",
      stopIf: "anything unusual — stop, tell your coach and Hammer",
    };
    return {
      mode: "game_day_prep",
      title: `EASS Throwing — game-day prep (${isSoftball ? "windmill" : "overhand"})`,
      why: "Game day. Only prep — the arm's real work is inside the lines today.",
      roadmapReason: "Game day suppresses long-toss, pulldowns, and overload. Neural prep only.",
      drills: [...prep, lightCatch, ...COOLDOWN_UNIVERSAL],
      cues: [...UNIVERSAL_CUES, "The game IS the training load today."],
      stopRules: UNIVERSAL_STOP, durationMin: 15, overloadUsed: false, softballWindmill: isSoftball && isPitcher,
    };
  }

  // ------------ Non-throwing day — band prep + tennis ball / underload only
  if (!ctx.isThrowingDay) {
    const prep = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
    const under = isSoftball ? [...TENNIS_BALL_SOFTBALL, ...UNDERLOAD_SOFTBALL.slice(0, 1)]
                             : [...TENNIS_BALL_BASEBALL, ...UNDERLOAD_BASEBALL.slice(0, 1)];
    return {
      mode: "non_throwing_day",
      title: `EASS Throwing — non-throwing (fast-object + neural)`,
      why: "Non-throwing day — feed the elastic system without accumulating throwing volume.",
      roadmapReason: "Fast objects daily; regulation catch-play on throwing days. This is how you build the arm year-round.",
      drills: [...prep, ...under, ...COOLDOWN_UNIVERSAL],
      cues: [...UNIVERSAL_CUES, "The band + tennis-ball day IS training — never skip it."],
      stopRules: UNIVERSAL_STOP, durationMin: 22, overloadUsed: false, softballWindmill: isSoftball && isPitcher,
    };
  }

  // ------------ Throwing day — full EASS stack
  const inSeason = ctx.seasonPhase === "in";
  const offSeason = ctx.seasonPhase === "off";
  const preSeason = ctx.seasonPhase === "pre";
  const postSeason = ctx.seasonPhase === "post";

  const prep = isSoftball ? BAND_PREP_SOFTBALL_WINDMILL : BAND_PREP_BASEBALL;
  const tennisBall = isSoftball ? TENNIS_BALL_SOFTBALL : TENNIS_BALL_BASEBALL;
  const underload = isSoftball ? UNDERLOAD_SOFTBALL : UNDERLOAD_BASEBALL;
  const regulation = isSoftball ? regulationSoftball(inSeason) : regulationBaseball(inSeason, isPitcher);
  const positionSkill = isSoftball ? positionSkillSoftball(ctx.position, inSeason)
                                   : positionSkillBaseball(ctx.position, inSeason);

  const drills: EassDrill[] = [...prep, ...tennisBall.slice(0, 1), ...underload.slice(0, offSeason ? 3 : 1), ...regulation];

  // Long-toss on off/pre only, always regulation weight
  if (offSeason || preSeason) {
    drills.push(...(isSoftball ? longTossSoftball() : longTossBaseball(ctx.position === "outfield")));
  }

  // Intent / pulldowns — heavily gated
  const intentOk = intentEligible(ctx);
  if (intentOk) {
    if (isSoftball && isPitcher) drills.push(...INTENT_SOFTBALL);
    else if (!isSoftball && (isPitcher || offSeason)) drills.push(...INTENT_BASEBALL);
  }

  // Overload — baseball only, off-season only, older/experienced only
  const overloadOk = overloadEligible(ctx);
  if (overloadOk) drills.push(...OVERLOAD_BASEBALL);

  drills.push(...positionSkill, ...COOLDOWN_UNIVERSAL);

  const posLabel = ctx.position;
  const seasonLabel = inSeason ? "in-season" : offSeason ? "off-season" : preSeason ? "pre-season" : postSeason ? "post-season" : "standard";
  const mode: EassMode = inSeason ? "throwing_day_maintain" : preSeason ? "throwing_day_ramp" : "throwing_day_build";

  const durationMin = inSeason ? 22 : offSeason ? 48 : preSeason ? 35 : postSeason ? 22 : 30;

  const cues = [...UNIVERSAL_CUES];
  if (overloadOk) cues.push(...OVERLOAD_CUES);
  if (isSoftball && isPitcher) cues.push("Windmill velo lives in the circle path — protect it.");

  return {
    mode,
    title: `EASS Throwing — ${seasonLabel} ${posLabel}${isSoftball && isPitcher ? " (windmill)" : ""}`,
    why: `Whole-body elastic ${isSoftball && isPitcher ? "windmill" : "throwing"} stack: band prep → fast-object → underload → regulation${offSeason || preSeason ? " → long-toss" : ""}${intentOk ? " → intent" : ""}${overloadOk ? " → overload" : ""} → position skill → cooldown.`,
    roadmapReason: `${seasonLabel.charAt(0).toUpperCase() + seasonLabel.slice(1)} — ${offSeason ? "build the elastic base now so you can spend it in season." : inSeason ? "maintain freshness; save max throws for competition." : preSeason ? "ramp intent week over week without overspend." : "protect the joint while staying connected."}`,
    drills, cues, stopRules: UNIVERSAL_STOP, durationMin,
    overloadUsed: overloadOk,
    softballWindmill: isSoftball && isPitcher,
  };
}

/**
 * Map an EASS position label from raw position codes stored on the profile.
 */
export function normalizePosition(pos: string | null | undefined): EassPosition {
  if (!pos) return "utility";
  const p = pos.toUpperCase();
  if (p === "P" || p === "PITCHER" || p === "SP" || p === "RP") return "pitcher";
  if (p === "C" || p === "CATCHER") return "catcher";
  if (["1B", "2B", "3B", "SS", "IF", "INFIELD"].includes(p)) return "infield";
  if (["LF", "CF", "RF", "OF", "OUTFIELD"].includes(p)) return "outfield";
  if (p === "DH" || p === "DESIGNATED_HITTER") return "dh";
  return "utility";
}

export function normalizeSport(sport: string | null | undefined): EassSport {
  const s = (sport ?? "").toLowerCase();
  if (s.includes("soft")) return "softball";
  return "baseball";
}
