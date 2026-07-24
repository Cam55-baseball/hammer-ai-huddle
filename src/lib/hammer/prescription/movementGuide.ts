/**
 * MovementGuide — canonical zero-prior-knowledge explanation for every
 * movement prescribed anywhere in Hammers Today.
 *
 * Every movement served on Hammers Today should expose one of these guides so
 * an athlete as young as 8 can read the card and know exactly:
 *   what — what the drill IS in plain English
 *   setup — the equipment, spacing, and body position
 *   goodRep — how a clean rep looks (self-checkpoints)
 *   badRep — the common ways it goes wrong
 *   feel — what "correct" feels like in your body
 *   whyToday — how this drill connects to the rest of today's plan
 *   nextLink — how this drill flows into the next card / block
 *   stopIf — safety stop rules
 *
 * Guides are keyed by movement slug OR normalized name so both the client-side
 * warm-up / EASS libraries and the server-side wk_movement_catalog can share
 * the same rendered explanation.
 */

export interface MovementGuide {
  readonly what: string;
  readonly setup: string;
  readonly goodRep: ReadonlyArray<string>;
  readonly badRep: ReadonlyArray<string>;
  readonly feel: string;
  readonly whyToday: string;
  readonly nextLink: string;
  readonly stopIf?: string;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ─── Guides keyed by canonical slug or normalized name ─────────────────────
const GUIDES: Record<string, MovementGuide> = {
  // ============ Neural priming / reaction drills ============
  wu_reaction_ball_wall: {
    what: "A small, uneven rubber ball is thrown at a wall. Because it is uneven, it bounces back in an unpredictable direction, and your job is to catch it before it hits the ground a second time.",
    setup: "Stand facing a solid wall, 6–10 feet away, with a reaction ball (a lumpy rubber ball about the size of a baseball). If you don't have one, a small rubber pinky ball or a lacrosse ball works. Feet shoulder-width apart, knees slightly bent, weight on the balls of your feet, hands open in front of your chest.",
    goodRep: [
      "Eyes track the ball the whole time — no blinking away.",
      "Your first movement is your hands going toward the ball, not away from it.",
      "You stay balanced — you shuffle to the ball, you don't fall into it.",
      "Two hands make the catch, soft and quiet.",
    ],
    badRep: [
      "Waiting flat-footed for the ball to come to you.",
      "Reaching with one hand and stabbing at it.",
      "Standing straight up — losing your athletic stance between throws.",
    ],
    feel: "Light on your feet, alert, the same way you feel when a pitch is about to be thrown or a batted ball is coming your way. Your hands should feel quick and your eyes should feel busy.",
    whyToday: "Wakes up your hand-eye timing and fires your fast-twitch nervous system before you go into speed, throwing, or hitting work. Cheap on the body, big on alertness.",
    nextLink: "Go straight into your speed or throwing block — your nervous system is now switched on and will get more out of each rep.",
    stopIf: "You roll an ankle, your shoulder pinches, or you feel dizzy from tracking.",
  },

  wu_reaction_drop_catch: {
    what: "A partner (or a wall drop) releases a ball without any warning and you catch it before the second bounce. Trains pure reaction time.",
    setup: "Partner stands 4–6 feet in front of you holding a tennis ball at shoulder height. You stand in an athletic stance — feet shoulder-width, knees soft, hands ready at chest height, eyes on the ball.",
    goodRep: [
      "You are still and quiet before the drop, but ready.",
      "First movement is a snap of the hand toward the ball.",
      "You catch it cleanly before it can bounce twice.",
      "Reset to stance immediately — no wasted movement.",
    ],
    badRep: [
      "Trying to guess when the drop is coming (fake-starts).",
      "Body tense — you cannot react when you're tight.",
      "Lunging forward and losing balance.",
    ],
    feel: "Relaxed but coiled — like a defender waiting to break on a ball.",
    whyToday: "Pure CNS wake-up. No load, big reaction benefit.",
    nextLink: "Move into fast-twitch work while the nervous system is hot.",
  },

  // ============ Speed / rhythm ============
  wu_wickets_low: {
    what: "You run at a controlled 75% speed over a line of low hurdles that are spaced perfectly for your natural stride. The wickets don't get jumped — they get run through. This teaches your legs to cycle in a clean rhythm.",
    setup: "Line up 8 mini-hurdles (6–8 inches tall) in a straight line, exactly 5 feet apart — about 40 feet total. If you have no hurdles, use rolled towels, shoes, or cones as markers. Give yourself a 10-yard jog-in before the first hurdle so you build speed cleanly.",
    goodRep: [
      "Jog in and hit the first hurdle at about 75% speed.",
      "Stay tall — chest up, eyes forward, arms drive front-to-back.",
      "Each foot lands cleanly between the hurdles.",
      "Knees pick straight up and the foot cycles down under your hip.",
    ],
    badRep: [
      "Reaching or stretching your stride to hit a hurdle.",
      "Looking down at your feet — always makes you slower.",
      "Landing on your heel, or landing on the hurdle itself.",
    ],
    feel: "Rhythmic and light — like your feet are ticking a metronome. If you feel choppy or heavy, back off the speed until the rhythm returns.",
    whyToday: "Teaches clean sprint mechanics without you having to think about them — the hurdle spacing does the coaching for you.",
    nextLink: "Now go into your sprint or acceleration work — you have a rhythm to keep.",
    stopIf: "You clip a hurdle in a way that jars your ankle or hip, or a hamstring or calf grabs.",
  },

  wu_a_skip: {
    what: "A running warm-up drill: you skip forward while driving one knee up to hip height and stepping down under your body. It's the shape of a good sprint stride, done at low speed.",
    setup: "Open space, 20 yards of turf or track. Feet under hips, tall posture.",
    goodRep: [
      "Skip rhythm — bounce-step, bounce-step.",
      "Front knee drives up to hip height, toe pulled up.",
      "Same-side arm swings up in sync (opposite arm on the down side).",
      "Foot lands directly under your hip, quiet and quick.",
    ],
    badRep: [
      "Kicking your foot out in front of your body.",
      "Bending forward at the waist.",
      "Slapping the foot down loudly.",
    ],
    feel: "Tall, springy, coordinated. Not a hard workout — a mechanics rehearsal.",
    whyToday: "Grooves the sprint stride cheap and clean.",
    nextLink: "Feeds directly into B-skip and sprint work.",
  },

  wu_b_skip: {
    what: "Same rhythm as A-skip, but as the knee drives up, you extend the lower leg out and paw it back down and under your body — teaching the leg to actively pull the ground behind you at full sprint.",
    setup: "Same as A-skip. 20 yards of open space.",
    goodRep: [
      "Skip → knee up → leg extends out → paw the ground down and back.",
      "Tall posture the whole time.",
      "Land under your hip, not in front of your body.",
    ],
    badRep: [
      "Kicking the foot out and letting it slap the ground.",
      "Losing the skip rhythm.",
      "Reaching forward with the foot instead of pawing back.",
    ],
    feel: "You are 'pulling the ground' backward under your body.",
    whyToday: "Locks in the pawing action of top-speed running.",
    nextLink: "Move to falling starts or sprints.",
  },

  wu_pogo_double: {
    what: "Short, stiff-ankled hops in place on two feet. Each hop is quick — the ground is 'hot' and you're only on it for a fraction of a second.",
    setup: "Feet hip-width, arms relaxed at your sides or bent at 90°. Soft flat surface (turf, gym floor, or grass).",
    goodRep: [
      "Ankles stay stiff — most of the bounce comes from your calves and Achilles.",
      "Ground contact is less than 0.2 seconds (like the floor is hot).",
      "Land in the same spot you took off from.",
      "Chest up, eyes forward.",
    ],
    badRep: [
      "Squatting between hops (that means the knees are absorbing, not the ankles).",
      "Long, floaty jumps.",
      "Landing on heels.",
    ],
    feel: "Springy and quick, like your Achilles is a coiled spring.",
    whyToday: "Wakes up the elastic system in your ankles and calves — the same system that powers first-step quickness.",
    nextLink: "Go into sprint or lateral work while the calves are primed.",
    stopIf: "Sharp pain in the shin, calf, or Achilles.",
  },

  wu_ankle_bounce_series: {
    what: "Rapid, low bounces on stiff ankles — a smaller and faster version of a pogo hop, meant purely to prime the ankle stiffness that makes you fast.",
    setup: "Feet hip-width, tall posture, arms relaxed.",
    goodRep: [
      "Bounces are tiny — 1–2 inches off the ground.",
      "Ankles do all the work — knees and hips barely move.",
      "Rhythm is fast and constant.",
    ],
    badRep: [
      "Big jumps.",
      "Bending the knees.",
      "Slow tempo.",
    ],
    feel: "Your calves and the arch of your foot 'wake up' — light and springy.",
    whyToday: "Primes the same tissue you'll use for first-step acceleration.",
    nextLink: "Line hops, then pogos, then sprints.",
  },

  // ============ ARM CARE (owned by throwing block on throwing days) ============
  wu_jband_full: {
    what: "A full circuit of light elastic-band exercises that wake up the rotator cuff and shoulder-blade muscles. This is the Alan Jaeger 'J-Band' chart — the gold standard of arm care.",
    setup: "Anchor a light J-Band (or a light resistance band) to a fence, pole, or door hinge at about chest height. Stand facing sideways so the band is level with your throwing arm.",
    goodRep: [
      "Go through the full chart — external rotation, internal rotation, scap pull, retractions, forward flexion.",
      "Every rep is slow, especially on the way back (the eccentric).",
      "Elbow stays at the correct height for each movement.",
      "Breathe out on the pull.",
    ],
    badRep: [
      "Snapping the band back fast.",
      "Using a heavy band — this is a wake-up, not a workout.",
      "Rushing through reps.",
    ],
    feel: "A gentle warmth in the back of the shoulder and the shoulder blade. You should never feel this in the front of the shoulder.",
    whyToday: "This is the entire arm-care allotment for your throwing day — the shoulder complex is now primed for real throws.",
    nextLink: "Straight into tennis-ball whip throws → underload → catch-play.",
    stopIf: "Sharp pain in the front of the shoulder or any elbow pinch — stop and message Hammer.",
  },

  wu_crossover_symmetry_full: {
    what: "A branded chart of band exercises (Crossover Symmetry) that hits the rotator cuff and scap stabilizers in a specific order. Same purpose as J-Band, different pattern.",
    setup: "Crossover bands anchored at chest height. Chest square to the anchor.",
    goodRep: [
      "Shoulder blades set FIRST — you feel them squeeze slightly — then the arms move.",
      "Slow, smooth reps, especially the return.",
      "Full range each rep — don't cheat the finish.",
    ],
    badRep: [
      "Arms firing before the shoulder blade sets.",
      "Any shrug — shoulders stay away from the ears.",
      "Fast, snappy reps.",
    ],
    feel: "The back of the shoulder and mid-back working. Front of the shoulder should stay quiet.",
    whyToday: "Complete arm-care activation before any throwing — this is your one and only arm-care block today.",
    nextLink: "Move into fast-object throws.",
    stopIf: "Any front-of-shoulder pain or elbow twinge.",
  },

  wu_prone_tyw: {
    what: "You lie face-down on a bench or floor and make the letters T, Y, and W with your arms while holding a light weight or nothing. Trains the muscles between your shoulder blades that keep the shoulder joint centered when you throw.",
    setup: "Lie face-down on a bench (or on the floor with a rolled towel under your forehead so you can breathe). Arms hang toward the floor, thumbs pointing up.",
    goodRep: [
      "T: arms straight out to the sides, thumbs up, squeeze shoulder blades.",
      "Y: arms overhead in a Y shape, thumbs up.",
      "W: elbows bent, upper arms straight out, forearms up — squeeze blades together.",
      "Slow, controlled, thumbs stay up the whole time.",
    ],
    badRep: [
      "Using momentum or arching your low back.",
      "Thumbs pointing down (loads the front of the shoulder wrong).",
      "Any weight over 3 lbs — this is activation, not strength.",
    ],
    feel: "Small burn between the shoulder blades. That's exactly right.",
    whyToday: "Primes the mid-back so your shoulder joint sits in its healthy position when you throw.",
    nextLink: "Straight into scap push-ups or band pulls.",
  },

  wu_er_at_90: {
    what: "You stand with your throwing-arm elbow bent to 90° and out to the side, and slowly rotate your forearm from parallel-to-the-ground up to overhead against light band tension. This trains the deep rotator cuff.",
    setup: "Anchor a light band at elbow height. Stand sideways so the band pulls across your body. Elbow bent 90°, upper arm out to the side at shoulder height, forearm parallel to the ground.",
    goodRep: [
      "Elbow stays exactly at shoulder height.",
      "Forearm rotates up smoothly.",
      "Slow return — 3 seconds on the way down.",
    ],
    badRep: [
      "Elbow drops or drifts down.",
      "Shoulder shrugs up toward the ear.",
      "Snapping the band on the return.",
    ],
    feel: "Deep in the back of the shoulder — small, controlled, warm.",
    whyToday: "Directly primes the muscles that decelerate your throwing arm — the ones that break down when you don't warm them up.",
    nextLink: "Feeds into T/Y/W or straight into throwing prep.",
    stopIf: "Any pinch in the front of the shoulder.",
  },

  wu_scap_pushup: {
    what: "A push-up where you keep your elbows locked straight and only move your shoulder blades — squeezing them together, then pushing them apart. Trains the muscle that stabilizes the shoulder blade against your ribcage.",
    setup: "Standard push-up position — hands under shoulders, body in a straight line from head to heels.",
    goodRep: [
      "Elbows stay LOCKED — no bend.",
      "Shoulder blades pinch together (chest drops slightly toward the floor).",
      "Then push the floor away — shoulder blades spread wide and your upper back rounds slightly.",
    ],
    badRep: [
      "Bending the elbows (that's a regular push-up).",
      "Hips sagging.",
      "Head dropping.",
    ],
    feel: "The muscle just below your armpit (serratus) working. That's the money muscle for throwers.",
    whyToday: "Locks the shoulder blade to the ribcage so your arm has a stable base to fire from.",
    nextLink: "Straight into T/Y/W or band face pulls.",
  },

  wu_face_pull_band: {
    what: "You pull a band at eye level toward your face while keeping your elbows high and rotating your hands so your thumbs point behind you. Trains the muscles that pull your shoulders into good posture.",
    setup: "Anchor a band at eye level. Grab both ends with palms facing down. Step back so the band is under light tension. Feet hip-width, tall posture.",
    goodRep: [
      "Elbows lead the pull and stay HIGH — at ear level.",
      "Hands finish by your ears with thumbs rotating back.",
      "Squeeze the back of your shoulders together at the end.",
      "Slow return.",
    ],
    badRep: [
      "Elbows dropping toward your ribs.",
      "Pulling to your chest instead of your face.",
      "Yanking with your low back.",
    ],
    feel: "Back of the shoulders and upper back working. Neck stays quiet.",
    whyToday: "Balances all the internal-rotation pull of throwing — protects your shoulder for the long haul.",
    nextLink: "Straight into throwing prep or arm-care cooldown.",
  },

  wu_forearm_pump: {
    what: "High-rep flexion and extension of the wrist against light resistance to flush blood into the forearm — the last accelerator of every throw.",
    setup: "Sit or stand with a light dumbbell (2–5 lbs) or a band. Forearm rests on your thigh, palm up for flexion / palm down for extension.",
    goodRep: [
      "Slow, full range each rep.",
      "Wrist is the only thing that moves — forearm stays still.",
      "High reps (20+) — this is a flush, not a strength lift.",
    ],
    badRep: [
      "Moving the elbow or shoulder.",
      "Heavy weight — that turns it into strength work.",
    ],
    feel: "A pump in the forearm and a warmth in the wrist.",
    whyToday: "The wrist is the last thing that moves in every throw — warming it prevents forearm strains.",
    nextLink: "Straight into throwing prep.",
  },

  // ============ Weightless coordination (WOST) ============
  wu_scarf_cross_body_catch: {
    what: "You toss a light silk scarf across your body from one hand to the other. Because a scarf floats slowly, your eyes and hands get a long moment to track and catch it — perfect for coordination.",
    setup: "Stand tall with one light silk scarf (or a napkin) in your RIGHT hand at hip level. Feet shoulder-width, hips facing forward. Hips STAY facing forward the entire drill — only the arms and ribcage rotate.",
    goodRep: [
      "Toss the scarf up and across your body toward your LEFT shoulder so it floats above your head.",
      "Reach across the midline of your body and catch it in your LEFT hand before it drops below your waist.",
      "Immediately toss it back across to the RIGHT.",
      "Slow and smooth — no missed catches.",
    ],
    badRep: [
      "Hips turning with the arms — the whole point is to isolate the upper body.",
      "Throwing so high the scarf hits the ceiling.",
      "Dropping the scarf and rushing to grab it off the floor.",
    ],
    feel: "Playful. This is a low-stress hand-eye drill — treat it like a game.",
    whyToday: "Trains cross-body coordination that transfers directly to hitting and throwing rhythm.",
    nextLink: "Move into a fast-twitch or throwing drill while the CNS is coordinated.",
  },

  // ============ Tennis-ball throws (EASS Tier 1) ============
  eass_tennis_ball_whip_bb: {
    what: "Throwing a tennis ball at full arm speed to a partner or wall. Because the ball weighs almost nothing, your arm has nothing to fight — so you teach the arm to fire FAST.",
    setup: "Partner or wall at 20–30 feet. Standard throwing setup — glove-side leg forward, back foot loaded, arms in your normal arm slot.",
    goodRep: [
      "Full arm circle — no shortening the back-side of the arc.",
      "Whip finish out in front — your hand ends up chasing the ball.",
      "Ball leaves your fingers cleanly — no wobble.",
      "Full body works together — this isn't an arm-only throw even though the ball is light.",
    ],
    badRep: [
      "Throwing at half-speed 'to save it' — the whole point is speed.",
      "Arm-only throwing — the ball is light so you can get away with it, but that defeats the drill.",
      "Short-arming the back-side of the throw.",
    ],
    feel: "Fast, clean, effortless. The arm should feel free.",
    whyToday: "Teaches the nervous system what fast feels like without any load. First step in the EASS throwing hierarchy.",
    nextLink: "Move into underload plyo throws (3.5 or 4 oz).",
    stopIf: "Any elbow or shoulder pinch.",
  },

  // Generic cool-down guide reused by arm-care cooldowns
  eass_cooldown_universal: {
    what: "A short arm-care cooldown after throwing: a stretch that opens the back of the shoulder (sleeper stretch), a cross-body stretch to lengthen the outside of the shoulder, and a light forearm massage to flush the working tissue.",
    setup: "Lie on your throwing-arm side (sleeper stretch), or stand tall for cross-body and forearm work. No equipment required.",
    goodRep: [
      "Sleeper stretch: lying on your throwing side, elbow bent 90°, gently push forearm toward the floor with the other hand.",
      "Cross-body: pull throwing arm across your chest with the opposite hand, elbow at shoulder height.",
      "Forearm massage: 2 minutes, thumb-press along the meat of the forearm.",
      "Long, slow exhales the whole time.",
    ],
    badRep: [
      "Forcing the sleeper stretch — you should feel a mild pull, never pain.",
      "Rushing — this is a downshift.",
    ],
    feel: "Warmth spreads through the back of the shoulder. Breathing slows down.",
    whyToday: "Downshifts the nervous system and helps the shoulder recover so tomorrow's arm feels fresh.",
    nextLink: "You're done for the day — hydrate and refuel.",
  },
};

/**
 * Look up a guide by slug (preferred) or by movement name (fallback).
 */
export function guideFor(slugOrName: string | null | undefined): MovementGuide | null {
  if (!slugOrName) return null;
  const direct = GUIDES[slugOrName];
  if (direct) return direct;
  const n = norm(slugOrName);
  if (GUIDES[n]) return GUIDES[n];
  // Try a name-based fallback via a small alias table.
  const aliases: Record<string, string> = {
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
    arm_care_cooldown: "eass_cooldown_universal",
  };
  const aliased = aliases[n];
  return aliased ? GUIDES[aliased] ?? null : null;
}
