/**
 * Elite Defensive Drill Guides
 *
 * Zero-prior-knowledge `MovementGuide` for every drill exposed by
 * `defenseLibrary.ts`. Drill names map onto ~32 canonical "families" so the
 * corner shortstop and the 10-year-old both get a real explanation, and a
 * new drill name in the catalog is a compile-time miss caught by
 * `scripts/check-defense-guides.ts`.
 *
 * Each guide follows the same shape as `movementGuide.ts` and additionally
 * carries `tierNotes` — a per-tier progression line that gets appended to
 * the drill's on-card `setup` so beginners see "start on both knees with
 * tennis balls" and elites see "live short-hops with pop-time timer."
 *
 * Pure — no I/O. Deterministic. Content-only.
 */
import type { MovementGuide } from "./movementGuide";

export type DefenseTier = "beginner" | "developing" | "advanced" | "elite";

export interface DefenseGuide extends MovementGuide {
  readonly tierNotes: Record<DefenseTier, string>;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ── Family definitions ──────────────────────────────────────────────────────

const G: Record<string, DefenseGuide> = {
  // ============ CATCHER =====================================================
  receiving_one_knee: {
    what:
      "You catch pitches from a one-knee stance (glove-side knee down). You're not trying to move the ball — you're trying to catch each pitch so quiet and so on-plane that a borderline strike stays a strike.",
    setup:
      "Down leg: glove-side knee on the ground with the shin lined up under your hip. Other leg: foot flat, thigh open ~45°. Mitt out in front of the plate, thumb rotated slightly upward, elbow soft. Partner or machine throws from mound distance.",
    goodRep: [
      "Glove starts slightly below the ball and works UP to the catch on low pitches, DOWN to the catch on high pitches.",
      "Thumb stays up on the catch — never sideways.",
      "You freeze the glove for a half-count after the ball hits the pocket (the umpire has time to see it).",
      "Zero head movement — eyes track the ball into the pocket.",
    ],
    badRep: [
      "Stabbing at the ball with a stiff wrist.",
      "Catching a low pitch by dropping the elbow (you'll pull the ball out of the zone).",
      "Setting up too close to the hitter — you lose your bottom of the zone.",
      "Standing up between pitches (kills the umpire's sightline).",
    ],
    feel:
      "Quiet hands, calm shoulders, breath out on the catch. It should feel like the ball is landing in a pillow that doesn't move.",
    whyToday:
      "Framing is the highest-leverage skill a catcher owns — a strike stolen is a run saved. This block trains the neural pattern before you ever get to a live bullpen.",
    nextLink:
      "You'll feed the same quiet-glove pattern into pop-time work and into live bullpens later this week.",
    stopIf: "Knee, hip, or lower-back pain — come off the knee and switch to a squat receiving primer.",
    tierNotes: {
      beginner: "Start with a partner tossing tennis balls from 20 ft. Both knees down is OK for the first 20 catches while you learn the freeze.",
      developing: "Coach short-tosses from 30 ft with a real baseball/softball. Add a 1-second freeze count on every catch.",
      advanced: "Machine or bullpen distance. Add corner targets and score yourself: 20/25 quiet catches or you repeat the round.",
      elite: "Live bullpen or high-velo machine. Camera behind you — audit the freeze on every catch. Any glove drift is a failed rep.",
    },
  },
  framing_ladder: {
    what:
      "You receive one pitch to each of the four corners of the strike zone (up-in, up-away, down-in, down-away) in order, then repeat. Trains the small glove-load direction change for each zone.",
    setup:
      "One-knee stance behind the plate. Partner or coach throws to a called corner from 30–40 ft. A hitter or a bat placed at the plate helps you frame the zone honestly.",
    goodRep: [
      "Glove pre-loads TOWARD the target corner before the pitch (not after).",
      "Catch is a small hinge, not a swipe.",
      "Ball ends up inside the zone, not pulled out of it.",
      "Freeze for a full second after the catch on every rep.",
    ],
    badRep: [
      "Pulling the ball into the zone with a big arm swing — the umpire sees it.",
      "Catching every pitch with the same glove path — no corner-specific load.",
      "Rushing the throw-back to the pitcher (breaks the freeze).",
    ],
    feel: "Deliberate. Slow. Like painting each corner instead of grabbing at it.",
    whyToday: "Turns the receiving primer into corner-specific muscle memory — this is how you steal 5–10 strikes per game.",
    nextLink: "Rolls straight into blocking so you can flip from finesse to protecting the plate.",
    tierNotes: {
      beginner: "8 balls per corner. Coach names the corner out loud before the pitch.",
      developing: "8 balls per corner, coach names the corner AFTER release so you react.",
      advanced: "6 per corner, corners unannounced. Score: 5/6 clean-freeze catches or repeat.",
      elite: "Machine + corner mixer. Coach adds a shadow hitter. Umpire evaluates strike calls after the round.",
    },
  },
  blocking_short_hop: {
    what:
      "You take short-hop pitches (drop, curve, screwball, or a coach's short-toss) and block them dead in front of you so the runner can't advance. Priority is chest to the ball, chin down, keep it in front.",
    setup:
      "Full gear (chest, mask, shin guards, cup, mitt). One-knee or squared stance. Coach kneels 20 ft in front and throws short-hops to the middle, then to your right, then to your left.",
    goodRep: [
      "You drop into the block, you don't stand and reach.",
      "Chin tucks to the chest — mask covers the throat.",
      "Chest angles down at the ball so the ball dies in front (soft, quiet).",
      "Mitt goes to the ground between your legs to seal the middle.",
    ],
    badRep: [
      "Trying to catch a block with your glove instead of your chest.",
      "Turning your shoulder to the ball (you'll deflect it into the runner's advance path).",
      "Head up — the ball hits the throat.",
      "Popping up too fast — the ball squirts away before you locate it.",
    ],
    feel: "Compact. Heavy. You want to feel like a wall, not like you're catching.",
    whyToday: "You cannot be a real catcher without honest blocking. This drill is your insurance policy for every breaking ball your pitcher throws.",
    nextLink: "Pairs with block-and-recover so you learn to pop up, locate the ball, and stop the runner.",
    stopIf: "Sharp chest, sternum, or throat pain — stop, re-check gear fit before continuing.",
    tierNotes: {
      beginner: "Tennis balls, no gear needed. Just learn to drop the chest and tuck the chin.",
      developing: "Full gear, real ball, coach at 25 ft. 3×10 (middle-right-left) with a 3-second recover between reps.",
      advanced: "Full gear, machine short-hops, 3×10 to each direction with a live runner cue after every block.",
      elite: "Live bullpen breaking balls in the dirt. Camera on chest angle. Any deflection past 8 ft = failed rep.",
    },
  },
  block_recover: {
    what:
      "Block a short-hop, pop UP into your feet, locate the ball, and simulate throwing to a base to hold the runner. Trains the finish of the play, not just the block.",
    setup: "Same as blocking short-hop. After the block, a partner points to 1B/2B/3B and you rise, find the ball, and go through the throwing motion.",
    goodRep: [
      "Block first, feet second — never the other way around.",
      "You pop up onto BOTH feet before you look for the ball.",
      "Eyes find the ball before the head turns to the base.",
      "Throw is a snap-and-set, not a full throw (unless coach signals live).",
    ],
    badRep: [
      "Rising as you block (ball squirts out).",
      "Looking at the base before you have the ball secured.",
      "Slow shuffle after the block — the runner already stole the base.",
    ],
    feel: "Explosive up, calm on the throw.",
    whyToday: "Blocking with no recovery = the runner still gets the base. This turns the block into a real out.",
    nextLink: "Pop-time footwork gets built on the same lower-half pop mechanic.",
    tierNotes: {
      beginner: "Foam ball short-hops, no throw — just pop up and point to the base.",
      developing: "Real ball, dry throw to base (no runner).",
      advanced: "Live-runner cue, 90% throw to base.",
      elite: "Timed pop-and-throw ≤ 2.2 s pop-to-catch at 2B off the block.",
    },
  },
  pop_time: {
    what:
      "You catch a pitch, transfer to your throwing hand, replace your feet, and throw to 2B (or another base) as fast as possible. Pop-time = the seconds from ball hitting glove to ball hitting the base receiver.",
    setup:
      "Full gear. Coach or machine throws from mound distance. Partner receives at 2B with a stopwatch (elite: two-camera pop timer). Baseball target: ≤ 2.0 s. Softball target: ≤ 1.9 s.",
    goodRep: [
      "Feet replace as the ball arrives — right foot behind the left, then step-throw over the front hip.",
      "Ball comes out of the glove with a four-seam grip (no slider spin).",
      "Throw is a snap over the top, not a long-arm windup.",
      "Chest points at the base on release.",
    ],
    badRep: [
      "Standing up before you catch (you'll lose the pitch AND the throw).",
      "Rounding the transfer (ball wobbles, throw sails).",
      "Full-arm windup (adds 0.3 s — you'll never throw anyone out).",
    ],
    feel: "Compact and explosive — like uncoiling a spring, not swinging a bat.",
    whyToday: "This is the single most valuable throw a catcher makes. Every 0.1 s off your pop-time is another runner you catch.",
    nextLink: "Grip and transfer carry into slap-bunt barehand and into the bunt pick-and-throw.",
    stopIf: "Shoulder or elbow pain on the throw — cut to dry footwork only.",
    tierNotes: {
      beginner: "Dry footwork ONLY (no ball). 3×8 to feel the replace-step.",
      developing: "Ball transfers with a soft partner-toss from 15 ft, still no long throw. 2×5.",
      advanced: "Live pop-time to 2B, timed. Baseball: ≤ 2.1 s. Softball: ≤ 2.0 s.",
      elite: "Live pop-time on a game-day arm. Baseball: ≤ 1.95 s. Softball: ≤ 1.85 s. Filmed and reviewed.",
    },
  },
  foul_pop: {
    what:
      "You track a popped-up foul ball, flip your mask off in the OPPOSITE direction of the ball, then find it late and catch it above your head.",
    setup:
      "Full gear behind the plate. Coach uses a fungo or hand-toss to launch a high pop-up straight up or slightly off the plate. Screen or padded net to absorb misses.",
    goodRep: [
      "You feel the ball come off the bat, IMMEDIATELY turn your back to the field, and search up.",
      "Mask flips off with a firm two-hand toss AWAY from the ball's path.",
      "Catch is above the head with the mitt open like a basket.",
      "Second hand comes over on the catch.",
    ],
    badRep: [
      "Flipping the mask off toward the ball (you'll trip on it).",
      "Drifting under the ball with your chest — the spin makes you miss.",
      "Reaching out in front instead of catching overhead.",
    ],
    feel: "Chaotic at first, then patient — like the ball hangs there and waits for you.",
    whyToday: "A caught foul pop is a free out. Missing one costs your pitcher an extra AB and 8+ pitches.",
    nextLink: "Trains the same overhead track that outfielders use — carries over to any high pop or lazy fly.",
    tierNotes: {
      beginner: "No mask flip yet — just learn the turn-and-find with a lobbed tennis ball.",
      developing: "Add the mask flip (empty mask) with a real pop.",
      advanced: "Live gear, coach mixes fair-side and foul-side pops.",
      elite: "Full-speed fungo pops with wind — catch percentage ≥ 90% or repeat the round.",
    },
  },
  bunt_pick_throw: {
    what:
      "A bunt is placed in front of the plate. You explode out of the crouch, field with two hands, use your footwork to align to the throwing base, and deliver a strong throw.",
    setup: "Coach places (or hits) a bunt within 15 ft of the plate. Full gear. Bases occupied by cones or partners for realistic footwork.",
    goodRep: [
      "First step is with the throwing-side foot to clear the ball.",
      "You field with two hands — glove low, throwing hand covers.",
      "Feet align with the target base BEFORE the throw.",
      "Throw is over the top and firm — no side-arm dart.",
    ],
    badRep: [
      "Scooping with one hand on the run (fumble).",
      "Throwing on the wrong foot (sailing throw).",
      "Barehanding a ball that's still moving fast — bare-hand only when it's stopped or crawling.",
    ],
    feel: "Aggressive but controlled — like sprinting to pick up a wallet you just dropped.",
    whyToday: "Bunts change every close game. A clean bunt-pick play is a defensive statement.",
    nextLink: "Same footwork idea as PFP bunt coverage for pitchers.",
    tierNotes: {
      beginner: "Ball placed stationary. Walk through the field-and-throw. 6 reps.",
      developing: "Slow-rolled bunts. Live footwork, dry throw. 6 reps per base.",
      advanced: "Live bunts off the bat, real throws.",
      elite: "Live BP bunts + baserunner. Timed under 3.4 s from bat contact to base catch.",
    },
  },

  // ============ PITCHER (PFP) ==============================================
  pfp_1_3_1: {
    what:
      "The classic Pitcher's Fielding Practice sequence. Comebacker to the pitcher (1), throw to first (3), and if a runner rounds, cover first for a return throw (back to 1).",
    setup: "Bullpen mound to home. First baseman at 1B, coach hits a comebacker at the pitcher after delivery. Bases marked with cones as needed.",
    goodRep: [
      "After delivery, you land square with your glove up — ready to react.",
      "Inside the 45-ft line: soft underhand toss led out in front of the 1B.",
      "Outside the 45-ft line: overhand chest-high throw.",
      "Cover first with a controlled sprint — hit the inside of the bag on the run.",
    ],
    badRep: [
      "Sidearm/flip throws that pull the 1B off the bag.",
      "Sprinting to the bag with your hips closed — you can't catch the throw.",
      "Under-hand toss from too far (bloops it, runner is safe).",
    ],
    feel: "Reactive first, then decisive — recognize distance, then commit to the throw type.",
    whyToday: "Every pitcher gets a comebacker in a season. The ones who make the play win their coach's trust for good.",
    nextLink: "Same footwork family as covering 1B on a 3-6-1 double play.",
    stopIf: "Sharp elbow or shoulder pain on the throw — dry footwork only.",
    tierNotes: {
      beginner: "Walk-through only, no batter, coach rolls the ball at you. 4 reps.",
      developing: "Coach fungoes at 60%. Real toss/throw to 1B. 6 reps.",
      advanced: "Live BP comebackers. 8 reps.",
      elite: "Full simulated inning: 3 comebackers + 2 bunts + 1 covers. Under a coach's stopwatch.",
    },
  },
  comebacker_glove: {
    what:
      "You field a ball hit directly back at you off the bat, glove-first, and turn to throw the runner out at a base.",
    setup: "Bullpen mound. Coach fungoes comebackers at increasing velocity. Middle infielders at 2B and 1B as needed.",
    goodRep: [
      "You land square from your delivery — your glove is UP and your feet are set.",
      "First move is your glove to the ball, not a step to the side.",
      "You gather the ball into two hands before you turn.",
      "Spin is glove-side (for a right-hander) to 2B, or first-base side to 1B.",
    ],
    badRep: [
      "Ducking or turning away from a hard comebacker (you HAVE to attack the ball).",
      "Trying to bare-hand a comebacker — glove first, always.",
      "Rushing the throw and short-hopping the middle infielder.",
    ],
    feel: "Athletic and fearless. You're a fielder the second the ball leaves your hand.",
    whyToday: "Comebackers are the fastest reactions a pitcher owns. Reps here save you from staring at a ball at your ankles in a real game.",
    nextLink: "Sets up 1-3-1 PFP and any turn-to-2B double-play sequence.",
    stopIf: "You feel unsafe with the fungo velocity — coach cuts speed 20%.",
    tierNotes: {
      beginner: "Coach hand-rolls the ball at walk pace. 3×5.",
      developing: "Slow fungoes from 45 ft, real feet-set finish. 3×8.",
      advanced: "Live BP comebackers off a machine or elite fungo. 3×10.",
      elite: "Machine at 90+ mph exit velocity or live BP. Timed glove-to-base ≤ 2.0 s.",
    },
  },
  cover_1b: {
    what:
      "On a ball hit to the right side of the infield, the pitcher sprints from the mound to cover first base for the throw from the first baseman.",
    setup: "Coach hits a slow chopper toward 1B or 2B, forcing the first baseman to field it and flip. Pitcher must break to 1B immediately after delivery.",
    goodRep: [
      "You break AFTER your follow-through — never before (that's a balk).",
      "Path curves so you approach the bag running parallel to the foul line (safer for the runner and for you).",
      "You touch the INSIDE of the bag with your right foot on the run.",
      "Catch the throw on the run — never wait flat-footed.",
    ],
    badRep: [
      "Stepping on the foul-line side of the bag — collision with the runner.",
      "Slowing down to catch the ball — the runner beats you.",
      "Coming across in a straight line and reaching (you'll trip on the bag).",
    ],
    feel: "Full sprint, then quiet feet as you approach the bag.",
    whyToday: "This is a play pitchers make every game and blow every game. Reps make it automatic.",
    nextLink: "Same footwork as 3-6-1 double play cover.",
    tierNotes: {
      beginner: "Walk pace, learn the path and the bag-inside touch. 4 reps.",
      developing: "Jog pace, live 1B throw. 6 reps.",
      advanced: "Full-speed with a coach timing the sprint (target ≤ 3.0 s from mound to bag).",
      elite: "Live BP + baserunner. Beat the runner 8/8 or repeat.",
    },
  },
  bunt_fielding: {
    what:
      "You field a bunt on the move and deliver a strong, accurate throw to the correct base to record an out or hold the lead runner.",
    setup:
      "Coach places or slow-rolls a bunt inside the 20-ft radius of the plate. Bases occupied by cones or partners. Fielder starts in normal position.",
    goodRep: [
      "First step is TOWARD the ball, then the play direction opens up.",
      "You field with two hands, glove low, throwing hand covers.",
      "Feet align to the target base BEFORE the throw.",
      "Throw is short-armed and firm — no long windup.",
    ],
    badRep: [
      "One-handed scoop on the run (fumble).",
      "Throwing across your body off the wrong foot (sails).",
      "Bare-hand attempt on a rolling ball — bare-hand ONLY on a stationary or crawling ball.",
    ],
    feel: "Downhill and controlled — like a running quarterback who never loses sight of the receiver.",
    whyToday: "Bunts decide close games. A clean pick-and-throw sequence is a defensive statement.",
    nextLink: "Same footwork idea as any pop-and-throw play.",
    tierNotes: {
      beginner: "Ball placed stationary. Walk-through pick-and-throw. 5 reps.",
      developing: "Slow-rolled bunts, live footwork, soft throw. 3 per base.",
      advanced: "Live BP bunts, real throws.",
      elite: "Live BP + baserunner. Under coach's stopwatch (< 3.4 s bat-contact to base catch).",
    },
  },
  backup_bases: {
    what:
      "As a pitcher, on any ball hit to the outfield you sprint to back up either 3B or home so a wild throw doesn't cost you an extra base.",
    setup: "Coach hits a ball to the OF and calls the base. Pitcher must sprint to the correct deep-angle backup spot.",
    goodRep: [
      "Immediately after delivery you locate the ball off the bat.",
      "You sprint to the deep angle (30+ ft behind the base) — never right on the bag.",
      "You read the throw's flight and shift a step left or right to line up.",
      "Ready in a fielding stance when the throw arrives.",
    ],
    badRep: [
      "Backing up the wrong base (know the situation before every pitch).",
      "Standing too close to the bag (an errant throw goes past you).",
      "Watching the play instead of positioning.",
    ],
    feel: "Total situational awareness — you're the insurance on every play.",
    whyToday: "One backed-up throw a season saves multiple runs. This is free defense the pitcher owes the team.",
    nextLink: "Same 'know-the-situation' brain used on covering 1B and PFP.",
    tierNotes: {
      beginner: "Coach calls the base BEFORE every play, walk-through the path. 3 rounds.",
      developing: "Coach calls the base after ball is hit, live sprint. 5 rounds.",
      advanced: "Live BP, pitcher reads the play and picks the base. 5 rounds.",
      elite: "Live simulated innings — coach grades base selection AND angle depth on every play.",
    },
  },
  hold_runner: {
    what:
      "Varied looks, holds, and slide-steps disrupt a runner's timing so he can't get a clean jump to steal the next base.",
    setup: "Mound with plate. Runner (or coach) at 1B or 2B. Pitcher runs through 5–10 pitches, mixing quick pitches, holds of 1-1-3-2 counts, and slide-steps.",
    goodRep: [
      "Each look is a different length — no rhythm the runner can time.",
      "Slide-step is a controlled 1.2–1.4 s to the plate.",
      "Hold is still — no shoulder twitch, no glove flinch (that's a balk).",
      "Pickoff attempt is quick and to a spot the 1B can catch.",
    ],
    badRep: [
      "Same rhythm every pitch — runner gets a free steal.",
      "Shoulder flinch on the hold (balk).",
      "Slow pickoff attempts that never get the runner (waste of pitches).",
    ],
    feel: "Controlled and slightly annoying — like you're deliberately making the runner uncomfortable.",
    whyToday: "Controlling the running game is 50% of a pitcher's job with runners on. This is elite pitcher IQ work.",
    nextLink: "Pairs with catcher pop-time — the two skills work together to shut down the steal.",
    tierNotes: {
      beginner: "Dry mound work, no runner. Learn the 3 hold counts and 1 slide-step.",
      developing: "Real 1B runner walking off the bag — practice varied looks and one live pickoff per set.",
      advanced: "Live simulated at-bats with runner + catcher. Score: 0/8 clean steals allowed.",
      elite: "Live intrasquad game. Any straight-steal against you is a failed rep.",
    },
  },
  windmill_recover: {
    what:
      "After a softball windmill pitch, the pitcher recovers her body into a balanced, chest-square fielding position so a comebacker doesn't blow past her.",
    setup: "Softball rubber to plate. Full pitching motion. Coach fungoes a comebacker immediately on follow-through.",
    goodRep: [
      "Follow-through finishes with the pitching hand and glove BOTH up in front of the chest.",
      "Feet land square to the plate (not sideways).",
      "Glove goes to the ball on the fungo — no wasted step.",
      "Two hands secure the ball before the throw.",
    ],
    badRep: [
      "Pitching arm dangles low on the finish (glove is too far to react).",
      "Body opens sideways on the follow-through (can't field a comebacker).",
      "Reaching one-handed for the fungo — you'll bobble it.",
    ],
    feel: "Balanced on both feet, chest square, eyes to the hitter.",
    whyToday: "Softball comebackers are hotter and closer than baseball comebackers. This recovery keeps you safe and keeps you in the play.",
    nextLink: "Feeds the softball comebacker-and-turn-to-2B sequence.",
    tierNotes: {
      beginner: "Dry finish reps — no ball. 3×5. Coach checks glove position.",
      developing: "Real pitch + fungo at 50%. 3×5.",
      advanced: "Live-velocity pitch + fungo at 80%.",
      elite: "Live intrasquad — recover from every pitch and field 3 comebackers per inning.",
    },
  },
  rise_hold_throw: {
    what:
      "Softball has no lead-off, but runners jump-step at release. Pitcher throws a rise ball and, on a jump, reads the runner and either delivers the pitch or steps off to hold.",
    setup: "Softball rubber. Runner at 1B. Coach signals jump-step or hold-tight. Pitcher must read and react.",
    goodRep: [
      "Rise ball spin is preserved (no cheating the release to check the runner).",
      "If runner jumps, you step off the rubber and set — you don't rush a wild pickoff.",
      "Detection is early — you see the jump in the peripheral vision, not the direct eye.",
      "Body language stays calm — don't tip the read.",
    ],
    badRep: [
      "Freezing on the jump — runner takes the extra base.",
      "Wild step-off pickoff that misses the base.",
      "Tipping your read by staring at the runner mid-motion.",
    ],
    feel: "Peripheral, calm, quick — like a goalie tracking multiple shooters.",
    whyToday: "The jump-step read is a softball-specific edge. Elite pitchers own it and shut down aggressive runners.",
    nextLink: "Feeds the pickoff-read-courtesy-runner drill.",
    tierNotes: {
      beginner: "Dry step-off work — no runner. Learn the mechanics. 5 reps.",
      developing: "Coach at 1B, half-speed jumps. 8 reps.",
      advanced: "Full-speed runner. Read + react on every pitch.",
      elite: "Live intrasquad — 0 successful jump-steals allowed in the round.",
    },
  },

  // ============ FIRST BASE ==================================================
  scoop: {
    what:
      "You catch short-hopped and one-hopped throws in the dirt at first base without letting them get past you, saving the out.",
    setup: "1B bag. Partner throws from SS or 3B distance, mixing short-hops (right at your body), medium-hops (last-second bounce), and long-hops (the hardest — reach forward).",
    goodRep: [
      "Feet stay on the bag until you know the throw's flight.",
      "Chest drops LOW — glove works out in front, not down at your side.",
      "You attack the short-hop (catch it as it comes off the ground).",
      "You stretch forward on the long-hop.",
    ],
    badRep: [
      "Standing tall and reaching down at the hop (glove is too high).",
      "Leaving the bag before you have to.",
      "Waiting on the in-between hop instead of attacking it.",
    ],
    feel: "Low, forward, quiet. The scoop should sound like a soft thud, not a slap.",
    whyToday: "Every close play at 1B on a bad throw is decided by a scoop. Elite 1Bs turn bad throws into outs.",
    nextLink: "Same 'chest low, glove forward' pattern used on picks.",
    stopIf: "Sharp lower-back pain on the low scoop — reduce depth for the round.",
    tierNotes: {
      beginner: "Tennis ball / rag ball short-hops from 15 ft, no gear. 3×10.",
      developing: "Real ball from SS distance, 3×15 mix.",
      advanced: "Full-speed BP short-hops from real infielders, 3×15.",
      elite: "Machine-generated short-hops with varying spin, timed rounds. Save rate ≥ 90% or repeat.",
    },
  },
  stretch_pick: {
    what:
      "You stretch off the bag toward the throw to shorten the ball flight and beat the runner on a bang-bang play, without losing contact with the base.",
    setup: "1B bag. Partner throws from all four infield angles (2B, SS, 3B, P). Fielder must stretch to receive without pulling foot off the bag until the catch.",
    goodRep: [
      "Right foot (for RH 1B) starts on the bag, left foot stretches TOWARD the throw.",
      "You do NOT stretch until you see the ball's flight — a low throw needs a lower stretch.",
      "Secure the catch first, THEN worry about the stretch length.",
      "Chin down slightly on the reach — helps balance.",
    ],
    badRep: [
      "Stretching before the throw arrives (you can't adjust to a bad throw).",
      "Losing contact with the bag on the reach (runner is safe).",
      "Reaching one-handed on a routine throw — two hands whenever possible.",
    ],
    feel: "Long, calm, patient — like a dancer holding a pose.",
    whyToday: "Every 1B pick you complete saves a routine out that would've been a runner on with no outs.",
    nextLink: "Same balance pattern as the scoop.",
    tierNotes: {
      beginner: "Walk-through with a partner from 20 ft. Focus on staying on the bag. 3×8.",
      developing: "Real infield distance, medium-velocity throws. 3×12.",
      advanced: "Full-speed BP-distance throws, all four angles. 4 angles × 5.",
      elite: "Live intrasquad throws + errant throws mixed in. Score: 18/20 clean catches or repeat.",
    },
  },
  turn_at_2b: {
    what:
      "The pivot man at 2B receives the feed on a double-play attempt, replaces his feet across the bag, and throws to 1B while clearing the runner.",
    setup: "2B bag. Feed comes from SS or 3B. Runner (or cone) approaches through the bag. Pivot man must feel the bag, catch, and throw over the top of the runner.",
    goodRep: [
      "Catch is over the top of the bag with the glove square to the feed.",
      "Left foot drags across the bag on the pivot (contact = force out).",
      "Throw is short-armed over the runner, not around him.",
      "Chest opens to 1B before the throw.",
    ],
    badRep: [
      "Standing on the bag stationary (the runner takes you out).",
      "Throwing side-arm (ball tails, 1B misses it).",
      "Feet don't touch the bag on the pivot (missed force).",
    ],
    feel: "Rhythmic — catch, drag, throw — one continuous motion.",
    whyToday: "The DP turn is the highest-value defensive play in the sport. Elite middle infielders own it cold.",
    nextLink: "Same feet-and-throw idea as any relay throw.",
    tierNotes: {
      beginner: "Dry footwork, no ball — learn the drag-and-clear. 3×8.",
      developing: "Real ball, no runner. 3×10 with clean feet.",
      advanced: "Real ball + runner (or cone approaching). 3×10.",
      elite: "Live BP double-play situation. Complete both outs in 3.5 s or less.",
    },
  },
  dp_feed: {
    what:
      "The fielder who first fields the ball delivers a clean, catchable feed to the pivot man at 2B so the DP turn can happen without stalling.",
    setup: "SS or 2B position, coach fungoes ground balls. Partner acts as the pivot man at 2B, ready for a clean seam catch.",
    goodRep: [
      "Feed type matches the ball's location: underhand flip if you're on top of the bag, glove-flip if you backhand it, overhand if you're deep.",
      "Ball is thrown at the pivot's LETTERS, not his belt.",
      "Seams are clean — a wobbling feed makes the turn late.",
      "You continue moving through the throw — no dead stops.",
    ],
    badRep: [
      "Underhand flip from too far away (loops, arrives late).",
      "Sidearm feed that tails behind the pivot.",
      "Standing still to throw instead of on the move.",
    ],
    feel: "Quick, quiet, catchable — you're the setup man for the pivot.",
    whyToday: "A great pivot can't fix a bad feed. The feed IS the DP.",
    nextLink: "Pairs with turn-at-2B pivot work.",
    tierNotes: {
      beginner: "Walk-through 3 feed types (underhand, glove-flip, overhand) at 15 ft. 3×5.",
      developing: "Real fungoes, real feeds at DP distance. 3×8.",
      advanced: "Live BP ground balls, pivot man reacts. 3×10.",
      elite: "Live intrasquad DP situations, timed. Feed-to-pivot must arrive with seam intact 9/10.",
    },
  },
  dp_pivot: {
    what:
      "The SS receives the DP feed at 2B, replaces his back foot, and throws to 1B over the top of the sliding runner.",
    setup: "Same as turn-at-2B, but from the SS-specific angle. Feed comes from 2B or 3B. Runner slides through the bag.",
    goodRep: [
      "Right foot (back foot) touches the bag as you catch.",
      "Replace the right foot with the left, using the momentum to throw.",
      "Throw is over the top and over the front hip.",
      "Chest opens to 1B on release.",
    ],
    badRep: [
      "Landing flat-footed on the bag (no momentum to throw).",
      "Trying to spin around the runner instead of throwing over him.",
      "Rushing the catch (bobble kills the DP).",
    ],
    feel: "Clean and efficient — catch, replace, throw in one flow.",
    whyToday: "The SS pivot is the toughest DP turn in the game. Own it and you own the middle infield.",
    nextLink: "Same throw platform as the deep-hole throw.",
    tierNotes: {
      beginner: "Dry footwork, coach walks you through the replace-and-throw. 3×5.",
      developing: "Real feed from 2B at half speed, dry throw to 1B. 3×8.",
      advanced: "Live feed, live runner, real throw. 3×10.",
      elite: "Live BP DP with real slider at 2B. Both outs recorded 9/10.",
    },
  },
  backhand_range: {
    what:
      "You field a ground ball to your throwing-hand side by reaching with your glove-arm across your body (backhand), keeping your weight moving forward.",
    setup: "SS or 3B position. Fungoes to the throwing-hand side, forcing a backhand at the edge of your range.",
    goodRep: [
      "First step is with your throwing-side foot to gain ground.",
      "Glove hand extends with the palm to the ball.",
      "Weight is FORWARD (chest over the glove) — never back.",
      "Field with the ball out in front of your right foot.",
    ],
    badRep: [
      "Reaching sideways with your weight back — you'll spin off and miss the throw.",
      "Sliding to the ball on your knee (only in emergencies).",
      "Trying to catch the ball behind your body (impossible to throw from there).",
    ],
    feel: "Explosive first step, then long and low on the reach.",
    whyToday: "Backhand range is what separates a rangy IF from a stationary one — this is elite defensive real estate.",
    nextLink: "Same weight-forward pattern as slow-roller barehand.",
    stopIf: "Groin or hip flexor strain on the reach — end the round.",
    tierNotes: {
      beginner: "Coach rolls balls at walk pace to the backhand side. Learn the footwork. 3×5.",
      developing: "Fungoes at 60%, 3×8.",
      advanced: "Live BP grounders, real throws to 1B. 3×10.",
      elite: "Machine-fed grounders at 100+ mph exit velocity, throws to 1B on the run. 10/10 or repeat.",
    },
  },
  slow_roller: {
    what:
      "You attack a slow-hit ground ball on the run, field it (glove or barehand), and throw across your body to 1B without slowing down.",
    setup: "3B or SS position. Coach hits or rolls a slow chopper toward the fielder. Runner cone at home to force urgency.",
    goodRep: [
      "You run THROUGH the ball, not to it.",
      "Field off the correct foot — right foot for a barehand, left for a glove-field.",
      "Throw is on the run, over the top, short-armed.",
      "Chest points at 1B on release.",
    ],
    badRep: [
      "Slowing down to field — you'll be too late.",
      "Barehanding a ball that's still spinning fast — glove first.",
      "Throwing off the wrong foot — the ball sails.",
    ],
    feel: "Downhill and controlled — no stops, no gathers, no hesitation.",
    whyToday: "Slow-rollers to 3B decide close games. Reps make the play automatic.",
    nextLink: "Same run-through pattern as OF do-or-die charges.",
    tierNotes: {
      beginner: "Walk-through: coach places the ball, you run through and pretend-throw. 3×6.",
      developing: "Slow-rolled ball, real throw on the run. 3×8.",
      advanced: "Live BP choppers, real 1B throw with runner urgency.",
      elite: "Live intrasquad — timed bat-contact to 1B catch ≤ 3.7 s.",
    },
  },
  deep_hole: {
    what:
      "SS ranges deep into the hole (5.5-hole between SS and 3B), stops on his back foot, jumps, and throws across the diamond to 1B on a rope.",
    setup: "SS position. Coach fungoes hard grounders deep to the SS's backhand side, forcing a full-range play.",
    goodRep: [
      "Crossover step first, then a controlled sprint to the ball.",
      "Field the ball with a two-handed backhand off the correct foot.",
      "Plant the right foot, jump slightly, and throw off the plant.",
      "Throw is over the top and airtight — one clean seam.",
    ],
    badRep: [
      "Throwing off balance without the jump-plant (ball dies or sails).",
      "Trying to throw on the run without the plant (accuracy drops).",
      "Backing up on the reach — you'll never get enough on the throw.",
    ],
    feel: "Full commitment — you're either making the play or not; there's no half-effort in the hole.",
    whyToday: "The deep-hole throw is a signature elite-SS play. Reps build the arm strength and mechanics together.",
    nextLink: "Same throw platform as any long relay throw.",
    stopIf: "Any shoulder or elbow soreness on the throw — cut volume, dry footwork only.",
    tierNotes: {
      beginner: "Dry footwork only — learn the plant and the throw motion, no live throw. 3×4.",
      developing: "Half-speed fungoes, throws to a partner at half distance. 6 reps.",
      advanced: "Full-speed fungoes, real throws to 1B. 8 reps.",
      elite: "Live intrasquad. Ball reaches 1B on a line 8/8 or repeat.",
    },
  },
  relay: {
    what:
      "The relay man from the outfield lines up chest-to-chest with the throw, catches, spins glove-side, and throws to the correct base to hold or catch a runner.",
    setup: "SS or 2B in relay position (about 100–120 ft from the OF). OF throws the ball on a line to the relay's chest. Bases marked to know the target.",
    goodRep: [
      "You align chest-to-chest with the throwing OF — throwing lane is a straight line to the target base.",
      "Two-hand catch, ball goes straight to the throwing hand.",
      "Spin is glove-side (short spin, not a full rotation).",
      "Throw is over the top and airtight to the base.",
    ],
    badRep: [
      "Standing sideways to the throw (ball tails past you).",
      "Full-body spin instead of a short glove-side turn (slow).",
      "Throwing off the wrong foot after the spin (ball sails).",
    ],
    feel: "Athletic and connected — you're the middle of a chain that has to arrive fast.",
    whyToday: "A perfect relay throws out a runner at home or 3B. This is a run-saving play every season.",
    nextLink: "Same throw platform as the deep-hole throw.",
    tierNotes: {
      beginner: "Walk-through with partner at 40 ft. Practice the align-catch-spin. 6 reps.",
      developing: "Half-distance relay, real spin-and-throw. 6 reps.",
      advanced: "Full-distance relay from OF, real 3B/home throw. 8 reps.",
      elite: "Live intrasquad — throw catches the runner at the target base 6/6.",
    },
  },
  popup_communication: {
    what:
      "On a pop-up between fielders, one fielder calls it loudly, the others echo, and everyone else clears out so there's no collision.",
    setup: "IF and OF positions filled. Coach hits high pop-ups that fall between fielders (SS-2B, LF-CF, etc.). Every rep starts with a loud call.",
    goodRep: [
      "One fielder calls the ball LOUD — 'I got it, I got it, I got it!' — before it peaks.",
      "Every other fielder echoes 'you, you, you!' and clears.",
      "Catcher stays late in case someone loses the ball.",
      "The catch is above the head, two hands.",
    ],
    badRep: [
      "Silent tracking — the two fielders collide.",
      "Late call — the ball is dropping before anyone calls it.",
      "Calling then hesitating — commit to the catch.",
    ],
    feel: "Loud, decisive, communal — the pop-up gets ONE owner, not two.",
    whyToday: "A dropped pop-up between fielders is a completely avoidable error. This drill removes that error from your game.",
    nextLink: "Pairs with OF gap reads and infield fly rule situations.",
    tierNotes: {
      beginner: "Two fielders + coach lobs a soft pop between them. Practice the call. 5 reps.",
      developing: "Full IF + OF positioning, medium pops. 5 reps.",
      advanced: "Live fungo pop-ups, coach adds distractions (crowd noise).",
      elite: "Live intrasquad — every pop-up gets a clean call and clean catch or the round repeats.",
    },
  },
  in_between_hops: {
    what:
      "You handle a ground ball that arrives at that awkward tweener distance — too far to short-hop, too close to long-hop. Answer: attack the short-hop and refuse to wait.",
    setup: "3B or SS position. Coach fungoes balls at a distance that forces an in-between hop. Fielder must decide FAST.",
    goodRep: [
      "First move is FORWARD to convert the in-betweener into a short-hop.",
      "Field the ball on the short-hop out in front of you.",
      "Glove works from the ground up, not down at the ball.",
      "Chest stays over the glove.",
    ],
    badRep: [
      "Waiting on the in-between hop (ball eats you up).",
      "Backing up on the ball (ball takes an unpredictable big hop).",
      "Stab at the ball with a stiff wrist.",
    ],
    feel: "Aggressive and forward — you dictate the hop, the hop doesn't dictate you.",
    whyToday: "In-betweeners are the #1 source of infield errors. This drill wires the 'always forward' reflex.",
    nextLink: "Same forward-attack pattern as slow-roller and short-hop scoop work.",
    tierNotes: {
      beginner: "Coach rolls the ball at controlled distances. Learn to step forward. 3×5.",
      developing: "Fungoes at 60%, mixed distances. 3×8.",
      advanced: "Live BP grounders. 3×10.",
      elite: "Machine at variable exit velo, filmed. Clean fields ≥ 9/10 or repeat.",
    },
  },
  drop_step_of: {
    what:
      "On a ball hit over your head, you open your hips with a drop-step in the direction of the ball, then sprint on a straight line to the landing spot.",
    setup: "OF position. Coach fungoes fly balls straight over the OF's head, both to the left and to the right.",
    goodRep: [
      "First move is your OUTSIDE foot dropping back — hips open toward the ball.",
      "You run on the balls of your feet in a straight line (no arcing).",
      "You track the ball with quick head-turns, not by drifting.",
      "You catch on the run, above your head.",
    ],
    badRep: [
      "First step FORWARD (fatal — you'll never catch up).",
      "Turning your back completely on the ball (you lose it).",
      "Arcing to the ball instead of straight-lining.",
    ],
    feel: "Explosive and confident — you decide the path in the first step.",
    whyToday: "The drop-step is what separates an OF who catches everything from one who watches balls fall.",
    nextLink: "Feeds crossover-first-step work.",
    tierNotes: {
      beginner: "Dry footwork, no ball — learn the drop-step in both directions. 3×5.",
      developing: "Coach lobs a fly ball, walk-jog pace. 3×5 each side.",
      advanced: "Full-speed fungoes over the head. 3×8 each side.",
      elite: "Live BP over-the-head balls at max distance. Catch rate ≥ 90% or repeat.",
    },
  },
  crossover_of: {
    what:
      "You take one clean crossover step to open your hips toward the ball, then convert immediately into a full sprint — no drifting, no shuffling.",
    setup: "OF position. Coach fungoes line drives to the OF's side, forcing a crossover.",
    goodRep: [
      "Read the ball, then ONE crossover step (nearside foot crosses over).",
      "Second step is a sprint — no shuffle.",
      "Head stays level; you track the ball, not the ground.",
      "You catch on the run or plant to throw.",
    ],
    badRep: [
      "Two or three shuffle-steps before you run (you're too slow to the ball).",
      "Drifting parallel to the ball's path instead of intercepting it.",
      "Lifting your head up and down while running.",
    ],
    feel: "Direct and fast — the crossover feels like an unfair head start.",
    whyToday: "The crossover is how MLB OFs cover 40 feet in the time everyone else covers 25.",
    nextLink: "Feeds every OF read — line drive, gapper, or do-or-die.",
    tierNotes: {
      beginner: "Dry crossover reps in both directions. 3×5.",
      developing: "Coach lobs a line drive, live crossover + sprint. 3×8.",
      advanced: "Fungoes at real BP speed. 3×10.",
      elite: "Live BP + coach grades first-step direction and speed. Any drift = failed rep.",
    },
  },
  do_or_die: {
    what:
      "A base hit is falling in front of you with a runner rounding third. You charge the ball, field it (glove or barehand), and throw home on the run to save the run.",
    setup: "OF position. Coach hits a low line drive or short fly that's about to drop. Cutoff and catcher in place.",
    goodRep: [
      "Full sprint the moment you read the ball is dropping short.",
      "Field with the glove-side knee down (funnel the ball).",
      "Throw off the RIGHT foot (for a righty), over the top, low trajectory.",
      "Aim for the cutoff man's letters — one clean bounce home.",
    ],
    badRep: [
      "Slowing down to field — the runner scores.",
      "Trying to bare-hand a ball that's still bouncing hard.",
      "Throwing on the wrong foot (rainbow throw, no chance).",
    ],
    feel: "All-in commitment — this is one of the highest-effort plays an OF makes.",
    whyToday: "A do-or-die play saves an actual run. Reps make it a real weapon.",
    nextLink: "Same charge-and-throw pattern used on any base-hit-with-runner situation.",
    tierNotes: {
      beginner: "Walk-through: coach places the ball, you funnel and pretend-throw. 3×6.",
      developing: "Coach rolls the ball at real speed, dry throw. 3×8.",
      advanced: "Live fungoes + real throws to a cutoff. 3×10.",
      elite: "Live intrasquad with real baserunner. Beat the runner home 6/8.",
    },
  },
  one_hop_throw: {
    what:
      "You throw a strong, low line-drive throw from the OF that arrives at the cutoff man's letters after one clean hop, so the ball can be relayed home or to another base without losing time.",
    setup: "OF position with a partner at the cutoff spot. Throw from a real fielding position (do-or-die, drop-step catch, etc.).",
    goodRep: [
      "Ball leaves your hand on a LINE, not a rainbow.",
      "One clean, big hop that arrives at the cutoff's chest/letters.",
      "Cutoff can catch without moving his feet.",
      "Throw is over the top, four-seam grip.",
    ],
    badRep: [
      "Rainbow throw (adds 0.5+ s of hang time).",
      "Two-hoppers (cutoff can't handle it cleanly).",
      "Air-mailing the cutoff (no relay possible).",
    ],
    feel: "Snappy and long — like skipping a stone across water.",
    whyToday: "OF assists come from the one-hop throw. Rainbow arms don't throw runners out.",
    nextLink: "Same throw platform as any long relay throw.",
    stopIf: "Any shoulder or elbow soreness — cut volume 50%.",
    tierNotes: {
      beginner: "Half-distance throws to a partner. Focus on the one-hop rhythm. 3×5.",
      developing: "Full OF distance to a cutoff at 100 ft. 3 per base.",
      advanced: "Full-distance throws home from all three OF spots. 5 each.",
      elite: "Live intrasquad — cutoff can catch without moving 8/10 or repeat.",
    },
  },
  fence: {
    what:
      "You track a deep fly ball toward the fence, find the wall with your GLOVE hand before you jump or brace, and then complete the catch.",
    setup: "OF position with a padded outfield fence. Coach fungoes deep fly balls that force a fence read.",
    goodRep: [
      "You take one look at the fence, then keep your eye on the ball.",
      "Glove hand finds and touches the fence FIRST — that tells you how much space you have.",
      "Two hands on the catch when possible.",
      "You brace or leap AFTER you've located the fence — never blind.",
    ],
    badRep: [
      "Running full-speed at the fence looking only at the ball (collision).",
      "Jumping without first knowing the fence distance (miss-time).",
      "Reaching back one-handed without knowing where the wall is.",
    ],
    feel: "Fast, then patient — sprint to the spot, then a quiet last two steps.",
    whyToday: "Fence work prevents career-ending collisions and turns home runs into outs.",
    nextLink: "Pairs with sun-ball tracking — both are 'external-cue' reads.",
    tierNotes: {
      beginner: "Walk-through: no ball, just find the fence with your glove hand. 5 reps.",
      developing: "Coach lobs a fly ball toward the wall at 60% speed. 3×5.",
      advanced: "Fungoes at real BP speed. 6 reps.",
      elite: "Live BP with wall-scraping fly balls. Catch or bracing decision correct 6/6.",
    },
  },
  sun_ball: {
    what:
      "You track a high fly ball that's coming down through the sun by using your glove hand as a visor to protect your eyes, without losing sight of the ball.",
    setup: "OF position on a sunny day. Coach fungoes fly balls into the sun. If no sun, use a bright light or stadium light for a proxy.",
    goodRep: [
      "You raise your GLOVE HAND (not the mitt) to shade your eyes as you track.",
      "Head stays under the ball — don't drift sideways to escape the sun.",
      "Two hands on the catch if possible.",
      "You commit — sun catches are made by fielders who don't flinch.",
    ],
    badRep: [
      "Waving the glove/mitt frantically (blocks your view completely).",
      "Turning your head away (you lose the ball).",
      "Drifting sideways to escape the sun (you take a bad angle).",
    ],
    feel: "Calm and committed — sun catches are 60% courage.",
    whyToday: "Sun catches decide day games. Reps take the fear out of them.",
    nextLink: "Same tracking pattern as any high fly.",
    tierNotes: {
      beginner: "Coach lobs a high pop, no sun, practice the visor hand. 5 reps.",
      developing: "Real fungo in the sun, half-speed. 5 reps.",
      advanced: "Real BP fungoes in the sun. 6 reps.",
      elite: "Live BP in game conditions. Catch rate ≥ 85%.",
    },
  },
  gap_reads: {
    what:
      "CF works with the corner OF (LF or RF) to communicate loudly and decide which fielder attacks a ball hit in the gap.",
    setup: "OF gap positions filled. Coach hits fungoes into the LF-CF or RF-CF gap. Every rep begins with a loud, early call.",
    goodRep: [
      "CF calls the ball early ('mine, mine, mine!') if he has the better angle.",
      "Corner OF echoes ('yours!') and clears out.",
      "The non-catching OF backs up the play.",
      "The catch is on the run, and the throw is set up before the catch.",
    ],
    badRep: [
      "Silent tracking — both fielders drift into the same spot.",
      "Late call — the ball is already dropping.",
      "Calling then hesitating — commit to the catch.",
    ],
    feel: "Loud, clear, communal — the gap gets one owner.",
    whyToday: "Gap reads decide extra-base hits. Own the communication and you own the gap.",
    nextLink: "Pairs with pop-up communication — same rules, different area.",
    tierNotes: {
      beginner: "Two fielders + coach lobs into the gap, practice the call. 5 reps.",
      developing: "Half-speed fungoes into the gap. 5 reps.",
      advanced: "Live BP gappers. 5 reps.",
      elite: "Live intrasquad — every gap ball gets a clean owner and clean throw.",
    },
  },
  rise_ball_tracking: {
    what:
      "Softball rise-balls come off the bat with backspin that makes them CLIMB. OFs must read the pop off the bat and refuse to take a step in until they're sure of the trajectory.",
    setup: "OF position. Coach or machine feeds rise-ball line drives / high liners off the bat. Fielder starts in a normal OF stance.",
    goodRep: [
      "First step is HOLD — freeze for a half-second and read.",
      "If the ball is climbing, first move is BACK (drop-step).",
      "Track with quick head-turns, no drift.",
      "Catch is on the run or above the head.",
    ],
    badRep: [
      "First step IN — the ball climbs over your head.",
      "Drifting under the ball (spin makes you misjudge).",
      "Taking your eye off the ball to check the fence.",
    ],
    feel: "Patient and disciplined — hold, read, then commit.",
    whyToday: "The 'first-step-in' error is the #1 softball OF mistake. This drill wires the discipline.",
    nextLink: "Pairs with drop-step reads and fence work.",
    tierNotes: {
      beginner: "Coach lobs a rising line drive, walk-through the hold-and-read. 3×5.",
      developing: "Real fungoes at 60%. 3×8.",
      advanced: "Live BP rise-balls. 3×10.",
      elite: "Live intrasquad — 0 first-step-in errors in the round.",
    },
  },
  slap_hit_read: {
    what:
      "A softball slapper drops a soft line drive in front of the OF. OF must charge, come THROUGH the ball, and get it back in fast to prevent the extra base.",
    setup: "OF position. Coach hits a soft line drive that lands just in front of the OF. Cutoff in place.",
    goodRep: [
      "Charge the moment you read the drop — no drift.",
      "Come THROUGH the ball on the run — don't hop back.",
      "Field off the correct foot for a throw.",
      "Throw is on the run to the cutoff, low trajectory.",
    ],
    badRep: [
      "Drifting back to play the ball on a hop (extra base).",
      "Stopping to gather (extra base).",
      "Throwing off balance (sails).",
    ],
    feel: "Aggressive and downhill — you commit to the charge from the first step.",
    whyToday: "Slap hits are meant to steal extra bases. Elite OFs charge and stop them at a single.",
    nextLink: "Same charge-and-throw pattern as do-or-die.",
    tierNotes: {
      beginner: "Walk-through: coach places a ball, you charge and pretend-throw. 3×5.",
      developing: "Coach hits a soft liner, live charge and throw. 3×6.",
      advanced: "Live BP slap hits. 3×8.",
      elite: "Live intrasquad — hitter tries to stretch to a double, you hold him to a single 6/6.",
    },
  },
  rise_pop_up: {
    what:
      "In softball, rise-balls generate pop-ups that carry into shallow OF territory. The IF or 1B calls it early and takes the ball with a glove-side turn to face the play.",
    setup: "IF + OF positions filled. Machine or coach feeds a rise-ball pop-up between IF and OF.",
    goodRep: [
      "Loud, early call from the IF ('I got it, I got it!').",
      "Turn to the glove side to face the field and the play.",
      "Two hands on the catch above the head.",
      "Ready to throw to a base if a runner tags.",
    ],
    badRep: [
      "Silent tracking — pop drops between fielders.",
      "Turning the wrong way (throwing side) — your body blocks your view.",
      "One-handed catch (bobble in the wind).",
    ],
    feel: "Loud, patient, decisive.",
    whyToday: "Rise-ball pop-ups are gimme outs for elite defenses. Reps make the call automatic.",
    nextLink: "Same communication rules as pop-up communication and gap reads.",
    tierNotes: {
      beginner: "Two fielders + coach lobs a pop between them, practice the call. 5 reps.",
      developing: "Real machine-fed pops at 60%. 5 reps.",
      advanced: "Live BP rise-ball pops. 5 reps.",
      elite: "Live intrasquad — every pop gets a clean owner and clean catch.",
    },
  },
};

// ── Family lookup for every drill name in defenseLibrary.ts ─────────────────

const NAME_TO_FAMILY: Record<string, keyof typeof G> = (() => {
  const norms = (arr: string[]) => arr.map(norm);
  const map: Record<string, keyof typeof G> = {};
  const add = (family: keyof typeof G, names: string[]) => {
    for (const n of norms(names)) map[n] = family;
  };
  add("receiving_one_knee", [
    "Driveline one-knee receiving",
    "One-knee receiving — high/low/glove/arm",
    "One-knee receiving — rise + drop",
    "Receiving primer — bottom of zone",
    "Receiving primer — bottom of zone + drop",
    "Receiving vs rise-ball",
  ]);
  add("framing_ladder", ["Framing ladder — 4 corners"]);
  add("blocking_short_hop", [
    "Short-hop blocking angles",
    "Blocking recovery to ball",
    "Blocking — screwball/drop",
  ]);
  add("block_recover", ["Block-and-recover", "Slapper block-and-recover"]);
  add("pop_time", [
    "Pop-time footwork — jab-replace to 2B",
    "Pop-time to 2B",
    "Pop-time to 2B — slapper timing",
    "Live pop-time 1 round",
    "Live pop-time to 2B",
  ]);
  add("foul_pop", ["Foul-pop turn-and-find", "Foul-pop reads"]);
  add("bunt_pick_throw", ["Bunt pick-and-throw to 1B/3B"]);
  add("pfp_1_3_1", ["1-3-1 PFP", "1-3-1 walk-through"]);
  add("comebacker_glove", [
    "Comebacker glove work",
    "Comebackers + turn to 2B",
    "Comebackers + turn",
    "Comebacker primer",
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
    "Slap barehand primer",
  ]);
  add("backup_bases", ["Backup 3B & home"]);
  add("hold_runner", [
    "Slide-step / hold-runner reads",
    "Hold-runner primer",
    "Pickoff read — courtesy runner",
    "Hold runner + pickoff reception",
    "Pickoff to 1B / 2B",
  ]);
  add("windmill_recover", [
    "Windmill follow-through into fielding position",
    "Follow-through into set",
  ]);
  add("rise_hold_throw", ["Rise-ball hold-and-throw"]);
  add("scoop", ["Scoop/short-hop ladder", "Short-hop scoops", "Scoop primer"]);
  add("stretch_pick", [
    "Pick footwork — stretch to all angles",
    "Stretch & pick — 4 angles",
    "Stretch to all angles",
    "Stretch — 4 angles",
  ]);
  add("turn_at_2b", [
    "3-6-3 / 3-6-1 turn",
    "3-6-3 turn",
    "3-6-3",
    "Turn at 2B",
    "Turn at 2B — inside/outside",
    "Turn at 2B vs slap runner",
    "Turn at 2B vs slap",
  ]);
  add("dp_feed", [
    "DP feed to SS — flip, pivot, backhand-glove flip",
    "DP feed to SS — slapper depth (in on grass)",
    "DP feed",
    "DP feeds — 3 types",
    "DP feed primer",
    "Around-the-horn DP feed",
  ]);
  add("dp_pivot", [
    "DP pivot at 2B — replace foot + throw",
    "DP pivot at 2B — quick feed & throw",
    "DP pivot",
    "DP pivot primer",
  ]);
  add("backhand_range", [
    "Backhand & forehand range",
    "Backhand & throw across body",
    "Backhand at line — walk-through",
    "Backhand at the line",
    "Backhand down the line",
    "Backhand primer",
    "Backhand range",
  ]);
  add("slow_roller", [
    "Slow-roller barehand & throw",
    "Slow-roller barehand",
    "Slow-roller primer",
  ]);
  add("deep_hole", ["Deep-hole throw", "Deep-hole primer"]);
  add("relay", [
    "Relay from RF — 2-hand catch, spin, throw",
    "Relay from LF/CF — spin & throw",
  ]);
  add("popup_communication", [
    "Pop-up communication with 2B/OF",
    "Pop-up communication — infield fly rule reps",
  ]);
  add("in_between_hops", ["In-between hop reads"]);
  add("drop_step_of", [
    "Drop-step reads — deep left/right",
    "Drop-step reads — L/R",
    "Drop-step reads — deep L/R",
    "Drop-step reads",
    "Drop-step primer",
  ]);
  add("crossover_of", ["Crossover first step", "Crossover + sprint", "Crossover primer"]);
  add("do_or_die", ["Do-or-die charge", "Do-or-die primer"]);
  add("one_hop_throw", [
    "One-hop throws to 2B / 3B / home",
    "One-hop throws to bases",
    "One-hop throws — home & 3B",
    "One-hop to bases — shorter fence angles",
  ]);
  add("fence", ["Fence work — read, drift, brace", "Fence & sun-ball"]);
  add("sun_ball", ["Sun-ball tracking"]);
  add("gap_reads", ["Gap reads with wing (LF & RF)"]);
  add("rise_ball_tracking", ["Rise-ball tracking", "Rise-ball tracking primer"]);
  add("slap_hit_read", ["Slap-hit read — soft line drive in front"]);
  add("rise_pop_up", ["Rise-ball pop-up read"]);
  return map;
})();

/**
 * Look up the guide for a defense drill by exact name (or secondary-position
 * suffix like "DP pivot (secondary: SS)" — we strip the suffix first).
 */
export function guideForDefense(name: string | null | undefined): DefenseGuide | null {
  if (!name) return null;
  // Strip " (secondary: XX)" suffix used by defenseLibrary.blendSecondary.
  const clean = name.replace(/\s*\(secondary:[^)]+\)\s*$/i, "").trim();
  const family = NAME_TO_FAMILY[norm(clean)];
  return family ? G[family] : null;
}

/** All canonical drill names currently mapped to a guide. */
export function allMappedDefenseDrillNames(): ReadonlyArray<string> {
  return Object.keys(NAME_TO_FAMILY);
}

/** Return the tier note for a drill at the given tier. */
export function tierNoteForDefense(name: string, tier: DefenseTier): string | null {
  const g = guideForDefense(name);
  return g ? g.tierNotes[tier] : null;
}
