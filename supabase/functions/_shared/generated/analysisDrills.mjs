// src/data/drills/doctrineDrills.ts
var d = (s) => ({
  id: s.id,
  name: s.name,
  category: s.category,
  sports: s.sports,
  subSkill: s.phase,
  level: s.level,
  fixes: s.fixes,
  setup: s.setup,
  steps: s.steps,
  cues: [s.cue],
  dosage: s.dosage,
  equipment: s.equipment,
  violationKeys: [s.faultKey],
  pieV2Signals: [],
  movementPatterns: [],
  phase: s.phase,
  feel: s.feel,
  feelWrong: s.feelWrong,
  commonMistake: s.mistake,
  source: s.source,
  videoUrl: null,
  ownerReview: "pending_owner_review",
  basis: s.basis ?? "doctrine_fix"
});
var BOTH = ["baseball", "softball"];
var HIT = "Owner doctrine \u2014 docs/HITTING-PHILOSOPHY.md";
var BP = "Owner pitching doctrine";
var TH = "Owner throwing doctrine";
var SP = "docs/SOFTBALL-PITCHING-DOCTRINE.md \u2014 SOURCED movement; any pass line PROPOSED";
var DOCTRINE_DRILLS = [
  // ── HITTING (baseball + softball) ───────────────────────────────────
  d({
    id: "doc.hit.back_leg_hold_stride",
    name: "Back-Leg Hold Stride",
    category: "hitting",
    sports: BOTH,
    faultKey: "hip_load_back_leg_not_balanced",
    phase: "Phase 1 \u2014 Create Balance",
    level: "feel",
    fixes: "Your back leg wasn't truly holding your weight, so your body drifted forward with the stride.",
    setup: "No bat needed. Stand sideways to a mirror (or have a partner watch you) in your normal batting stance, feet about shoulder-width apart.",
    steps: [
      "Slowly sit your weight into your back hip, like you're about to sit on a tall stool behind you.",
      "Check that most of your weight is now on your back foot \u2014 you should be able to lift your front heel easily.",
      "Take your normal stride forward with the front foot only.",
      "Freeze the moment your front foot touches the ground. Don't swing.",
      "Look in the mirror: your head and chest should still be over your back leg, not over your front foot."
    ],
    cue: "Fix the load, not the stride \u2014 get your weight truly settled on your back leg as you load.",
    feel: "Pressure deep in your back hip and back thigh as the front foot touches down, with your head staying put.",
    feelWrong: "Your head and belly move forward with the front foot, and the weight lands on the front leg.",
    mistake: "Reaching with the front foot and letting the whole body follow it. Check: if your head moved past the middle of your stance at landing, you lost the load.",
    dosage: "3 x 6",
    equipment: ["mirror"],
    source: HIT
  }),
  d({
    id: "doc.hit.knee_bend_hold",
    name: "Back-Knee Bend Hold",
    category: "hitting",
    sports: BOTH,
    faultKey: "back_knee_straightened_fail",
    phase: "Phase 1 \u2014 Create Balance",
    level: "iso",
    fixes: "Your back knee straightened before your front foot landed, so the load leaked out.",
    setup: "Bat in hand, ball on a tee in the middle of the plate. Get in your stance with your back knee softly bent, like an athlete ready to move.",
    steps: [
      "Sit into your back hip so you feel the back knee bend a little more.",
      "Take your stride, keeping that same amount of bend in the back knee the whole way.",
      "Hold the landing for a full breath \u2014 back knee still bent.",
      "Now swing and hit the ball off the tee."
    ],
    cue: "Keep the back knee bent until the swing starts.",
    feel: "Your back thigh and back glute working the whole way until your front foot lands.",
    feelWrong: "Your back leg goes stiff and tall, and you pop up out of your stance as you stride.",
    mistake: "Standing up as the front foot goes out. Check: if your head rose during the stride, your back knee straightened.",
    dosage: "3 x 6",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.back_pocket_hold",
    name: "Back-Hip Socket Hold",
    category: "hitting",
    sports: BOTH,
    faultKey: "back_hip_socket_hold_fail",
    phase: "Phase 2 \u2014 Gather",
    level: "feel",
    fixes: "Your back hip turned open before the swing started.",
    setup: "Bat in hand, ball on a tee in the middle of the plate, net in front of you. Normal stance.",
    steps: [
      "Load the bat back and lift or gather your front leg at the same time.",
      "As you do, feel your back hip pushed back into its socket \u2014 your back pocket points toward the catcher.",
      "Stride and land with your back pocket still pointing at the catcher.",
      "Only after your front foot is down, let the swing go."
    ],
    cue: "Back hip stays in its socket \u2014 holding or increasing \u2014 until Phase 4 starts.",
    feel: "A loaded, coiled feeling in your back glute at landing, like a spring that hasn't been let go yet.",
    feelWrong: "Your belt buckle already faces the pitcher when your front foot lands.",
    mistake: "Spinning the back hip forward during the stride. Check: at landing, a partner behind you should still see your back pocket.",
    dosage: "3 x 8",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.heel_down_freeze",
    name: "Heel-Down Stride Freeze",
    category: "hitting",
    sports: BOTH,
    faultKey: "front_heel_not_down_at_landing",
    phase: "Phase 3 \u2014 Load by Stride",
    level: "constraint",
    fixes: "Your front heel wasn't down when your stride landed.",
    setup: "Bat in hand, ball on a tee (or a partner ready to soft-toss from the side). Normal stance.",
    steps: [
      "Take a slow, deliberate stride.",
      "Put your whole front foot down \u2014 toes and heel both flat on the ground.",
      "Freeze for one count with the heel down. Don't swing yet.",
      "Swing from that planted front foot."
    ],
    cue: "Heel to the floor \u2014 it gives the back bicep a better path at the ball and keeps your eyes still.",
    feel: "Your whole front foot quiet and flat on the ground before anything turns.",
    feelWrong: "You're up on your front toes when you start swinging, and the ball seems to jump around.",
    mistake: "Landing on the toes and swinging right away. Check: if you can't freeze on a flat foot, the heel wasn't down.",
    dosage: "3 x 8",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.hands_above_elbow",
    name: "Hands-Above-Elbow Landing Check",
    category: "hitting",
    sports: BOTH,
    faultKey: "hands_below_back_elbow_at_heel_landing",
    phase: "Phase 3 \u2014 Load by Stride",
    level: "feel",
    fixes: "Your hands dropped below your back elbow when your front heel landed.",
    setup: "Bat in hand, standing sideways to a mirror so you can see your hands and back elbow.",
    steps: [
      "Get in your stance and take your stride.",
      "Freeze the moment your front heel lands.",
      "Look in the mirror: your hands should be higher than your back elbow.",
      "If they are, swing. If they aren't, reset and try again."
    ],
    cue: "Hands stay above the back elbow at landing \u2014 Phase 4 drops the barrel, not the stride.",
    feel: "Hands up and quiet as the heel lands, front shoulder still closed.",
    feelWrong: "Your hands sink toward your back shoulder or lower as you stride, and the bat feels heavy before you swing.",
    mistake: "Dropping the hands to 'get ready' during the stride. Check: freeze at landing and look \u2014 hands lower than the elbow means it happened.",
    dosage: "3 x 8",
    equipment: ["bat", "mirror"],
    source: HIT
  }),
  d({
    id: "doc.hit.glute_power_step",
    name: "Glute-Driven Power Step",
    category: "hitting",
    sports: BOTH,
    faultKey: "stride_body_gained_ground",
    phase: "Phase 3 \u2014 Load by Stride",
    level: "constraint",
    fixes: "Your body travelled forward with the stride instead of staying back.",
    setup: "Bat in hand, ball on a tee, net in front. Put a marker (a glove or piece of tape) where your front foot normally lands.",
    steps: [
      "Load into your back leg.",
      "Push your front foot out to the marker using your back glute \u2014 the foot moves, your body doesn't.",
      "Get the foot down on the marker early, as if the pitcher hasn't let go yet.",
      "Check that your head is still over your back half, then swing."
    ],
    cue: "Take a deliberate power step driven by the back glute \u2014 momentum does not play into your stride.",
    feel: "The foot goes, the body stays.",
    feelWrong: "You lunge at the marker and your head ends up over your front foot.",
    mistake: "Falling into the stride. Check: if you can't hold the landing still for a second, momentum took over.",
    dosage: "3 x 8",
    equipment: ["bat", "tee", "balls", "net", "marker"],
    source: HIT
  }),
  d({
    id: "doc.hit.bicep_leads_tee",
    name: "Bicep-Leads Tee",
    category: "hitting",
    sports: BOTH,
    faultKey: "hands_pass_elbow_early",
    phase: "Phase 4 \u2014 Hitter's Move",
    level: "feel",
    fixes: "Your hands moved ahead of your back elbow instead of the back bicep leading.",
    setup: "Bat in hand, ball on a tee, net in front. Start already in your landed stride with the front foot flat.",
    steps: [
      "From the landed position, keep your hands and the knob of the bat back.",
      "Start the swing by moving your back bicep (upper arm) forward toward the ball.",
      "Let your hands follow the elbow \u2014 they come last.",
      "Release the swing hard through the ball."
    ],
    cue: "From a planted foot, the back bicep starts forward while the knob stays back.",
    feel: "Your back elbow coming in first, then the barrel snapping through late and fast.",
    feelWrong: "Your hands push straight at the ball first and the swing feels long and slow.",
    mistake: "Throwing the hands at the ball. Check: if the knob of the bat moves before your back elbow does, the hands went early.",
    dosage: "3 x 10",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.planted_foot_turn",
    name: "Planted-Foot Turn",
    category: "hitting",
    sports: BOTH,
    faultKey: "post_landing_hip_drift_fail",
    phase: "Phase 4 \u2014 Hitter's Move",
    level: "constraint",
    fixes: "Your hips kept sliding forward after your front foot landed, instead of turning.",
    setup: "Bat in hand, ball on a tee, net in front. Start already in your landed stride.",
    steps: [
      "Set up in your landed stride with the front foot flat.",
      "Swing by turning your hips in place, like a door spinning on its hinge.",
      "Finish with your belt buckle facing the pitcher \u2014 but your hips shouldn't have moved forward."
    ],
    cue: "Once the foot lands, the hips turn \u2014 any drift after landing is causing an issue.",
    feel: "Spinning around your front leg, your belt buckle turning rather than moving forward.",
    feelWrong: "Your hips slide toward the pitcher and you finish leaning over your front foot.",
    mistake: "Sliding the hips forward to 'add power'. Check: put a bat on the ground just in front of your front hip \u2014 your hip shouldn't cross it.",
    dosage: "3 x 10",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.back_hip_drive",
    name: "Back-Hip Drive Turn",
    category: "hitting",
    sports: BOTH,
    faultKey: "p1_load_not_used",
    phase: "Phase 4 \u2014 Hitter's Move",
    level: "transfer",
    fixes: "You held your load but your back hip never drove the swing.",
    setup: "Bat in hand, a partner soft-tossing from the side, net in front of you.",
    steps: [
      "Load and hold your weight on your back leg.",
      "Stride and land with the front foot flat.",
      "Start the swing by driving your back hip forward and around \u2014 the hips lead the turn.",
      "Let the bat come through last."
    ],
    cue: "Drive from the back hip and turn it into the swing.",
    feel: "Your back hip firing first and pulling the swing through.",
    feelWrong: "Your arms and shoulders start the swing and your back hip is just along for the ride.",
    mistake: "Swinging with the arms only. Check: at the finish your back knee and back hip should face the pitcher.",
    dosage: "3 x 8",
    equipment: ["bat", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.chin_tuck_hold",
    name: "Chin-Tuck Contact Hold",
    category: "hitting",
    sports: BOTH,
    faultKey: "head_rises_before_contact",
    phase: "Phase 4 \u2014 Hitter's Move",
    level: "feel",
    fixes: "Your head came up before the ball was off the bat.",
    setup: "Bat in hand, ball on a tee, net in front. Normal stance.",
    steps: [
      "Tuck your chin slightly down toward your front shoulder.",
      "Swing through the ball.",
      "Keep your chin tucked and your eyes on the spot where the ball was until it's gone.",
      "Only then let your head come up."
    ],
    cue: "Chin stays tucked until the ball is off the bat \u2014 sinking is fine, coming up is not.",
    feel: "Your eyes still looking at the tee after the ball has already left.",
    feelWrong: "You see the ball flying into the net while your bat is still coming through.",
    mistake: "Lifting the head to watch where the ball went. Check: if you saw the ball's flight before you finished, your head came up early.",
    dosage: "3 x 10",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  d({
    id: "doc.hit.head_stays_back",
    name: "Head-Stays-Back Tee",
    category: "hitting",
    sports: BOTH,
    faultKey: "head_discipline_head_past_com",
    phase: "Phase 4 \u2014 Hitter's Move",
    level: "constraint",
    fixes: "Your head moved forward toward the ball during the swing.",
    setup: "Bat in hand, ball on a tee set a little deeper than normal (closer to the catcher), net in front.",
    steps: [
      "Stride and land with your head over the back half of your stance.",
      "Swing without letting your head move toward the ball.",
      "Let the ball come to you \u2014 the deeper tee makes you wait for it."
    ],
    cue: "Head stays back \u2014 let the ball come to you.",
    feel: "Seeing the ball deep and your head staying right where it was when you landed.",
    feelWrong: "Your head and chest lunge toward the ball and you hit it off the end of the bat.",
    mistake: "Chasing the ball with your head. Check: if your head finishes in front of your front knee, it went forward.",
    dosage: "3 x 8",
    equipment: ["bat", "tee", "balls", "net"],
    source: HIT
  }),
  // ── BASEBALL PITCHING ───────────────────────────────────────────────
  d({
    id: "doc.bp.closed_landing",
    name: "Closed-Landing Freeze",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "chest_open_at_landing",
    phase: "Landing",
    level: "feel",
    fixes: "Your chest was already facing home plate when your front foot landed.",
    setup: "Flat ground, no ball. Stand sideways like you're on the rubber, glove-side shoulder pointing at your target.",
    steps: [
      "Lift your front knee.",
      "Stride toward the target.",
      "Freeze the moment your front foot lands.",
      "Check: your chest should still face sideways and your front shoulder should still point at the target.",
      "Then turn and finish the throwing motion without a ball."
    ],
    cue: "Land sideways \u2014 the chest turns after the foot is down.",
    feel: "Your front shoulder still aimed at the target as your foot touches down.",
    feelWrong: "Your chest and logo already face the target at landing, and your arm feels like it's dragging behind.",
    mistake: "Turning the shoulders during the stride. Check: freeze at landing \u2014 if you can see the target straight ahead with both eyes over your chest, you opened early.",
    dosage: "3 x 6",
    equipment: [],
    source: BP
  }),
  d({
    id: "doc.bp.lift_and_go",
    name: "Lift-and-Go Rhythm",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "hang_at_peak_lift",
    phase: "Leg lift",
    level: "timing",
    fixes: "You paused at the top of your leg lift.",
    setup: "Flat ground, a partner or net at a comfortable throwing distance, a few balls.",
    steps: [
      "Start your delivery and lift your front knee.",
      "The moment your knee reaches the top, start moving toward the target \u2014 no stopping.",
      "Stride, land and throw in one smooth motion."
    ],
    cue: "Keep the move going once the knee gets up.",
    feel: "One continuous move from lift to landing, no pause at the top.",
    feelWrong: "You balance at the top for a moment, then have to restart to go forward.",
    mistake: "Holding the balance point. Check: if a partner can say 'stop' at the top of your lift before you move, you're hanging.",
    dosage: "3 x 8",
    equipment: ["balls", "net"],
    source: BP
  }),
  d({
    id: "doc.bp.stack_and_track",
    name: "Stack-and-Track Line Throws",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "not_stacked_at_release",
    phase: "Release",
    level: "constraint",
    fixes: "Your shoulders or eyes tipped off line when you let go of the ball.",
    setup: "Lay a strip of tape (or a rope) on the ground straight from where you stand to your target. Balls and a partner or net.",
    steps: [
      "Stand at the start of the line.",
      "Stride with your front foot landing on the line.",
      "As you throw, keep your shoulders level and your eyes level \u2014 like a tray of drinks you can't spill.",
      "Finish with your body still moving along the line."
    ],
    cue: "Keep your shoulders and your eyes level so your whole body throws on one line.",
    feel: "Like throwing down a narrow hallway \u2014 nothing tipping sideways.",
    feelWrong: "Your head falls off to the glove side and the ball sails or cuts.",
    mistake: "Tilting the head sideways at release. Check: if you finish off the line or your eyes aren't level at release, you weren't stacked.",
    dosage: "3 x 8",
    equipment: ["balls", "tape", "net"],
    source: BP
  }),
  d({
    id: "doc.bp.landing_balance",
    name: "Landing Balance Hold",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "head_outside_base_at_landing",
    phase: "Landing",
    level: "iso",
    fixes: "Your head was outside your feet when your front foot landed.",
    setup: "Flat ground, no ball. Start sideways like you're on the rubber.",
    steps: [
      "Lift and stride.",
      "Land and hold still for two seconds with your head between your two feet.",
      "If you wobble or have to step, reset and try again.",
      "Once the hold is steady, finish the throwing motion."
    ],
    cue: "Land with your head over your legs.",
    feel: "Balanced between both feet, able to hold the landing perfectly still.",
    feelWrong: "You fall toward the glove side or forward and can't hold the landing.",
    mistake: "Leaning the head out past the front foot. Check: picture a box around your two feet \u2014 your head should be inside it.",
    dosage: "3 x 6",
    equipment: [],
    source: BP
  }),
  d({
    id: "doc.bp.glove_swivel",
    name: "Glove Swivel Mirror",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "glove_flies_open",
    phase: "Landing to release",
    level: "feel",
    fixes: "Your glove flew open instead of turning over and tucking in.",
    setup: "Stand facing a mirror, no ball, glove on.",
    steps: [
      "Stride with your glove reaching out in front toward the target.",
      "As your foot lands, turn the glove over so your pinky points toward your body.",
      "Pull the glove into your chest, inside your shoulders, as your throwing arm comes through."
    ],
    cue: "Turn it over, pinky to your body, and keep it inside your shoulders.",
    feel: "Your glove side firm and tucked into your chest.",
    feelWrong: "Your glove arm swings out wide behind you and your front shoulder pulls open.",
    mistake: "Yanking the glove down and away. Check: in the mirror, the glove should finish in front of your chest, not out by your hip.",
    dosage: "3 x 8",
    equipment: ["mirror", "glove"],
    source: BP
  }),
  d({
    id: "doc.bp.finish_the_push",
    name: "Finish-the-Push Drag",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "drag_line_long_or_crooked",
    phase: "Release to finish",
    level: "feel",
    fixes: "Your back-foot drag line was crooked or too long, so the push didn't go straight at the target.",
    setup: "A dirt mound or flat ground where your back toe can leave a mark. Balls and a partner or net.",
    steps: [
      "Throw a normal pitch.",
      "Let your back foot push off and drag naturally \u2014 don't lift it on purpose.",
      "After the throw, look at the mark your back toe left.",
      "Aim for a short line that points straight at the target. Adjust your push and throw again."
    ],
    cue: "Push straight at the target and let the back foot follow.",
    feel: "Your back leg pushing you straight toward the target, not sideways.",
    feelWrong: "Your back foot swings around to the side and the mark curves away from the target.",
    mistake: "Spinning off the back foot. Check: if the drag mark curves or points away from the target, your push went sideways.",
    dosage: "3 x 8",
    equipment: ["balls", "net"],
    source: BP
  }),
  d({
    id: "doc.bp.eyes_locked",
    name: "Eyes-Locked Lift",
    category: "pitching",
    sports: ["baseball"],
    faultKey: "eyes_off_target_at_peak_lift",
    phase: "Leg lift",
    level: "feel",
    fixes: "Your eyes left the target at the top of your leg lift.",
    setup: "Flat ground, a partner holding a glove as your target. No ball to start.",
    steps: [
      "Lock your eyes on your partner's glove.",
      "Lift your front knee and keep looking at the glove the whole time.",
      "Stride and finish the motion without ever looking away.",
      "Once that feels easy, add a ball."
    ],
    cue: "Eyes stay on the target the whole lift.",
    feel: "Your head still and your eyes never leaving the glove.",
    feelWrong: "Your head turns toward second base or down at the ground as your knee comes up.",
    mistake: "Turning the head with the leg lift. Check: have your partner hold up fingers during your lift \u2014 if you can't say how many, your eyes left.",
    dosage: "3 x 8",
    equipment: ["balls", "glove"],
    source: BP
  }),
  // ── THROWING (baseball + softball) — proposed drill shapes ──────────
  d({
    id: "doc.th.land_then_turn",
    name: "Land-Then-Turn Partner Throws",
    category: "throwing",
    sports: BOTH,
    faultKey: "early_shoulder_rotation",
    phase: "Landing",
    level: "timing",
    fixes: "Your shoulders turned before your front foot landed.",
    setup: "A partner a comfortable throwing distance away. Stand sideways, glove-side shoulder pointing at your partner.",
    steps: [
      "Step toward your partner with your front foot.",
      "Keep your shoulders sideways until that foot is flat on the ground.",
      "Only then turn your shoulders and throw.",
      "Say 'land' in your head as the foot hits, then 'turn' as you throw."
    ],
    cue: "Land, then turn.",
    feel: "A quick pause-and-snap: foot down, then the shoulders whip through.",
    feelWrong: "Your chest faces your partner before your foot lands and the throw feels all arm.",
    mistake: "Turning and stepping at the same time. Check: if your partner sees your chest before your foot lands, you turned early.",
    dosage: "3 x 10",
    equipment: ["balls", "glove"],
    source: TH,
    basis: "proposed_shape"
  }),
  d({
    id: "doc.th.line_up_landing",
    name: "Line-Up Landing Throws",
    category: "throwing",
    sports: BOTH,
    faultKey: "shoulders_not_aligned",
    phase: "Landing",
    level: "constraint",
    fixes: "Your feet and shoulders weren't lined up at your target when you landed.",
    setup: "Lay a strip of tape (or a rope) on the ground pointing straight at your partner. Stand at the start of it, sideways.",
    steps: [
      "Put both feet on the line.",
      "Step forward and land your front foot on the line.",
      "Check that your front shoulder points straight down the line at your partner.",
      "Throw along the line."
    ],
    cue: "Feet and shoulders lined up at the target when you land.",
    feel: "Everything \u2014 feet, hips, shoulder \u2014 pointing the same way as the throw.",
    feelWrong: "Your front foot lands off to one side and you have to throw across your body.",
    mistake: "Stepping off the line. Check: look down after the throw \u2014 your front foot should be on the tape.",
    dosage: "3 x 10",
    equipment: ["balls", "tape", "glove"],
    source: TH,
    basis: "proposed_shape"
  }),
  d({
    id: "doc.th.back_leg_drive",
    name: "Back-Leg Drive to Target",
    category: "throwing",
    sports: BOTH,
    faultKey: "back_leg_not_facing_target",
    phase: "Landing",
    level: "feel",
    fixes: "Your back leg wasn't driving toward the target as you landed.",
    setup: "A partner a comfortable throwing distance away. Stand sideways, glove-side shoulder at your partner.",
    steps: [
      "Push off your back leg toward your partner.",
      "As you throw, let your back knee and back foot turn so they face your partner.",
      "Finish with your back knee pointing at your partner."
    ],
    cue: "Drive the back leg at the target.",
    feel: "Your back hip and knee coming through toward where the ball is going.",
    feelWrong: "Your back leg stays stuck behind you, pointing sideways, and the throw is all upper body.",
    mistake: "Leaving the back leg behind. Check: at the finish, if your back knee points away from your partner, it didn't drive.",
    dosage: "3 x 10",
    equipment: ["balls", "glove"],
    source: TH,
    basis: "proposed_shape"
  }),
  // ── SOFTBALL WINDMILL ───────────────────────────────────────────────
  d({
    id: "doc.sp.sprinter_start",
    name: "Sprinter-Start Hold",
    category: "pitching",
    sports: ["softball"],
    faultKey: "windup_not_sprinter_position",
    phase: "Wind-up",
    level: "iso",
    fixes: "You weren't in a sprinter-like position at the end of your wind-up.",
    setup: "Stand on the rubber (or a line on flat ground), no ball, facing home plate.",
    steps: [
      "Do your wind-up.",
      "At the end of it, stop and hold: both knees bent, back heel up off the ground, a slight lean forward, chest square to the plate.",
      "Hold for two seconds \u2014 you should feel ready to sprint.",
      "Push off from the hold toward the plate."
    ],
    cue: "Get into your sprinter's start \u2014 square to the plate, ready to push.",
    feel: "Loaded like a sprinter in the blocks, your body and your drive shin leaning together.",
    feelWrong: "You're standing tall with straight legs and flat feet, with nothing to push from.",
    mistake: "Standing up at the end of the wind-up. Check: if your back heel is on the ground and your knees are straight, you're not in the sprinter's start.",
    dosage: "3 x 6",
    equipment: [],
    source: SP
  }),
  d({
    id: "doc.sp.push_off_drive",
    name: "Push-Off Drive",
    category: "pitching",
    sports: ["softball"],
    faultKey: "no_drive_leg_extension",
    phase: "Stride",
    level: "constraint",
    fixes: "Your drive leg didn't push hard off the rubber.",
    setup: "On the rubber or a line on flat ground, no ball to start.",
    steps: [
      "Get into your sprinter's start.",
      "Push off hard with your drive leg, like jumping forward off a starting block.",
      "Straighten that leg all the way \u2014 hip, knee and ankle \u2014 behind you.",
      "Keep your chest facing the plate as you travel. Add a ball once the push feels strong."
    ],
    cue: "Push away from the mound with the whole drive leg.",
    feel: "Your drive leg finishing long and straight behind you as you travel.",
    feelWrong: "You step forward instead of pushing, and the drive leg stays bent.",
    mistake: "Stepping out without pushing. Check: if your drive leg never straightens behind you, the push didn't happen.",
    dosage: "3 x 6",
    equipment: [],
    source: SP
  }),
  d({
    id: "doc.sp.power_line_landing",
    name: "Power-Line Landing",
    category: "pitching",
    sports: ["softball"],
    faultKey: "stride_foot_off_power_line",
    phase: "Stride foot contact",
    level: "constraint",
    fixes: "Your stride foot landed pointing off the power line.",
    setup: "Lay tape (or chalk) in a straight line from the middle of the rubber to home plate \u2014 this is your power line. Balls and a catcher or net.",
    steps: [
      "Pitch down the power line.",
      "Land your stride foot on the line, turned slightly toward your throwing-arm side.",
      "Finish the pitch.",
      "Look down: your stride foot should be on the line, angled a little to your throwing side."
    ],
    cue: "Land on the power line with the foot turned slightly to your throwing side.",
    feel: "A firm front side that lets your hips work, not a foot that blocks you or flies open.",
    feelWrong: "Your stride foot lands way across the line or pointing straight at the plate, and your hips get stuck.",
    mistake: "Landing off the line. Check the mark after each pitch \u2014 if the foot is off the tape, adjust the next one.",
    dosage: "3 x 8",
    equipment: ["tape", "balls", "net"],
    source: SP
  }),
  d({
    id: "doc.sp.close_circle",
    name: "Close-Circle Arm Path",
    category: "pitching",
    sports: ["softball"],
    faultKey: "arm_path_away_from_body",
    phase: "Stride to acceleration",
    level: "feel",
    fixes: "Your arm drifted away from your body during the circle.",
    setup: "A partner a short distance away. Pitch at half speed.",
    steps: [
      "Make your arm circle with the arm staying close to your body, like a wheel turning right next to your side.",
      "Keep it close as it comes down toward release.",
      "Let your arm brush past your hip as you release."
    ],
    cue: "Keep the arm close to your body through the circle.",
    feel: "Your arm brushing past your body rather than swinging wide.",
    feelWrong: "Your arm swings out wide away from your side and the ball misses left or right.",
    mistake: "Swinging the arm wide for 'more speed'. Check: if you don't feel your arm brush your hip at release, it drifted out.",
    dosage: "3 x 10",
    equipment: ["balls"],
    source: SP
  }),
  d({
    id: "doc.sp.power_line_back_leg",
    name: "Back Leg on the Line",
    category: "pitching",
    sports: ["softball"],
    faultKey: "back_leg_off_power_line",
    phase: "Acceleration",
    level: "constraint",
    fixes: "Your back leg drifted off the power line as you came through.",
    setup: "Lay tape (or chalk) in a straight line from the middle of the rubber to home plate. Balls and a catcher or net.",
    steps: [
      "Pitch down the power line.",
      "As you release, let your back leg follow the line forward.",
      "After the pitch, look at where your back foot finished.",
      "It should be close to the line. If it swung off to the side, try again."
    ],
    cue: "Back leg stays close to the power line.",
    feel: "Everything travelling straight at the plate.",
    feelWrong: "Your back leg swings out to the side and you spin off the mound.",
    mistake: "Letting the back leg swing around. Check: if your back foot finishes well off the tape, it left the line.",
    dosage: "3 x 8",
    equipment: ["tape", "balls", "net"],
    source: SP
  })
];

// src/data/drills/fieldRunningDrills.ts
var FIELD_RUNNING_DRILLS = [
  {
    id: "elite.field.soft_hands_funnel",
    name: "Soft-hands ground-ball funnel",
    category: "fielding",
    sports: ["baseball", "softball"],
    subSkill: "Glove work",
    level: "feel",
    fixes: "A logged bobble or booted ground ball.",
    setup: "On a safe field, use a glove and ball. A partner rolls the ball; alone, use a gentle self-roll.",
    steps: ["Start balanced with your glove in front.", "Move behind the ball and field it in front of your body.", "Bring the ball smoothly toward your middle, then reset. Do not add throws."],
    cues: ["See the ball into the glove; soft hands, clean gather."],
    dosage: "Use the existing fielding slot reps",
    equipment: ["field", "glove", "ball"],
    violationKeys: ["bobble", "booted_ground_ball"],
    pieV2Signals: [],
    movementPatterns: [],
    ownerReview: "pending_owner_review",
    basis: "proposed_shape",
    source: "Owner-approved standard drill proposal"
  },
  {
    id: "elite.field.clean_exchange",
    name: "Clean glove-to-hand exchange",
    category: "fielding",
    sports: ["baseball", "softball"],
    subSkill: "Glove work",
    level: "feel",
    fixes: "A logged late transfer.",
    setup: "With a glove and ball, stand balanced in a safe field area.",
    steps: ["Place the ball in your glove in front of your body.", "Bring the glove toward your middle and take the ball with your throwing hand.", "Finish with a secure grip and reset; no extra throws."],
    cues: ["One clean exchange; do not rush the grip."],
    dosage: "Use the existing fielding slot reps",
    equipment: ["field", "glove", "ball"],
    violationKeys: ["late_transfer"],
    pieV2Signals: [],
    movementPatterns: [],
    ownerReview: "pending_owner_review",
    basis: "proposed_shape",
    source: "Owner-approved standard drill proposal"
  },
  ...["baseball", "softball"].map((sport) => ({
    id: `elite.run.read_reset.${sport}`,
    name: `${sport === "softball" ? "Pitch-release" : "Pitcher-move"} read and reset`,
    category: "baserunning",
    sports: [sport],
    subSkill: "Reads and reactions",
    level: "feel",
    fixes: "A logged late jump.",
    setup: "Use a safe, open field. Have a partner give the pitcher cue; alone, rehearse the read slowly.",
    steps: [
      sport === "softball" ? "Start on the base; stay on it until the pitch is released." : "Start in your balanced lead and watch the pitcher.",
      "Read the cue, commit to your first step, then stop under control.",
      "Reset fully before the next rep. No additional sprints or slides."
    ],
    cues: ["Read first, then go; never guess an unmeasured time."],
    dosage: "Use the existing baserunning slot reps",
    equipment: ["field"],
    violationKeys: ["late_jump"],
    pieV2Signals: [],
    movementPatterns: [],
    ownerReview: "pending_owner_review",
    basis: "proposed_shape",
    source: "Owner-approved standard drill proposal"
  }))
];

// src/data/drills/eliteDrillCatalog.ts
var BASE_DRILLS = [
  // ── HITTING ────────────────────────────────────────────────────────────
  {
    id: "elite.hit.walkaway_load",
    name: "Walk-Away Load",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Lower-half sequencing",
    level: "feel",
    fixes: "Weight stuck on the back side and a load with no direction.",
    setup: "Front toss from ~15 ft, hitter starts facing the pitcher two steps behind the plate.",
    steps: [
      "Walk slowly toward the plate as the feeder shows the ball.",
      "Plant the back foot and gather \u2014 the walk becomes the load.",
      "Land the front foot closed, then swing."
    ],
    cues: ["Gather, don't stop", "Back hip holds while the front foot lands"],
    dosage: "3 x 8",
    equipment: ["net", "machine"],
    violationKeys: [],
    pieV2Signals: [],
    movementPatterns: ["weight_stuck_back", "under_rotation"]
  },
  {
    id: "elite.hit.step_behind_separation",
    name: "Step-Behind Separation",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Lower-half sequencing",
    level: "iso",
    fixes: "Shoulders and hips turning together \u2014 no hip-shoulder separation.",
    setup: "Tee at middle-away, hitter in stride position with hands loaded.",
    steps: [
      "From landing, rotate the back hip while holding the chest closed for a beat.",
      "Feel the stretch across the front oblique before the barrel releases.",
      "Fire only after the stretch is felt."
    ],
    cues: ["Hips first, chest last", "Stretch the rubber band"],
    dosage: "4 x 6",
    equipment: ["tee", "net"],
    violationKeys: ["early_shoulder_rotation", "front_shoulder_opens_early"],
    pieV2Signals: ["separation"],
    movementPatterns: ["over_rotation", "early_shoulder_rotation"]
  },
  {
    id: "elite.hit.closed_shoulder_tee",
    name: "Closed-Shoulder Tee (Glove-Side Hold)",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Barrel path",
    level: "constraint",
    fixes: "Front shoulder flying open and pulling the barrel off the plane.",
    setup: "Tee on the outer third. Place a towel or short bat under the lead armpit.",
    steps: [
      "Load and stride without dropping the towel.",
      "Drive the barrel to the outside pitch, keeping the lead shoulder pointed at the plate longer.",
      "Finish tall; the towel should stay pinched until contact."
    ],
    cues: ["Lead shoulder to the ball, not to the dugout"],
    dosage: "3 x 10",
    equipment: ["tee", "net"],
    violationKeys: ["front_shoulder_opens_early", "early_shoulder_rotation"],
    pieV2Signals: ["separation", "front_side"],
    movementPatterns: ["over_rotation", "head_pull_off"]
  },
  {
    id: "elite.hit.hands_inside_short_bat",
    name: "Short-Bat Inside Turn",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Barrel path",
    level: "iso",
    fixes: "Hands casting out and passing the rear elbow early.",
    setup: "Short bat or one-hand trainer, tee set inner third.",
    steps: [
      "Load with the rear elbow tight to the ribcage.",
      "Turn the barrel from the back shoulder \u2014 elbow leads, hands follow.",
      "Contact out front on the inner third with no barrel drag."
    ],
    cues: ["Elbow slots, hands don't shove", "Knob to the inside of the ball"],
    dosage: "4 x 8",
    equipment: ["tee", "net"],
    violationKeys: ["hands_pass_elbow_early"],
    pieV2Signals: [],
    movementPatterns: ["hands_forward_early", "elbow_disconnect", "late_barrel"]
  },
  {
    id: "elite.hit.high_tee_plane_match",
    name: "High-Tee Plane Match",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Barrel path",
    level: "constraint",
    fixes: "Steep, chopping attack angle that produces topped ground balls.",
    setup: "Tee set at chest height, second tee or noodle placed behind at belt height.",
    steps: [
      "Swing without clipping the rear obstacle.",
      "Track the barrel behind the ball, then up through it.",
      "Ball should carry line-drive height, not spin down."
    ],
    cues: ["Barrel behind, then through", "Match the pitch plane early"],
    dosage: "3 x 10",
    equipment: ["tee", "net"],
    violationKeys: [],
    pieV2Signals: [],
    movementPatterns: ["steep_attack_angle", "flat_path", "late_barrel"]
  },
  {
    id: "elite.hit.two_ball_recognition",
    name: "Two-Ball Recognition",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Pitch recognition",
    level: "transfer",
    fixes: "Late decisions and chasing out of the zone.",
    setup: "Feeder holds two differently colored balls and releases one.",
    steps: [
      "Hitter calls the color out loud, then swings only at the called pitch.",
      "Feeder mixes speeds and heights.",
      "Track any take all the way to the mitt."
    ],
    cues: ["See it early, decide once"],
    dosage: "3 x 10",
    equipment: ["net"],
    violationKeys: [],
    pieV2Signals: ["visual_stability"],
    movementPatterns: ["head_pull_off"]
  },
  {
    id: "elite.hit.head_still_mirror",
    name: "Still-Head Mirror Swing",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Timing",
    level: "feel",
    fixes: "Head yanking off the ball through rotation.",
    setup: "Hitter faces a mirror or phone on a tripod at eye level.",
    steps: [
      "Dry swing while keeping the reflected eyes inside a fixed frame.",
      "Repeat with a tee once the head stops traveling."
    ],
    cues: ["Eyes stay, body turns"],
    dosage: "3 x 10 dry, 2 x 8 on tee",
    equipment: ["none", "tee"],
    violationKeys: [],
    pieV2Signals: ["head_stability", "visual_stability"],
    movementPatterns: ["head_pull_off"]
  },
  {
    id: "elite.hit.oppo_gap_transfer",
    name: "Opposite-Gap Transfer BP",
    category: "hitting",
    sports: ["baseball", "softball"],
    subSkill: "Adjustability",
    level: "transfer",
    fixes: "Over-rotation and pull-only contact under live speed.",
    setup: "Live BP on the field or long net with a target in the opposite gap.",
    steps: [
      "First 5 swings must land in the opposite gap.",
      "Next 5 are pitcher's choice \u2014 hit it where it is pitched."
    ],
    cues: ["Let it travel", "Direction before power"],
    dosage: "2 rounds of 10",
    equipment: ["machine", "net"],
    violationKeys: [],
    pieV2Signals: [],
    movementPatterns: ["over_rotation", "weight_leak_forward"]
  },
  // ── THROWING ───────────────────────────────────────────────────────────
  {
    id: "elite.throw.wall_arm_action",
    name: "Wall Arm-Action Drill",
    category: "throwing",
    sports: ["baseball", "softball"],
    subSkill: "Position-specific arm action",
    level: "feel",
    fixes: "Long, wrapped arm path and a late arm at foot strike.",
    setup: "Stand an arm's length from a wall, throwing side toward it.",
    steps: [
      "Break the hands thumb-down and swing the arm up along the wall without hitting it.",
      "Freeze at the high-cock position with the ball facing away.",
      "Repeat slowly, then add a light throw into a net."
    ],
    cues: ["Thumb down, fingers on top", "Arm up on time with the front foot"],
    dosage: "3 x 10",
    equipment: ["wall", "net"],
    ownerReview: "pending_owner_review",
    violationKeys: ["hands_pass_elbow_early"],
    pieV2Signals: ["arm_slot_consistency", "tempo"],
    movementPatterns: ["arm_lag"]
  },
  {
    id: "elite.throw.figure_eight_connection",
    name: "Figure-Eight Connection Throws",
    category: "throwing",
    sports: ["baseball", "softball"],
    subSkill: "Arm strength",
    level: "iso",
    fixes: "Disconnected arm that works independently of the torso.",
    setup: "Partner at 30 ft, athlete in a wide stride stance.",
    steps: [
      "Swing the arm in a continuous figure eight while rocking hips.",
      "Release out of the pattern on the coach's call.",
      "Keep the chest and arm arriving together."
    ],
    cues: ["Arm rides the body", "No stop, no rush"],
    dosage: "2 x 10 throws",
    equipment: ["partner"],
    ownerReview: "pending_owner_review",
    violationKeys: ["early_shoulder_rotation", "front_shoulder_opens_early"],
    pieV2Signals: ["separation", "tempo"],
    movementPatterns: ["arm_lag", "early_shoulder_rotation"]
  },
  {
    id: "elite.throw.roll_in_footwork",
    name: "Roll-In Throw on the Move",
    category: "throwing",
    sports: ["baseball", "softball"],
    subSkill: "Footwork",
    level: "constraint",
    fixes: "Offline throws caused by feet not lining up with the target.",
    setup: "Coach rolls a ball; a rope or line points at the receiving base.",
    steps: [
      "Field on the move and replace the feet along the line.",
      "Throw only when the back leg finishes facing the target.",
      "Track the throw's finish position each rep."
    ],
    cues: ["Feet aim first", "Finish through the line"],
    dosage: "4 x 6",
    equipment: ["glove", "cones"],
    violationKeys: ["back_leg_not_facing_target", "shoulders_not_aligned"],
    pieV2Signals: ["hip_alignment", "stride"],
    movementPatterns: ["offline_throw"]
  },
  {
    id: "elite.throw.long_toss_pulldown_ladder",
    name: "Long-Toss Extension Ladder",
    category: "throwing",
    sports: ["baseball"],
    subSkill: "Long toss",
    level: "transfer",
    fixes: "Short, tight arm path and inconsistent release extension.",
    setup: "Partner throwing on a marked field, stretching out in 30 ft increments.",
    steps: [
      "Stretch out on an arc until throws start to lose carry.",
      "Come back in with flat, on-a-line throws at the same intent.",
      "Stop at the first sign of arm fatigue or command loss."
    ],
    cues: ["Full arc out, flat line back", "Intent, not max effort"],
    dosage: "1 stretch-out, 10-15 pull-in throws",
    equipment: ["baseballs", "partner", "field"],
    ownerReview: "pending_owner_review",
    violationKeys: [],
    pieV2Signals: ["extension_consistency", "arm_slot_consistency"],
    movementPatterns: ["arm_lag"]
  },
  {
    id: "elite.throw.quick_exchange_ladder",
    name: "Quick-Exchange Ladder",
    category: "throwing",
    sports: ["baseball", "softball"],
    subSkill: "Transfer",
    level: "constraint",
    fixes: "Slow, double-clutched transfers that add time to every throw.",
    setup: "Partner at 45 ft, athlete on the balls of the feet with a glove.",
    steps: [
      "Receive and transfer to a four-seam grip in one motion.",
      "Throw on a stopwatch \u2014 log the exchange time each rep.",
      "Repeat with the ball fed to the backhand and glove side."
    ],
    cues: ["Two hands to the middle", "Grip found in the glove"],
    dosage: "3 x 8 timed",
    equipment: ["glove", "partner", "stopwatch"],
    ownerReview: "pending_owner_review",
    violationKeys: [],
    pieV2Signals: ["tempo"],
    movementPatterns: ["late_transfer", "double_clutch"]
  },
  // ── PITCHING ───────────────────────────────────────────────────────────
  {
    id: "elite.pitch.hershiser_separation",
    name: "Hershiser Separation Drill",
    category: "pitching",
    sports: ["baseball"],
    subSkill: "Hip-shoulder separation",
    level: "iso",
    fixes: "Shoulders opening with the hips \u2014 leaking energy before landing.",
    setup: "Pitcher stands beside a fence, glove-side shoulder facing it, in stride position.",
    steps: [
      "Ride the back hip down the fence line while the chest stays closed to it.",
      "Land, then let the chest arrive last.",
      "Add a light throw once the sequence is felt."
    ],
    cues: ["Hips down the line, chest holds", "Land closed, finish open"],
    dosage: "3 x 6 dry, 2 x 5 throws",
    equipment: ["fence", "net", "baseballs"],
    ownerReview: "pending_owner_review",
    violationKeys: ["early_shoulder_rotation", "front_shoulder_opens_early"],
    pieV2Signals: ["separation", "hip_alignment"],
    movementPatterns: ["early_shoulder_rotation", "hips_open_to_3b"]
  },
  {
    id: "elite.pitch.hook_em_horns",
    name: "Hook-'Em-Horns Front Side",
    category: "pitching",
    sports: ["baseball", "softball"],
    subSkill: "Command",
    level: "constraint",
    fixes: "Glove flying off and pulling the front side open early.",
    setup: "Flat ground at 45 ft into a net, glove arm extended at the target.",
    steps: [
      "Hold the glove out front, elbow at chest height.",
      "Pull the chest to the glove rather than yanking the glove to the hip.",
      "Freeze the finish and check that the glove is still over the front foot."
    ],
    cues: ["Chest to glove", "Glove stops, body arrives"],
    dosage: "3 x 8",
    equipment: ["glove", "net"],
    violationKeys: ["front_shoulder_opens_early"],
    pieV2Signals: ["front_side", "head_alignment"],
    movementPatterns: ["glove_pull_off"]
  },
  {
    id: "elite.pitch.walking_windup_tempo",
    name: "Walking-Windup Tempo",
    category: "pitching",
    sports: ["baseball"],
    subSkill: "Tempo",
    level: "feel",
    fixes: "Rushed delivery \u2014 the lower half never gets to move down the mound.",
    setup: "Flat ground, pitcher starts three steps behind the rubber.",
    steps: [
      "Walk into the leg lift with an unhurried rhythm.",
      "Count the gather out loud on the first reps.",
      "Deliver at controlled intent; time each rep for consistency."
    ],
    cues: ["Slow to fast", "Down the mound, not out of it"],
    dosage: "3 x 6",
    equipment: ["net", "stopwatch", "baseballs", "pitching_rubber"],
    ownerReview: "pending_owner_review",
    violationKeys: [],
    pieV2Signals: ["tempo", "energy_angle"],
    movementPatterns: ["rushed_tempo"]
  },
  {
    id: "elite.pitch.hip_hinge_energy_angle",
    name: "Back-Hip Load Hold",
    category: "pitching",
    sports: ["baseball", "softball"],
    subSkill: "Drive-leg force",
    level: "iso",
    fixes: "Standing tall over the rubber with no back-side load or drive angle.",
    setup: "Rubber or turf line, hands on hips.",
    steps: [
      "Lift the front leg and sink into the back hip, shin angled toward home.",
      "Hold three seconds, checking the hip stays behind the back foot.",
      "Release into a stride and stick the landing."
    ],
    cues: ["Sit in the back pocket", "Shin toward the target"],
    dosage: "4 x 5 holds",
    equipment: ["none"],
    violationKeys: ["early_shoulder_rotation"],
    pieV2Signals: ["energy_angle", "stride"],
    movementPatterns: ["weak_back_side_load"]
  },
  {
    id: "elite.pitch.stride_line_board",
    name: "Stride-Line Board",
    category: "pitching",
    sports: ["baseball", "softball"],
    subSkill: "Stride direction",
    level: "constraint",
    fixes: "Landing closed or across the body, throwing the hips out of line.",
    setup: "Lay a board, rope, or towel from the rubber toward the target.",
    steps: [
      "Deliver with the front foot landing on the line every rep.",
      "Mark misses; do not chase velocity until 8 of 10 land clean."
    ],
    cues: ["Foot on the line, toe slightly closed"],
    dosage: "3 x 10",
    equipment: ["none", "net"],
    violationKeys: ["back_leg_not_facing_target", "shoulders_not_aligned"],
    pieV2Signals: ["stride", "hip_alignment"],
    movementPatterns: ["hips_open_to_3b", "short_stride"]
  },
  {
    id: "elite.pitch.towel_extension",
    name: "Towel Extension Drill",
    category: "pitching",
    sports: ["baseball"],
    subSkill: "Arm action",
    level: "iso",
    fixes: "Short release and inconsistent extension out front.",
    setup: "Partner holds a glove at the athlete's stride-length plus reach; athlete holds a towel.",
    steps: [
      "Run the full delivery and strike the target glove with the towel.",
      "Miss short means the release is early; adjust the finish, not the arm speed."
    ],
    cues: ["Reach the target", "Chest over the front knee"],
    dosage: "3 x 8",
    equipment: ["glove", "towel", "partner"],
    ownerReview: "pending_owner_review",
    violationKeys: ["hands_pass_elbow_early"],
    pieV2Signals: ["extension_consistency", "arm_slot_consistency"],
    movementPatterns: ["extension_variance", "arm_slot_variance"]
  },
  {
    id: "elite.pitch.head_stability_target",
    name: "Fixed-Eye Delivery",
    category: "pitching",
    sports: ["baseball", "softball"],
    subSkill: "Release consistency",
    level: "feel",
    fixes: "Head drifting or tilting through release, moving the release point.",
    setup: "Flat ground, small target taped at eye height behind the net.",
    steps: [
      "Deliver while keeping the eyes locked on the tape the entire time.",
      "Have a partner film from the front and check for head travel."
    ],
    cues: ["Eyes never leave the target", "Head rides level"],
    dosage: "3 x 8",
    equipment: ["net", "tape", "partner", "phone"],
    ownerReview: "pending_owner_review",
    violationKeys: [],
    pieV2Signals: ["head_stability", "head_alignment", "shoulder_level"],
    movementPatterns: ["head_drift_release", "head_tilt_release", "shoulder_dip_release"]
  },
  {
    id: "elite.pitch.rear_foot_drag_finish",
    name: "Drag-Line Finish",
    category: "pitching",
    sports: ["baseball"],
    subSkill: "Lower-half sequencing",
    level: "constraint",
    fixes: "Back foot jumping off the rubber instead of dragging through.",
    setup: "Dirt mound or turf that shows a drag line.",
    steps: [
      "Deliver and inspect the drag line after every rep.",
      "A clean line means the hips stayed engaged; a jump means the athlete pushed early."
    ],
    cues: ["Toe drags, doesn't fly", "Stay in the ground longer"],
    dosage: "3 x 8",
    equipment: ["none"],
    violationKeys: [],
    pieV2Signals: ["rear_foot_drag", "energy_angle"],
    movementPatterns: ["rear_foot_jump"]
  },
  {
    id: "elite.pitch.windmill_k_position",
    name: "Windmill K-Position Hold",
    category: "pitching",
    sports: ["softball"],
    subSkill: "Arm circle",
    level: "iso",
    fixes: "Arm circle collapsing away from the body and losing the line.",
    setup: "Athlete in stride landing position, arm at the top of the circle.",
    steps: [
      "Hold the top of the circle with the arm brushing the ear line.",
      "Finish the bottom half into a light throw, keeping the circle flat to the target."
    ],
    cues: ["Circle by the ear", "Flat to the plate"],
    dosage: "4 x 6",
    equipment: ["net", "softballs"],
    ownerReview: "pending_owner_review",
    violationKeys: ["hands_pass_elbow_early"],
    pieV2Signals: ["arm_slot_consistency"],
    movementPatterns: ["arm_slot_variance"]
  },
  {
    id: "elite.pitch.windmill_drive_leg",
    name: "Windmill Drive-Leg Push",
    category: "pitching",
    sports: ["softball"],
    subSkill: "Drive-leg force",
    level: "transfer",
    fixes: "Short stride and passive drive leg off the rubber.",
    setup: "Rubber with a marked stride distance on the ground.",
    steps: [
      "Push the drive leg out and land past the mark.",
      "Only add intent once the landing is repeatable and balanced."
    ],
    cues: ["Push, don't step", "Land loaded, not tall"],
    dosage: "3 x 8",
    equipment: ["net", "pitching_rubber"],
    ownerReview: "pending_owner_review",
    violationKeys: [],
    pieV2Signals: ["stride", "energy_angle"],
    movementPatterns: ["short_stride", "weak_back_side_load"]
  }
];
var ELITE_DRILL_CATALOG = [...BASE_DRILLS, ...DOCTRINE_DRILLS, ...FIELD_RUNNING_DRILLS];

// src/lib/prescription/ownerDrills.ts
function analysisTargets(placements) {
  return placements.filter((p) => p.startsWith("analysis:")).map((p) => {
    const [, sport, category] = p.split(":");
    return { sport, category };
  });
}
function rowToDrills(row) {
  const targets = analysisTargets(row.placements);
  const byCat = /* @__PURE__ */ new Map();
  for (const t of targets) {
    if (!byCat.has(t.category)) byCat.set(t.category, /* @__PURE__ */ new Set());
    byCat.get(t.category)?.add(t.sport);
  }
  const baseId = row.overrides_drill_id ?? `owner.${row.id}`;
  return [...byCat.entries()].map(([category, sports], i) => ({
    id: i === 0 ? baseId : `${baseId}.${category}`,
    name: row.name,
    category,
    sports: [...sports],
    subSkill: row.phase ?? "",
    level: row.level ?? "feel",
    fixes: "",
    setup: row.setup ?? "",
    steps: row.steps ?? [],
    cues: row.cue ? [row.cue] : [],
    dosage: row.dosage ?? "",
    equipment: row.equipment ?? [],
    violationKeys: row.fault_keys ?? [],
    pieV2Signals: [],
    movementPatterns: [],
    phase: row.phase ?? void 0,
    feel: row.feel ?? void 0,
    feelWrong: row.feel_wrong ?? void 0,
    commonMistake: row.common_mistake ?? void 0,
    source: "Owner drill builder",
    videoUrl: row.video_url,
    libraryVideoId: row.library_video_id ?? null,
    ownerReview: "approved",
    ownerRowId: row.id,
    placements: row.placements,
    pinned: row.pinned,
    createdAt: row.created_at
  }));
}
function mergeCatalog(base, rows) {
  const overridden = /* @__PURE__ */ new Map();
  for (const r of rows) if (r.overrides_drill_id) overridden.set(r.overrides_drill_id, r);
  const out = [];
  for (const d2 of base) {
    const r = overridden.get(d2.id);
    if (!r) {
      out.push(d2);
      continue;
    }
    if (!r.active) continue;
    const [replacement] = rowToDrills(r);
    out.push(replacement ?? { ...d2, name: r.name, videoUrl: r.video_url, libraryVideoId: r.library_video_id ?? null });
  }
  for (const r of rows) if (!r.overrides_drill_id && r.active) out.push(...rowToDrills(r));
  return out;
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
function findSubGoal(sport, discipline, category, id) {
  return subGoalsFor(sport, discipline, category).find((g) => g.id === id) ?? null;
}
function legalSubGoalIds(sport, discipline, category) {
  return new Set(subGoalsFor(sport, discipline, category).map((g) => g.id));
}

// src/lib/hammer/goals/categoryGoals.ts
var CATEGORY_KEYS = ["speed", "power", "throwing", "hitting", "fielding"];
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
  const hasAny = Object.values(out).some((v) => Array.isArray(v) && v.length > 0);
  return hasAny ? out : null;
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
  const hasAny = !!(baseball?.position || baseball?.pitcher || softball?.position || softball?.pitcher);
  if (!hasAny && !categoryOrder) return null;
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
  const list = Array.isArray(obj.goals) ? obj.goals : Array.isArray(raw) ? raw : null;
  if (!list) return null;
  const seen = /* @__PURE__ */ new Set();
  const goals = [];
  for (const item of list) {
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
function getV2(raw) {
  return normalizeCategoryGoalsV2(raw);
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
  const key = cleaned.toUpperCase();
  if (seen.has(key)) return;
  seen.add(key);
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
      const record = input;
      for (const key of OBJECT_POSITION_KEYS) {
        if (key in record) visit(record[key], depth + 1);
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

// src/lib/prescription/analysisGoals.ts
function categoryGoals(raw, module, sport = "baseball", position) {
  if (!["hitting", "pitching", "throwing"].includes(module) || !["baseball", "softball"].includes(sport)) return [];
  const selectedSport = sport;
  const v2 = getV2(raw);
  if (v2) {
    const panes = v2[selectedSport];
    let discipline = module === "pitching" ? "pitcher" : module === "throwing" ? "position" : null;
    if (!discipline) {
      if (firstPositionToken(position)) discipline = positionTokenIsPitcher(position) ? "pitcher" : "position";
      else if (panes?.position && !panes.pitcher) discipline = "position";
      else if (panes?.pitcher && !panes.position) discipline = "pitcher";
    }
    if (!discipline) return [];
    return (panes?.[discipline]?.[module] ?? []).slice().sort((a, b) => Number(a.rank === "secondary") - Number(b.rank === "secondary")).map((pick) => findSubGoal(selectedSport, discipline, module, pick.id)?.label).filter((label) => Boolean(label));
  }
  const legacy = normalizeCategoryGoals(raw);
  if (legacy) {
    if (module === "pitching") return [];
    const category = module;
    const intent = legacy.goals.find((g) => g.category === category)?.intent;
    const label = CATEGORY_INTENTS[category]?.find((g) => g.id === intent)?.label;
    return label ? [label] : [];
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const value = raw[module];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && !!v.trim()) : [];
}
var normalize = (s) => s.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
var GOAL_DRILL_IDS = {
  "hitting:barrel control": ["elite.hit.hands_inside_short_bat", "elite.hit.high_tee_plane_match"],
  "hitting:hitting to all fields": ["elite.hit.oppo_gap_transfer"],
  "throwing:footwork into the throw": ["elite.throw.roll_in_footwork"]
};
function matchGoalDrills(catalog, goals, module, sport, max = 2) {
  if (!["baseball", "softball"].includes(sport)) return [];
  return catalog.filter((d2) => d2.category === module && d2.sports.includes(sport) && !!d2.videoUrl?.trim()).map((drill) => {
    const matched = goals.filter((g) => normalize(g) === normalize(drill.subSkill) || GOAL_DRILL_IDS[`${module}:${normalize(g)}`]?.includes(drill.id));
    return { drill, score: matched.length * 10, reasons: matched.map((g) => `Your goal: ${g.replace(/_/g, " ")}`) };
  }).filter((d2) => d2.score > 0).sort((a, b) => b.score - a.score || a.drill.id.localeCompare(b.drill.id)).slice(0, max);
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

// src/lib/prescription/analysisDrillRotation.ts
function analysisDrillCategory(block) {
  if (block.modality === "hitting") return "hitting";
  if (block.modality === "throwing") return new URL(block.route, "https://local.invalid").searchParams.get("module") === "pitching" ? "pitching" : "throwing";
  if (block.modality === "defense") return "fielding";
  if (block.modality === "baserunning") return "baserunning";
  return null;
}
function analysisDrillSlot(drills) {
  return drills.findIndex((d2) => !d2.ownerDrillId && d2.prescriptionOrigin !== "owner" && !d2.bunt && (d2.stage == null || d2.stage === "drills"));
}
function enrollmentBecause(enrollment, name) {
  const reason = enrollment.fault_key ? enrollment.fault_key.replace(/_/g, " ") : `your goal: ${enrollment.goal_label ?? "saved skill work"}`;
  return `Because you chose "${name}" to work on ${reason}, it stays in your fix-it slot while we check your progress.`;
}
function enrolledDrill(source, drill, enrollment) {
  return {
    ...source,
    name: drill.name,
    slug: drill.id,
    setup: drill.setup,
    cue: drill.cues.join(" \xB7 "),
    videoUrl: drill.videoUrl,
    libraryVideoId: drill.libraryVideoId,
    equipmentNote: drill.equipment.join(", "),
    guide: void 0,
    prescriptionOrigin: "analysis",
    routineRole: "fix_it",
    analysisEnrollment: { videoId: enrollment.video_id, issueKey: enrollment.issue_key, drillId: drill.id }
  };
}
export {
  ELITE_DRILL_CATALOG,
  analysisDrillCategory,
  analysisDrillSlot,
  categoryGoals,
  enrolledDrill,
  enrollmentBecause,
  matchGoalDrills,
  mergeCatalog
};
