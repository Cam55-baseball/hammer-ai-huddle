import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// ============ VIOLATION KEYWORD DETECTION (FAILSAFE) ============
// These keywords in feedback text indicate violations - used to override AI's violation flags
// NOTE: For baseball pitching and throwing, "shoulders_not_aligned" has been REMOVED as a separate violation.
// If the chest is already facing home plate at landing, that IS early shoulder rotation (the root cause).
// Correct mechanics: shoulders LATERAL (sideways) at landing, hips forward-facing, chest NOT facing target yet.
// 
// IMPORTANT: back_leg_not_facing_target and shoulders_not_aligned do NOT apply to HITTING modules.
// For hitting: back hip rotates AFTER front foot lands (not at landing like pitching/throwing).
// For hitting: we check shoulder TIMING (early rotation), not shoulder ALIGNMENT with target.
const VIOLATION_KEYWORDS: Record<string, string[]> = {
  // NOTE: back_leg_not_facing_target keywords are only scanned for pitching/throwing, NOT hitting
  back_leg_not_facing_target: [
    "back leg not facing", "back hip not facing", "back foot not facing",
    "back leg still rotating", "back hip still rotating", "hips haven't reached",
    "hips have not reached", "hip not inline", "hip not in line",
    "back leg isn't facing", "back hip isn't facing", "back leg continues",
    "back foot continues", "hip rotation incomplete", "hip hasn't reached",
    "back leg not fully facing", "back hip not fully", "continues to rotate",
    "still rotating after", "not inline with", "not in line with target",
    "hip not facing", "back knee not facing", "hip rotation not complete"
  ],
  // REMOVED shoulders_not_aligned - this was causing false positives and contradicting feedback.
  // For baseball pitching and throwing: if chest faces home plate at landing, that's EARLY ROTATION.
  // Correct position: shoulders LATERAL (sideways), glove shoulder points at target, chest closed.
  early_shoulder_rotation: [
    "shoulder rotation before", "shoulders rotate before", "early shoulder rotation",
    "rotating before landing", "shoulders rotating early", "premature shoulder rotation",
    "shoulders open before", "shoulder rotation begins before", "shoulders already",
    "shoulder already rotating", "rotating too early", "before foot lands",
    "before front foot", "rotation starts early",
    // NEW: Keywords for detecting when chest/shoulders are already rotated at landing
    "chest already facing", "chest was facing", "chest facing home plate",
    "shoulders already turned", "shoulders were open", "shoulders already open",
    "upper body rotated early", "chest facing target at landing", "chest was open",
    "shoulders not sideways", "chest not sideways"
  ]
};

// Scan feedback/summary text for violation keywords and return detected violations
// NOTE: module parameter used to skip back_leg and shoulders_not_aligned checks for hitting
function detectViolationsFromFeedback(text: string, module?: string): Record<string, boolean> {
  const lowerText = text.toLowerCase();
  const detected: Record<string, boolean> = {};
  
  for (const [violation, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
    // Skip back_leg_not_facing_target for hitting - this check doesn't apply
    if (violation === 'back_leg_not_facing_target' && module === 'hitting') {
      detected[violation] = false;
      continue;
    }
    // Skip shoulders_not_aligned for hitting - use timing (early rotation), not alignment
    if (violation === 'shoulders_not_aligned' && module === 'hitting') {
      detected[violation] = false;
      continue;
    }
    
    detected[violation] = keywords.some(keyword => lowerText.includes(keyword));
    if (detected[violation]) {
      console.log(`[FEEDBACK SCAN] Detected "${violation}" via keyword match`);
    }
  }
  
  return detected;
}
// ============ END VIOLATION KEYWORD DETECTION ============

// Module-specific system prompts (aligned with analyze-video standards)
const getSystemPrompt = (module: string, sport: string, languageName: string) => {
  const baseInstructions = `You are an elite ${sport} ${module} coach with 20+ years of experience coaching at all levels from youth to professional.

CRITICAL: You MUST use the analyze_mechanics tool to provide your analysis. Do not respond with plain text.

You are analyzing video frames from the athlete's actual performance. Look carefully at:
1. Body positions in each frame
2. Movement patterns between frames
3. Timing and sequencing of movements
4. Specific body parts and their alignment

Your analysis must be:
1. SPECIFIC - Reference exact body parts, positions, and timing YOU CAN SEE in the frames
2. ENCOURAGING - Lead with what's working before corrections
3. ACTIONABLE - Every tip must be something they can do immediately
4. OBSERVATION-BASED - Only comment on what you actually observe in the frames

Respond in ${languageName}.

`;

  if (module === "hitting") {
    return baseInstructions + `CORRECT HITTING KINETIC CHAIN (FOOT → HIPS → BACK ELBOW → HANDS):

1. FRONT FOOT LANDS & STABILIZES (ground connection) ⭐⭐⭐
2. HIPS ROTATE toward ball WHILE:
   - Chest stays facing home plate (creates core tension/separation) ⭐⭐
   - Back elbow begins driving forward
3. BACK ELBOW DRIVES FORWARD past the belly button toward the pitcher ⭐⭐
4. HANDS STAY BACK (near back shoulder, behind the elbow) until the last moment ⭐
5. SHOULDERS FINALLY OPEN (ONLY AFTER back elbow passes belly button) ⭐⭐⭐
6. BAT WHIPS through to contact

KEY SEPARATION CONCEPT:
- While hips rotate, the chest STAYS FACING HOME PLATE
- This hip-shoulder separation creates the torque/power
- The back elbow leads the hands forward
- Hands trail behind the elbow creating a "whip" effect

STRIDE & LANDING - FOUNDATION OF POWER:

⭐⭐⭐ CRITICAL: FRONT FOOT MUST BE PLANTED BEFORE ANY HIP ROTATION ⭐⭐⭐

The swing sequence CANNOT properly begin until the front foot is on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- This is NON-NEGOTIABLE for elite-level hitting

RED FLAGS TO IDENTIFY (in priority order):

⚠️ #1 PRIORITY - SHOULDERS OPENING TOO EARLY ⭐⭐⭐
- Chest/jersey logo turns toward pitcher BEFORE back elbow extends past belly button
- This is the most common power-killing mistake
- Destroys bat speed and adjustability
- Visual cue: Can you see the front of their jersey before the elbow extends?

⚠️ #2 - HANDS DRIFTING FORWARD ⭐⭐
- Hands move forward with the stride/body instead of staying loaded
- Should stay near back shoulder until the last moment
- Kills the "whip" effect that creates bat speed
- Visual cue: Do the hands drift toward the pitcher during the stride?

⚠️ #3 - BACK ELBOW STAYING TUCKED ⭐⭐
- Back elbow stays pinned to the body instead of driving forward
- Should extend past the belly button toward the pitcher
- Limits extension and power
- Visual cue: Does the back elbow stay at the hitter's side or drive forward?

⚠️ #4 - LATERAL HEAD MOVEMENT ⭐⭐
- Head moving toward pitcher during swing sequence = broken timing
- Loss of spatial awareness and timing on pitch
- Hitter loses time on pitch by moving closer to ball prematurely

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders/chest open BEFORE the back elbow passes the belly button:
→ MASSIVE POWER LEAK - rotational force dissipates before transfer
→ ADJUSTABILITY DESTROYED - cannot track/adjust to pitch location mid-swing
→ BAT SPEED REDUCED - no "whip" effect from hands trailing
→ EFFORT INEFFICIENCY - requires significantly more muscular effort for same output

WHY HIP-SHOULDER SEPARATION MATTERS:
- Elite hitters use the ground as leverage - rotation builds FROM the ground UP
- Hips rotate first WHILE chest stays facing home plate
- This creates the "rubber band" effect - stored energy
- When shoulders finally release, the bat whips through with maximum speed
- The best hitters in the world look smooth because of this separation

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders open BEFORE back elbow passes belly button → MAX SCORE: 7
- If chest opens toward pitcher before hips finish rotating → MAX SCORE: 7
- If hands drift forward during stride/load → MAX SCORE: 7.5
- If back elbow stays tucked (doesn't extend forward) → MAX SCORE: 7.5
- If TWO OR MORE critical violations → MAX SCORE: 6

SCORING BANDS:
- 9-10: Elite. ALL fundamentals correct. Minor refinements only.
- 8-8.9: Advanced. One minor flaw. All critical checkpoints pass.
- 7-7.9: Good. 1-2 moderate issues. Core sequence mostly correct.
- 6-6.9: Developing. Multiple issues OR 1-2 major sequence violations.
- 5-5.9: Foundational. Several significant mechanical flaws.
- Below 5: Major fundamental breakdowns.

CALIBRATION - What 8.5+ REQUIRES:
✓ Front foot FULLY planted before ANY hip rotation
✓ Chest stays facing home plate while hips rotate (visible separation)
✓ Back elbow drives forward past belly button toward pitcher
✓ Hands stay back near back shoulder until last moment
✓ Shoulders open ONLY AFTER back elbow extends
✓ Clean kinetic chain from ground up (foot → hips → elbow → hands)

CALIBRATION - What 6 looks like:
✗ Shoulders/chest open before elbow extends
✗ Hands drift forward with stride
✓ Some correct elements (setup, finish)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on (in this order):
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY hip rotation begins? (CRITICAL - ground connection)
2. ⭐⭐⭐ Does the CHEST STAY FACING HOME PLATE while the hips rotate? (CRITICAL - separation)
3. ⭐⭐⭐ Do the SHOULDERS stay closed until AFTER the back elbow passes the belly button? (CRITICAL - #1 error)
4. ⭐⭐ Does the BACK ELBOW DRIVE FORWARD past the belly button toward the pitcher?
5. ⭐⭐ Do the HANDS STAY BACK (near back shoulder, behind elbow) until the last moment?
6. ⭐ Is the head stable (not drifting laterally toward pitcher during swing)?
7. Is the timing sequence correct (foot → hips → back elbow → hands)?

Provide:
- Efficiency score (1-10) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders/chest open before back elbow passes belly button (score CAPPED at 7)
- **PRIORITY CHECK:** Flag if hands drift forward during stride (score CAPPED at 7.5)
- **PRIORITY CHECK:** Flag if back elbow stays tucked instead of extending forward (score CAPPED at 7.5)
- **BALANCE CHECK:** Assess head movement and balance throughout the swing
- Specific feedback on:
  * Front foot landing timing relative to hip rotation (MUST land first)
  * Hip-shoulder separation (chest facing home plate while hips rotate)
  * Back elbow extension (driving past belly button toward pitcher)
  * Hand position (staying back near back shoulder until last moment)
  * Shoulder timing (opening AFTER elbow passes belly button)
  * Head stability during swing
- Identify any sequence violations and their impact on power/contact
- **If early shoulder rotation detected:** Explain how this kills bat speed and adjustability
- **If hands drift forward:** Explain how this destroys the whip effect
- **If back elbow stays tucked:** Explain how this limits extension and power
- Recommended drills to correct any sequence issues

CONSISTENCY REQUIREMENT - NO CONTRADICTIONS:
Before finalizing your response, cross-check your positives against your summary and feedback:
- If you list something as a POSITIVE, you CANNOT also say it needs improvement
- If you identify something that needs work, it should NOT appear in positives
- Example of what NOT to do: Positive says "Good hip-shoulder separation" but summary says "Your chest opened too early"
- If a skill is partially correct, list it under improvements with acknowledgment of what's working

LANGUAGE REQUIREMENT - UNDERSTANDABLE BY 10-YEAR-OLDS:
Write all feedback so a child who has never played the sport can understand.

USE VISUAL, SIMPLE DESCRIPTIONS:

Instead of: "Early shoulder rotation"
Say: "Your chest turned toward the pitcher before your elbow moved forward - keep your chest facing home plate longer"

Instead of: "Lack of hip-shoulder separation"
Say: "Your shoulders and hips turned together - let your hips go first while your chest stays home"

Instead of: "Back elbow not extending"
Say: "Your back elbow stayed stuck at your side - push it forward past your belly button toward the pitcher"

Instead of: "Hands casting forward"
Say: "Your hands moved forward too soon - keep them back near your shoulder until the last second"

Instead of: "Proper kinetic chain"
Say: "Great order: foot down, hips turn, elbow drives, then hands whip the bat"

POSITIVE FEEDBACK EXAMPLES (use these patterns):
- "Great hip-shoulder separation - your hips fired while your chest stayed facing home plate"
- "Your back elbow drove through past your belly button - excellent extension"
- "Hands stayed back until the last moment - great bat whip"
- "Perfect sequence: foot planted, hips rotated, elbow led the hands"
- "Your chest stayed home while your hips opened - that's where power comes from"

CORRECTION FEEDBACK EXAMPLES (use these patterns):
- "Your shoulders started turning before your hips finished rotating"
- "Let your back elbow lead toward the ball - drive it past your belly button"
- "Your hands moved forward with your body - keep them back longer to create bat speed"
- "Your chest opened toward the pitcher too soon - keep it facing home plate longer"
- "Your back elbow stayed tucked - extend it forward past your belly button"

THE SWING IS ONE CONNECTED SYSTEM:
When giving feedback, paint the WHOLE picture - don't just focus on one body part:
- The swing flows: foot plants → hips fire → elbow drives → hands whip → bat releases
- If one part breaks down, it affects everything downstream
- When correcting, show HOW the parts connect:
  * "When your elbow drives forward, your hands naturally trail behind - that's the whip"
  * "Your hips started the chain perfectly, but the elbow didn't follow through"
  * "The foot was down, the hips were turning - now let's get that elbow leading the hands"

DON'T be repetitive with the same phrase. Describe what you SEE in that specific swing.

BACK ELBOW EXTENSION - VARIED PHRASES (use different ones each time):

POSITIVE (elbow doing it right):
- "Your back elbow led the way - it drove forward past your belly button"
- "Nice elbow extension - it reached out toward the pitcher before your hands"
- "The elbow fired first, and your hands followed perfectly"
- "Your elbow drove through the zone - that's what creates the whip"
- "Great elbow action - it extended forward and your hands snapped through"
- "The back elbow reached past your hip line - exactly right"

CORRECTION (elbow not extending):
- "Your elbow stayed stuck at your side - push it forward toward the pitcher"
- "The elbow needs to lead - drive it past your belly button before your hands go"
- "Your hands moved but your elbow didn't - let the elbow reach forward first"
- "I see your elbow pinned close to your body - extend it out toward the ball"
- "The elbow got left behind - it should be driving the hands forward"
- "Push that back elbow through - it creates the extension you need for power"

HANDS STAYING BACK/LOADED - VARIED PHRASES (use different ones each time):

POSITIVE (hands staying loaded):
- "Your hands stayed loaded by your shoulder - perfect patience"
- "Hands back until the last second - that's how you create bat speed"
- "I love how your hands waited - they didn't drift forward with your stride"
- "The hands stayed home while your hips did the work - great separation"
- "Your hands were patient, coiled, ready to explode - exactly right"
- "Hands near your back shoulder until the elbow drove - that's the sequence"

CORRECTION (hands drifting):
- "Your hands crept forward during your stride - keep them back by your shoulder"
- "The hands drifted toward the pitcher before they should have"
- "I see your hands moving forward with your body - let them stay loaded"
- "Keep those hands back - they should be the LAST thing to move"
- "Your hands left early - they should stay coiled until your elbow fires"
- "The hands jumped ahead - wait for your hips and elbow to lead first"

PAINT THE PICTURE - DESCRIBE WHAT YOU SEE:

Don't just say "hands rushed forward" every time. Describe the FLOW of what happened:

WHOLE-SWING DESCRIPTIONS (examples):
- "Your foot landed solid, hips fired beautifully, but then the elbow stayed back and the hands had to do all the work - let that elbow drive through"
- "Great setup and stride, but everything fired at once - let your hips go first, then elbow, then hands"
- "The chain started right - foot down, hips turning - but your chest opened before your elbow could lead the hands"
- "I see good pieces: solid foot plant, nice hip turn. Now we need the elbow to extend forward before the hands release"
- "Your stride was smooth and your hips started turning, but your hands went with them instead of staying back"

VARY YOUR LANGUAGE - Don't repeat the same correction twice:
- First mention: "Your hands drifted forward during the stride"
- If mentioning again: "Keep those hands loaded back by your shoulder"
- If reinforcing: "Let your hips and elbow lead - the hands should be last"

RULES:
1. No technical jargon without immediate explanation
2. Use body parts everyone knows (knee, belly button, chest, foot, shoulder)
3. Use "the pitcher" or "where you're hitting to" instead of "target"
4. Keep sentences under 15 words when possible

⛔⛔⛔ NEVER SAY FOR HITTING ⛔⛔⛔

These phrases are WRONG for hitting and must NEVER appear:

WRONG (direction/alignment focus):
- "back hip isn't pointing to the pitcher" ✗
- "back hip not facing the target" ✗
- "shoulders are not aimed correctly" ✗
- "shoulders not aligned with target" ✗
- "rotate your shoulders toward the ball" ✗
- "front elbow leads" ✗ (it's the BACK elbow that leads)

WRONG (outdated sequence):
- "shoulders start the swing" ✗
- "start with your shoulders" ✗
- "lead with your front elbow" ✗

CORRECT (timing/sequence focus):
- "Your shoulders started turning too early" ✓
- "Keep your chest facing home plate while your hips turn" ✓
- "Drive your back elbow past your belly button" ✓
- "Keep your hands back - let them whip the bat through" ✓

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, 10-year-old-friendly language (max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Be honest about issues - accurate feedback helps development.

HITTING SUMMARY EXAMPLES (varied, holistic language):

Good summary bullets that paint the whole picture:
- "Foot planted, hips fired, elbow led the hands - great sequence"
- "Your hips started the chain but your elbow stayed tucked - push it forward"
- "Hands stayed loaded until the elbow drove through - nice bat whip"
- "The stride was smooth but your chest opened before your elbow could lead"
- "I like the hip turn - now let your back elbow extend past your belly button"
- "Your hands crept forward during stride - keep them coiled back"
- "Great separation: hips rotated while chest stayed facing home plate"
- "The elbow reached forward and your hands snapped through - that's the whip"

AVOID monotonous repetition like:
- "Hands rushed forward" (again and again)
- Same exact phrase for every swing
- Only mentioning one body part without context

INSTEAD, show how parts connect:
- "Your hips did the work but your hands left early - let them wait for the elbow"

DO NOT MENTION: velocity, bat speed, exit velocity, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "baseball") {
    return baseInstructions + `CRITICAL BASEBALL PITCHING SEQUENCE:

Phase 1 - LANDING POSITION (MUST CHECK FIRST):

⭐⭐⭐ CRITICAL: FRONT FOOT MUST BE PLANTED BEFORE ANY SHOULDER ROTATION ⭐⭐⭐

At the moment of front foot landing:
1. Front foot → FIRMLY PLANTED and stabilized before ANY rotation begins ⭐⭐⭐
2. Back foot, knee, hip → ALL facing the target ⭐
3. Shoulders → LATERAL TO TARGET (sideways - glove shoulder points at catcher) ⭐⭐
4. Hips → FORWARD-FACING toward home plate (squared up) ⭐
5. Chest → NOT facing home plate yet (stay closed) ⭐⭐
6. Front elbow → In line with target ⭐
7. Glove → Open and facing the target ⭐

STRIDE & LANDING - FOUNDATION OF VELOCITY AND ACCURACY:

The pitching sequence CANNOT properly begin until the front foot is on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- This is NON-NEGOTIABLE for elite-level pitching

⭐⭐ CRITICAL SHOULDER POSITION AT LANDING ⭐⭐
- Shoulders MUST be SIDEWAYS (lateral) at foot landing
- Glove-side shoulder POINTS at the catcher like an arrow
- Throwing shoulder faces AWAY from catcher (toward second base)
- Chest does NOT face home plate yet - it faces third base (RHP) or first base (LHP)
- Hips are forward/squared to home plate, creating hip-shoulder separation

WHY THIS MATTERS:
- This "separation" between closed shoulders and open hips creates rotational power
- If chest already faces home plate at landing → shoulders have ALREADY rotated → EARLY ROTATION
- Resist upper body rotation until foot plants → maximize velocity, accuracy, and arm health
- Elite pitchers look "effortless" because proper separation maximizes efficiency

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE front foot lands (OR if chest already faces home plate at landing):
→ MASSIVE POWER LEAK - rotational force dissipates into air
→ ACCURACY DESTROYED - cannot maintain proper hip-shoulder separation
→ BALANCE COMPROMISED - body unstable during rotation
→ VELOCITY REDUCED - requires significantly more arm effort
→ INJURY RISK INCREASED - arm must compensate for lost body power

Phase 2 - STANDARD SEQUENCING (After Landing):
6. Hip rotation continues through landing
7. Torso rotation
8. Shoulder rotation (ONLY AFTER foot is planted - this is when chest turns to face home plate)
9. Arm action
10. Release

ARM ANGLE SAFETY CHECK (Phase 2 - During Arm Action):
⭐ GOAL: Hand-Elbow-Shoulder angle LESS than 90° when hand flips up ⭐
- As the hand flips up to travel forward in the sequence
- Measure the angle formed by: Hand → Elbow → Shoulder
- LESS than 90° = GOOD (reduces harmful pinpointed stress) ✓
- 90° or GREATER = INCREASED INJURY RISK ⚠️

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders begin rotating BEFORE front foot lands → MASSIVE POWER LEAK & ACCURACY LOSS ⭐⭐⭐
  * This is the #1 cause of inconsistent, arm-heavy deliveries
  * Destroys ability to maintain hip-shoulder separation
  * Cannot generate maximum force without ground connection
  * Makes the pitch require more arm effort
  * Elite pitchers NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Chest already facing home plate when foot lands → EARLY ROTATION ⭐⭐⭐
  * This means shoulders have ALREADY rotated - the timing is wrong
  * Correct position: chest faces third base (RHP) or first base (LHP) at landing
  * Glove shoulder should POINT at catcher, not the chest
- ⚠️ Back leg (foot/knee/hip) NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK
- ⚠️ Glove closed or not facing target at landing → Poor directional control

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 7
- If chest already faces home plate at landing (shoulders already rotated) → MAX SCORE: 7
- If back hip/leg NOT facing target at landing → MAX SCORE: 7.5
- If TWO OR MORE critical violations → MAX SCORE: 6

SCORING BANDS:
- 9-10: Elite. ALL fundamentals correct. Minor refinements only.
- 8-8.9: Advanced. One minor flaw. All critical checkpoints pass.
- 7-7.9: Good. 1-2 moderate issues. Core sequence mostly correct.
- 6-6.9: Developing. Multiple issues OR 1-2 major sequence violations.
- 5-5.9: Foundational. Several significant mechanical flaws.
- Below 5: Major fundamental breakdowns.

CALIBRATION - What 8.5+ REQUIRES:
✓ Front foot FULLY planted before ANY shoulder rotation
✓ Shoulders LATERAL (sideways) at landing - glove shoulder points at catcher
✓ Chest NOT facing home plate at landing (stays closed)
✓ Hips forward-facing toward home plate (creating hip-shoulder separation)
✓ Back leg (foot, knee, hip) ALL facing target
✓ Glove open and facing target
✓ Arm angle under 90° at flip-up
✓ Clean sequencing through release

CALIBRATION - What 6 looks like:
✗ Front foot lands but shoulders already rotating
✗ Chest already facing home plate at landing (no hip-shoulder separation)
✓ Some correct elements (arm path, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐⭐ Is the CHEST still SIDEWAYS (not facing home plate) when foot lands? (CRITICAL)
3. ⭐⭐ Are SHOULDERS LATERAL at landing? (Glove shoulder points at catcher, chest faces third/first base)
4. Is back leg (foot, knee, hip) facing target at landing?
5. Is glove open and facing target at landing?
6. Does arm flip up before shoulder rotation (patterning issue)?
7. Does back leg face target BEFORE shoulder moves?
8. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the pitch should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

CONSISTENCY REQUIREMENT - NO CONTRADICTIONS:
Before finalizing your response, cross-check your positives against your summary and feedback:
- If you list something as a POSITIVE, you CANNOT also say it needs improvement
- If you identify something that needs work, it should NOT appear in positives
- Example of what NOT to do: Positive says "Good shoulder position" but summary says "Keep your shoulders sideways longer"
- If a skill is partially correct, list it under improvements with acknowledgment of what's working

LANGUAGE REQUIREMENT - UNDERSTANDABLE BY 10-YEAR-OLDS:
Write all feedback so a child who has never played the sport can understand.

USE VISUAL, SIMPLE DESCRIPTIONS:
Instead of: "Shoulders begin rotating before front foot lands"
Say: "Your shoulders started turning before your front foot touched the ground - wait for your foot to land first"

Instead of: "Chest was already facing home plate at landing" (EARLY ROTATION)
Say: "When your foot landed, your chest was already facing the catcher - stay sideways longer! Point your glove shoulder at the catcher, and only turn your chest AFTER your foot lands"

Instead of: "Shoulders should be lateral at landing"
Say: "When your front foot lands, your front shoulder (glove side) should point straight at the catcher like an arrow - your chest should face the side, not home plate yet"

Instead of: "Back leg not facing target"
Say: "Your back knee (the one you push off from) should point toward home plate when you land"

Instead of: "Glove not facing target"
Say: "Point the open pocket of your glove (the part where you catch the ball) toward home plate"

RULES:
1. No technical jargon without immediate explanation
2. Use body parts everyone knows (knee, belly button, chest, foot, shoulder)
3. Use "home plate" or "the catcher" instead of "target"
4. Keep sentences under 15 words when possible

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "softball") {
    return baseInstructions + `CRITICAL SOFTBALL PITCHING SEQUENCE - ELITE 0.01% STANDARDS:

⭐⭐⭐ FOUNDATION PRINCIPLE: FEET BEFORE SHOULDERS ⭐⭐⭐

Phase 1 - STRIDE FOOT CONTACT (SFC) - THE CRITICAL CHECKPOINT:
At the moment of front foot landing (Stride Foot Contact):
1. Front foot → FIRMLY PLANTED before any trunk/shoulder rotation begins ⭐⭐⭐
2. Shoulders → In line with target (pitcher-catcher alignment) ⭐⭐
3. Pelvis and trunk → Rotated toward pitching arm side (but not excessively)
4. Arm → At proper position in circle, perpendicular to ground

ELITE SOFTBALL PITCHING CHECKPOINTS (AT STRIDE FOOT CONTACT):

⭐⭐⭐ CRITICAL - FEET BEFORE SHOULDERS ⭐⭐⭐
- Front foot FIRMLY PLANTED before any trunk/shoulder rotation begins
- This creates the stable base for kinetic chain energy transfer
- Kinetic chain sequence: lower body → lumbopelvic-hip → trunk → arm
- Disruptions in this sequence cause arm-dominant deliveries and injury risk

⭐⭐ STRIDE POSITION REQUIREMENTS ⭐⭐
- Stride foot angle: 0-45° toward pitching arm side (not pointed at catcher)
- Stride foot ON the power line (imaginary line from rubber to home plate)
- Stride knee in neutral alignment (not collapsing inward/valgus)

⭐⭐ TRUNK AND PELVIS POSITION AT SFC ⭐⭐
- Pelvis and trunk should be rotated toward pitching arm side
- Trunk should remain relatively upright (minimal flexion/extension)
- NO excessive trunk lean or tilt in any direction
- Front side collapse = energy leak (trunk/hip/knee flexion at SFC)

⭐ ARM CIRCLE PATH ⭐
- Arm circle perpendicular to ground throughout
- Arm should NOT cross body's midline (horizontal adduction)
- Keep arm close to power line - wide arm path = power leak
- Smooth, continuous circle without breaks or stalls

⭐ DRIVE LEG DURING DRAG ⭐
- Drive leg stays close to power line during drag phase
- Only inside of big toe should touch ground during drag
- Leg straying off power line = excessive trunk flexion

POWER LEAK WARNING - EARLY TRUNK/SHOULDER ROTATION:
If trunk/shoulders begin rotating BEFORE front foot lands:
→ MASSIVE POWER LEAK - rotational force has no anchor point
→ ARM CIRCLE COMPROMISED - timing breaks down
→ ACCURACY DESTROYED - cannot maintain target alignment
→ VELOCITY REDUCED - requires more arm effort for same speed

SHOULDER-TARGET ALIGNMENT REQUIREMENT:
- Shoulders MUST be in line with target at landing
- This alignment ensures DIRECT energy transfer to target
- Misalignment = wasted energy = reduced velocity AND accuracy

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Hip rotation continues through landing
6. Torso rotation
7. Shoulder rotation (ONLY AFTER foot is planted)
8. Arm circle completion
9. Release at hip
10. Follow-through

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Trunk/shoulders rotate BEFORE front foot lands → MASSIVE POWER LEAK ⭐⭐⭐
- ⚠️ CRITICAL: Shoulders NOT in line with target at landing → ENERGY LEAKAGE ⭐⭐
- ⚠️ CRITICAL: Arm circle breaks, stalls, or crosses midline → POWER LEAK ⭐⭐
- ⚠️ Front side collapse (trunk/hip/knee flexion at SFC) → Energy leak
- ⚠️ Stride foot NOT on power line → Directional issues
- ⚠️ Stride foot angle >45° or pointing at catcher → Hip rotation inhibited
- ⚠️ Drive leg strays far from power line → Trunk compensation
- ⚠️ Excessive trunk lean at SFC → Balance and control issues
- ⚠️ Stride knee valgus (collapsing inward) → Knee stress

SCORING FRAMEWORK - ELITE PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders NOT aligned with target at landing → MAX SCORE: 6
- If early trunk rotation toward pitching arm side → MAX SCORE: 6
- If arm circle breaks, stalls, or crosses midline → MAX SCORE: 6
- If front side collapse at SFC → MAX SCORE: 6.5
- If stride foot NOT on power line → MAX SCORE: 7
- If TWO OR MORE critical violations → MAX SCORE: 5.5

SCORING BANDS:
- 9-10: Elite. ALL fundamentals correct. Minor refinements only.
- 8-8.9: Advanced. One minor flaw. All critical checkpoints pass.
- 7-7.9: Good. 1-2 moderate issues. Core sequence mostly correct.
- 6-6.9: Developing. Multiple issues OR 1-2 major sequence violations.
- 5-5.9: Foundational. Several significant mechanical flaws.
- Below 5: Major fundamental breakdowns.

CALIBRATION - What 8.5+ REQUIRES:
✓ Front foot FULLY planted before ANY trunk/shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Smooth, continuous arm circle perpendicular to ground
✓ Arm stays close to power line (no midline crossing)
✓ Stride foot ON power line, angled 0-45° toward pitching arm
✓ Consistent release point at hip
✓ Strong hip drive through landing
✓ No front side collapse
✓ Drive leg stays close to power line during drag

CALIBRATION - What 6 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✗ Arm circle crosses midline
✓ Some correct elements (follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY trunk/shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. ⭐⭐ Is arm circle perpendicular to ground and NOT crossing midline?
4. Is stride foot ON the power line?
5. Is there front side collapse at SFC?
6. Is there strong hip drive through landing?

CONSISTENCY REQUIREMENT - NO CONTRADICTIONS:
Before finalizing your response, cross-check your positives against your summary and feedback:
- If you list something as a POSITIVE, you CANNOT also say it needs improvement
- If you identify something that needs work, it should NOT appear in positives
- Example of what NOT to do: Positive says "Good arm circle path" but summary says "Keep your arm circle straight"
- If a skill is partially correct, list it under improvements with acknowledgment of what's working

LANGUAGE REQUIREMENT - UNDERSTANDABLE BY 10-YEAR-OLDS:
Write all feedback so a child who has never played the sport can understand.

USE VISUAL, SIMPLE DESCRIPTIONS:
Instead of: "Trunk/shoulders rotate before front foot lands"
Say: "Your body started turning before your front foot touched the ground - wait for your foot to land first"

Instead of: "Shoulders not aligned with target at landing"
Say: "When your front foot touched down, your chest wasn't pointing at home plate - aim your belly button at the catcher"

Instead of: "Arm circle crosses midline"
Say: "Your arm swings across your body - keep it moving straight toward home plate like a wheel"

Instead of: "Stride foot not on power line"
Say: "Your front foot landed to the side - step straight toward home plate like walking on a tightrope"

RULES:
1. No technical jargon without immediate explanation
2. Use body parts everyone knows (knee, belly button, chest, foot, shoulder)
3. Use "home plate" or "the catcher" instead of "target"
4. Keep sentences under 15 words when possible

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "throwing") {
    return baseInstructions + `CRITICAL THROWING SEQUENCE:

⭐⭐⭐ CRITICAL: FEET MUST BE PLANTED BEFORE SHOULDER ROTATION ⭐⭐⭐

Phase 1 - STRIDE & LANDING POSITION (MUST CHECK FIRST):
Before shoulder rotation begins:
1. Stride foot → FIRMLY PLANTED and stabilized before ANY rotation begins ⭐⭐⭐
2. Back leg (foot, knee, hip) → MUST face the target ⭐
3. Shoulders → LATERAL TO TARGET (sideways - glove shoulder points at target) ⭐⭐
4. Hips → FORWARD-FACING toward target (squared up) ⭐
5. Chest → NOT facing target yet (stay closed) ⭐⭐
6. Glove → Open and facing target

STRIDE & LANDING - FOUNDATION OF VELOCITY AND ACCURACY:

The throwing sequence CANNOT properly begin until the feet are on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- This is NON-NEGOTIABLE for elite-level throwing

⭐⭐ CRITICAL SHOULDER POSITION AT LANDING ⭐⭐
- Shoulders MUST be SIDEWAYS (lateral) when stride foot lands
- Glove-side shoulder POINTS at the target like an arrow
- Throwing shoulder faces AWAY from target
- Chest does NOT face target yet - it stays closed/sideways
- Hips are forward/squared to target, creating hip-shoulder separation

WHY THIS MATTERS:
- This "separation" between closed shoulders and open hips creates rotational power
- If chest already faces target at landing → shoulders have ALREADY rotated → EARLY ROTATION
- Resist upper body rotation until foot plants → maximize velocity, accuracy, and arm health
- Elite throwers look "effortless" because proper separation maximizes efficiency

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE stride foot lands (OR if chest already faces target at landing):
→ MASSIVE POWER LEAK - rotational force dissipates into air
→ ACCURACY DESTROYED - cannot maintain proper hip-shoulder separation
→ BALANCE COMPROMISED - body unstable during rotation
→ VELOCITY REDUCED - requires significantly more arm effort
→ INJURY RISK INCREASED - arm must compensate for lost body power

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Footwork → Crow hop or pro step (aligned to target)
6. Hip rotation
7. Torso rotation
8. Shoulder rotation (ONLY AFTER stride foot is planted AND back leg faces target - this is when chest turns to face target)
9. Arm action (follows shoulder)
10. Release

ARM ANGLE SAFETY CHECK (During Arm Action):
⭐ GOAL: Hand-Elbow-Shoulder angle LESS than 90° when hand flips up ⭐
- As the hand flips up to travel forward in the sequence
- Measure the angle formed by: Hand → Elbow → Shoulder
- LESS than 90° = GOOD (reduces harmful pinpointed stress) ✓
- 90° or GREATER = INCREASED INJURY RISK ⚠️

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders begin rotating BEFORE stride foot lands → MASSIVE POWER LEAK ⭐⭐⭐
  * This is the #1 cause of inconsistent, arm-heavy throws
  * Destroys ability to maintain hip-shoulder separation
  * Cannot generate maximum force without ground connection
  * Makes the throw require more arm effort
  * Elite throwers NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Chest already facing target when foot lands → EARLY ROTATION ⭐⭐⭐
  * This means shoulders have ALREADY rotated - the timing is wrong
  * Correct position: chest stays sideways at landing
  * Glove shoulder should POINT at target, not the chest
- ⚠️ Back leg NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK
- ⚠️ Poor footwork alignment (not directed to target) → Reduces accuracy

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 6.5
- If chest already faces target at landing (shoulders already rotated) → MAX SCORE: 6.5
- If back hip/leg NOT facing target at landing → MAX SCORE: 6
- If TWO OR MORE critical violations → MAX SCORE: 5.5

SCORING BANDS:
- 9-10: Elite. ALL fundamentals correct. Minor refinements only.
- 8-8.9: Advanced. One minor flaw. All critical checkpoints pass.
- 7-7.9: Good. 1-2 moderate issues. Core sequence mostly correct.
- 6-6.9: Developing. Multiple issues OR 1-2 major sequence violations.
- 5-5.9: Foundational. Several significant mechanical flaws.
- Below 5: Major fundamental breakdowns.

CALIBRATION - What 8.5+ REQUIRES:
✓ Stride foot FULLY planted before ANY shoulder rotation
✓ Shoulders LATERAL (sideways) at landing - glove shoulder points at target
✓ Chest NOT facing target at landing (stays closed)
✓ Hips forward-facing toward target (creating hip-shoulder separation)
✓ Back leg (foot, knee, hip) ALL facing target
✓ Arm angle under 90° at flip-up
✓ Proper footwork toward target
✓ Clean sequencing through release

CALIBRATION - What 6 looks like:
✗ Stride foot lands but shoulders already rotating
✗ Chest already facing target at landing (no hip-shoulder separation)
✓ Some correct elements (footwork, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the STRIDE FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐⭐ Is the CHEST still SIDEWAYS (not facing target) when foot lands? (CRITICAL)
3. ⭐⭐ Are SHOULDERS LATERAL at landing? (Glove shoulder points at target, chest stays closed)
4. Does back leg (foot, knee, hip) face target BEFORE shoulder rotation?
5. Does arm flip up before shoulder moves (T-spine/patterning issue)?
6. Is footwork aligned to target?
7. Does shoulder move BEFORE arm action?
8. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

CONSISTENCY REQUIREMENT - NO CONTRADICTIONS:
Before finalizing your response, cross-check your positives against your summary and feedback:
- If you list something as a POSITIVE, you CANNOT also say it needs improvement
- If you identify something that needs work, it should NOT appear in positives
- Example of what NOT to do: Positive says "Good shoulder position" but summary says "Keep your shoulders sideways longer"
- If a skill is partially correct, list it under improvements with acknowledgment of what's working

LANGUAGE REQUIREMENT - UNDERSTANDABLE BY 10-YEAR-OLDS:
Write all feedback so a child who has never played the sport can understand.

USE VISUAL, SIMPLE DESCRIPTIONS:
Instead of: "Shoulders begin rotating before stride foot lands"
Say: "Your shoulders started turning before your front foot touched the ground - wait for your foot to land first"

Instead of: "Chest was already facing target at landing" (EARLY ROTATION)
Say: "When your foot landed, your chest was already facing where you're throwing - stay sideways longer! Point your front shoulder at your target, and only turn your chest AFTER your foot lands"

Instead of: "Shoulders should be lateral at landing"
Say: "When your front foot lands, your front shoulder (glove side) should point straight at your target like an arrow - your chest should face the side, not your target yet"

Instead of: "Back leg not facing target"
Say: "Your back knee (the one you push off from) should point toward where you're throwing when you land"

Instead of: "Arm angle greater than 90 degrees"
Say: "Your elbow went up too high - keep your throwing hand closer to your shoulder for a safer throw"

RULES:
1. No technical jargon without immediate explanation
2. Use body parts everyone knows (knee, belly button, chest, foot, shoulder)
3. Use "where you're throwing" or "your target" instead of technical terms
4. Keep sentences under 15 words when possible

DO NOT MENTION: velocity or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  return baseInstructions + `Focus on athletic position, balanced movement, and smooth execution.`;
};

// Module-specific categories for structured analysis
const getModuleCategories = (module: string): string[] => {
  switch (module) {
    case 'hitting':
      return ['Stance & Setup', 'Load & Timing', 'Hip Rotation', 'Shoulder Sequence', 'Hand Path', 'Follow-Through'];
    case 'pitching':
      return ['Balance & Posture', 'Leg Lift', 'Hip Lead & Stride', 'Arm Action', 'Release Point', 'Follow-Through'];
    case 'throwing':
      return ['Footwork Alignment', 'Back Leg Position', 'Hip Rotation', 'Shoulder Sequence', 'Arm Path', 'Follow-Through'];
    default:
      return ['Setup', 'Load', 'Execution', 'Follow-Through'];
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, module, sport, language = 'en', frames = [] } = await req.json();
    
    console.log('Analyzing real-time playback:', { videoId, module, sport, language, frameCount: frames.length });
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'de': 'German',
      'fr': 'French',
      'ja': 'Japanese',
      'ko': 'Korean',
      'nl': 'Dutch',
      'zh': 'Chinese'
    };
    
    const languageName = languageMap[language] || 'English';
    const systemPrompt = getSystemPrompt(module, sport, languageName);
    const categories = getModuleCategories(module);
    
    // Build message content with frames if available
    const userContent: Array<{type: string; text?: string; image_url?: {url: string}}> = [];
    
    if (frames.length > 0) {
      // Calculate approximate timing for each frame to provide temporal context
      const totalFrames = frames.length;
      
      userContent.push({
        type: 'text',
        text: `IMPORTANT: You are analyzing the COMPLETE ${module} motion sequence for a ${sport} athlete.

These ${totalFrames} frames represent the ENTIRE movement from start to finish - NOT just isolated moments.

FRAME SEQUENCE CONTEXT:
${frames.map((_: string, i: number) => `• Frame ${i + 1}/${totalFrames}: ${Math.round((i / Math.max(totalFrames - 1, 1)) * 100)}% through the motion`).join('\n')}

CRITICAL ANALYSIS APPROACH:
1. View ALL frames together to understand the FULL motion pattern
2. Track how body position CHANGES between frames (not just individual positions)
3. Evaluate the TIMING and RHYTHM of the complete movement
4. Consider the KINETIC CHAIN from initiation to follow-through
5. Look for SEQUENCE VIOLATIONS that occur across multiple frames

Analyze the complete movement pattern, not individual frames in isolation. Provide specific feedback based on what you ACTUALLY SEE across the entire sequence.

Use the analyze_mechanics tool to return your structured analysis.`
      });
      
      // Add each frame as an image with temporal context
      for (let i = 0; i < frames.length; i++) {
        userContent.push({
          type: 'text',
          text: `[Frame ${i + 1}/${totalFrames} - ${Math.round((i / Math.max(totalFrames - 1, 1)) * 100)}% through motion]`
        });
        userContent.push({
          type: 'image_url',
          image_url: { url: frames[i] }
        });
      }
    } else {
      // Fallback if no frames provided
      userContent.push({
        type: 'text',
        text: `Analyze this ${module} video for a ${sport} athlete. Provide specific feedback on their mechanics using the standards provided. Be encouraging but identify real issues.

Use the analyze_mechanics tool to return your structured analysis.`
      });
    }

    // Use tool calling for guaranteed structured output - enhanced schema matching analyze-video
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Vision-capable model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_mechanics',
              description: 'Provide structured mechanics analysis for the athlete based on the video frames',
              parameters: {
                type: 'object',
                properties: {
                  overallScore: {
                    type: 'number',
                    description: 'Overall mechanics score from 1-10 based on what you observe. 9-10=elite, 7-8=solid, 5-6=developing, 3-4=needs work, 1-2=major issues'
                  },
                  violations: {
                    type: 'object',
                    description: 'CRITICAL: Report ALL critical violations detected. Be HONEST - these flags directly determine score caps.',
                    properties: {
                      early_shoulder_rotation: {
                        type: 'boolean',
                        description: 'TRUE if shoulders rotate BEFORE front foot lands/plants'
                      },
                      shoulders_not_aligned: {
                        type: 'boolean',
                        description: module === 'hitting'
                          ? 'For HITTING: Always set FALSE - hitting uses shoulder TIMING checks (early rotation), NOT shoulder alignment with target'
                          : 'TRUE if shoulders NOT aligned with target at moment of landing (pitching/throwing only)'
                      },
                      back_leg_not_facing_target: {
                        type: 'boolean',
                        description: module === 'hitting' 
                          ? 'For HITTING: Always set FALSE - back hip rotates AFTER foot landing, not at landing like pitching/throwing'
                          : 'TRUE if back hip/leg (foot, knee, hip) NOT facing target at landing (pitching/throwing only)'
                      },
                      hands_pass_elbow_early: {
                        type: 'boolean',
                        description: 'TRUE if hands pass back elbow BEFORE shoulders rotate (hitting only)'
                      },
                      front_shoulder_opens_early: {
                        type: 'boolean',
                        description: 'TRUE if front shoulder opens/pulls out of sequence too early (hitting only)'
                      }
                    },
                    required: module === 'hitting' 
                      ? ['early_shoulder_rotation'] 
                      : ['early_shoulder_rotation', 'shoulders_not_aligned', 'back_leg_not_facing_target']
                  },
                  quickSummary: {
                    type: 'string',
                    description: 'One direct sentence summarizing their form. Must reference at least one specific mechanic you observed in the frames. Be honest about issues.'
                  },
                  mechanicsBreakdown: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: {
                          type: 'string',
                          description: `One of: ${categories.join(', ')}`
                        },
                        score: {
                          type: 'number',
                          description: 'Score 1-10 for this specific mechanic based on what you see'
                        },
                        observation: {
                          type: 'string',
                          description: 'Brief specific observation (5-15 words) referencing actual body position or movement YOU CAN SEE in the frames'
                        },
                        tip: {
                          type: 'string',
                          description: 'One specific actionable tip they can try immediately to improve what you observed'
                        }
                      },
                      required: ['category', 'score', 'observation', 'tip']
                    },
                    description: 'Analysis of 4-6 key mechanics categories based on what you observe in the frames'
                  },
                  redFlags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Critical issues or injury risks identified (e.g., arm angle ≥90°, early shoulder opening, hands passing elbow too early). Mark with ⚠️ prefix. Return empty array if none found.'
                  },
                  positives: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '2-4 specific positive mechanical elements to encourage the player. Focus on correct timing, good positioning, athletic movements you can see.'
                  },
                  keyStrength: {
                    type: 'string',
                    description: 'The ONE thing they are doing best - be specific about what body part or movement looks good THAT YOU CAN SEE'
                  },
                  priorityFix: {
                    type: 'string',
                    description: 'The ONE most important thing to fix based on what you observe - reference a specific issue you can see'
                  },
                  drills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          description: 'Short drill name'
                        },
                        purpose: {
                          type: 'string',
                          description: 'Why this drill helps (1 sentence)'
                        },
                        steps: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '3-5 specific step-by-step instructions'
                        },
                        reps_sets: {
                          type: 'string',
                          description: 'Recommended reps/sets (e.g., "3 sets of 10 reps")'
                        },
                        cues: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '2-3 coaching cues for proper execution'
                        }
                      },
                      required: ['title', 'purpose', 'steps', 'reps_sets', 'cues']
                    },
                    description: '1-3 actionable drills tailored to the issues found'
                  }
                },
                required: ['overallScore', 'violations', 'quickSummary', 'mechanicsBreakdown', 'positives', 'keyStrength', 'priorityFix', 'drills']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_mechanics' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received, processing...');
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
        console.log('Parsed tool call analysis successfully');
        
        // Validate required fields
        if (!analysis.overallScore || !analysis.mechanicsBreakdown || !analysis.quickSummary) {
          throw new Error('Missing required fields in tool response');
        }
        
        // ============ FEEDBACK-BASED VIOLATION OVERRIDE (FAILSAFE) ============
        // Combine all text fields for keyword scanning
        const allTextForScanning = [
          analysis.quickSummary || '',
          analysis.priorityFix || '',
          analysis.keyStrength || '',
          ...(analysis.mechanicsBreakdown?.map((m: any) => `${m.observation || ''} ${m.tip || ''}`) || []),
          ...(analysis.redFlags || [])
        ].join(' ');
        
        const feedbackViolations = detectViolationsFromFeedback(allTextForScanning, module);
        const violations = analysis.violations || {};
        
        for (const [key, detected] of Object.entries(feedbackViolations)) {
          if (detected && !violations[key]) {
            console.log(`[VIOLATION OVERRIDE] "${key}" detected in text but AI reported false - FORCING TRUE`);
            violations[key] = true;
          }
        }
        analysis.violations = violations;
        // ============ END FEEDBACK-BASED VIOLATION OVERRIDE ============
        
        // ============ PROGRAMMATIC SCORE CAP ENFORCEMENT ============
        const originalScore = analysis.overallScore;
        let cappedScore = analysis.overallScore;
        let scoreWasAdjusted = false;
        
        // Count critical violations (after feedback override)
        // NOTE: For hitting, back_leg_not_facing_target does NOT apply - back hip rotates AFTER foot landing
        let violationCount = 0;
        if (violations.early_shoulder_rotation) violationCount++;
        if (violations.shoulders_not_aligned && module !== 'hitting') violationCount++;
        if (violations.back_leg_not_facing_target && module !== 'hitting') violationCount++;
        if (violations.hands_pass_elbow_early) violationCount++;
        if (violations.front_shoulder_opens_early) violationCount++;
        
        console.log(`[VIOLATIONS] Module: ${module}, After feedback override: ${JSON.stringify(violations)}, count: ${violationCount}`);
        
        // Apply score caps (scaled to 1-10) - STRICTER ALIGNMENT ENFORCEMENT
        // Per user preference: Max 60 (6/10) if EITHER back leg or shoulders not aligned fails
        // NOTE: back_leg check only applies to pitching/throwing, NOT hitting
        
        // MULTIPLE VIOLATIONS = MAX 5.5 (55/100)
        if (violationCount >= 2) {
          cappedScore = Math.min(cappedScore, 5.5);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Multiple violations (${violationCount}) - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        // BACK LEG CHECK - Only applies to pitching/throwing, NOT hitting
        else if (violations.back_leg_not_facing_target && module !== 'hitting') {
          cappedScore = Math.min(cappedScore, 6);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Back leg not facing target - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.shoulders_not_aligned && module !== 'hitting') {
          cappedScore = Math.min(cappedScore, 6);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Shoulders not aligned - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        // EARLY SHOULDER ROTATION = MAX 6.5 (65/100)
        else if (violations.early_shoulder_rotation) {
          cappedScore = Math.min(cappedScore, 6.5);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Early shoulder rotation - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        // OTHER VIOLATIONS = MAX 7 (70/100)
        else if (violations.hands_pass_elbow_early) {
          cappedScore = Math.min(cappedScore, 7);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Hands pass elbow early - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.front_shoulder_opens_early) {
          cappedScore = Math.min(cappedScore, 7);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Front shoulder opens early - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        
        // ============ HIGH SCORE SKEPTICISM CHECK ============
        // If AI gives high score (>7.5) with zero violations, but text mentions issues - be suspicious
        if (cappedScore > 7.5 && violationCount === 0) {
          const feedbackMentionsIssues = feedbackViolations.back_leg_not_facing_target || 
                                          feedbackViolations.shoulders_not_aligned ||
                                          feedbackViolations.early_shoulder_rotation;
          
          if (feedbackMentionsIssues) {
            console.log(`[SKEPTICISM CHECK] High score (${cappedScore}) with zero violations but text mentions issues - capping at 7.5`);
            cappedScore = Math.min(cappedScore, 7.5);
            scoreWasAdjusted = true;
          }
        }
        // ============ END SKEPTICISM CHECK ============
        
        // Apply the capped score
        analysis.overallScore = cappedScore;
        analysis.violations_detected = violations;
        analysis.score_adjusted = scoreWasAdjusted;
        analysis.original_ai_score = originalScore;
        
        if (scoreWasAdjusted) {
          console.log(`[SCORE CAP] Final: ${originalScore} → ${cappedScore}`);
        }
        // ============ END SCORE CAP ENFORCEMENT ============
        
        // Ensure arrays exist even if empty
        analysis.redFlags = analysis.redFlags || [];
        analysis.positives = analysis.positives || [];
        analysis.drills = analysis.drills || [];
        
        // Legacy field for backward compatibility
        if (analysis.drills.length > 0) {
          analysis.drillRecommendation = `${analysis.drills[0].title}: ${analysis.drills[0].purpose}`;
        } else {
          analysis.drillRecommendation = analysis.priorityFix || 'Focus on the fundamentals';
        }
        
      } catch (parseError) {
        console.error('Failed to parse tool response:', parseError);
        throw new Error('Tool response parsing failed');
      }
    } else {
      // Fallback: try to parse from content if no tool call
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          analysis = JSON.parse(cleanContent);
        } catch {
          throw new Error('No valid tool call or content');
        }
      } else {
        throw new Error('No response from AI');
      }
    }

    console.log('Analysis generated successfully');
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-realtime-playback:', error);
    
    // Return module-specific fallback based on what we know
    const { module = 'hitting' } = await (async () => {
      try {
        return await req.clone().json();
      } catch {
        return {};
      }
    })();
    
    const fallbackByModule: Record<string, any> = {
      hitting: {
        overallScore: 7.0,
        quickSummary: 'Good athletic position at setup - keep working on that hip rotation timing!',
        mechanicsBreakdown: [
          { category: 'Stance & Setup', score: 7, observation: 'Balanced stance, good base width', tip: 'Keep knees slightly bent throughout' },
          { category: 'Load & Timing', score: 7, observation: 'Hands load back well', tip: 'Feel the weight shift to back hip' },
          { category: 'Hip Rotation', score: 6, observation: 'Hips could fire earlier', tip: 'Start hip turn before hands' },
          { category: 'Follow-Through', score: 7, observation: 'Good extension through ball', tip: 'Finish with belt buckle to pitcher' }
        ],
        redFlags: [],
        positives: [
          'Solid athletic stance with good balance',
          'Hands load back properly during stride',
          'Good extension through the hitting zone'
        ],
        keyStrength: 'Solid athletic stance with good balance throughout the swing',
        priorityFix: 'Work on initiating the hip rotation before the hands start forward',
        drills: [
          {
            title: 'Hip Fire Drill',
            purpose: 'Teaches proper hip-first sequencing before hands release',
            steps: [
              'Set up on a tee with normal stance',
              'Load and stride as normal',
              'Pause at stride landing',
              'Fire hips FIRST, then let hands follow',
              'Focus on feeling hip rotation before any arm movement'
            ],
            reps_sets: '3 sets of 10 reps',
            cues: ['Hips before hands', 'Feel the rotation, don\'t force it', 'Belt buckle to pitcher']
          }
        ],
        drillRecommendation: 'Hip Fire Drill: Teaches proper hip-first sequencing before hands release'
      },
      pitching: {
        overallScore: 7.0,
        quickSummary: 'Nice balance at the top - keep driving that back hip toward the plate!',
        mechanicsBreakdown: [
          { category: 'Balance & Posture', score: 7, observation: 'Good posture at set position', tip: 'Stay tall through leg lift' },
          { category: 'Leg Lift', score: 7, observation: 'Controlled knee lift', tip: 'Get knee to belt height' },
          { category: 'Hip Lead & Stride', score: 6, observation: 'Could lead more with hips', tip: 'Feel hips move before hands break' },
          { category: 'Follow-Through', score: 7, observation: 'Good finish position', tip: 'Full trunk flexion at release' }
        ],
        redFlags: [],
        positives: [
          'Excellent balance throughout delivery',
          'Controlled leg lift with good tempo',
          'Strong finish position'
        ],
        keyStrength: 'Excellent balance and posture throughout the delivery',
        priorityFix: 'Lead with the hip toward the plate before breaking the hands',
        drills: [
          {
            title: 'Rocker Drill',
            purpose: 'Develops proper hip-lead timing before hand break',
            steps: [
              'Start in stretch position',
              'Rock back and load onto back leg',
              'Drive hips toward plate first',
              'Let hands break naturally after hip leads',
              'Focus on feeling momentum toward target'
            ],
            reps_sets: '3 sets of 8 reps',
            cues: ['Hip leads everything', 'Back hip drives forward', 'Hands follow, don\'t lead']
          }
        ],
        drillRecommendation: 'Rocker Drill: Develops proper hip-lead timing before hand break'
      },
      throwing: {
        overallScore: 7.0,
        quickSummary: 'Good arm path and alignment - keep that elbow up through release!',
        mechanicsBreakdown: [
          { category: 'Footwork Alignment', score: 7, observation: 'Feet aligned to target', tip: 'Step directly at your target' },
          { category: 'Hip Rotation', score: 7, observation: 'Good hip turn', tip: 'Let hips open before shoulders' },
          { category: 'Arm Path', score: 6, observation: 'Elbow could be higher', tip: 'Keep elbow at shoulder height at release' },
          { category: 'Follow-Through', score: 7, observation: 'Full arm extension', tip: 'Finish with throwing hand by opposite knee' }
        ],
        redFlags: [],
        positives: [
          'Good lower body engagement',
          'Feet aligned toward target',
          'Full arm extension on release'
        ],
        keyStrength: 'Good lower body engagement and momentum toward target',
        priorityFix: 'Keep the throwing elbow at or above shoulder height at release',
        drills: [
          {
            title: 'One-Knee Throws',
            purpose: 'Isolates arm path and elbow position during release',
            steps: [
              'Kneel on throwing-side knee',
              'Face target with shoulders square',
              'Focus on high elbow position',
              'Throw to partner emphasizing elbow height',
              'Hold finish to check arm slot'
            ],
            reps_sets: '3 sets of 10 throws',
            cues: ['Elbow at shoulder level', 'Lead with elbow, not hand', 'Finish arm through']
          }
        ],
        drillRecommendation: 'One-Knee Throws: Isolates arm path and elbow position during release'
      }
    };
    
    return new Response(JSON.stringify(fallbackByModule[module] || fallbackByModule.hitting), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
