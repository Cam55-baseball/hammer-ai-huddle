import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// ============ VIOLATION KEYWORD DETECTION (FAILSAFE) ============
// These keywords in feedback text indicate violations - used to override AI's violation flags
const VIOLATION_KEYWORDS: Record<string, string[]> = {
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
  shoulders_not_aligned: [
    "shoulders not aligned", "shoulders not in line", "shoulder alignment off",
    "front shoulder not", "shoulders aren't aligned", "shoulder-target misalignment",
    "misaligned shoulder", "shoulder misalignment", "shoulders off target",
    "shoulder line", "shoulder alignment issue", "shoulders not directly",
    "shoulder not pointing", "shoulders open", "shoulders closed",
    "not aligned with target", "alignment with target"
  ],
  early_shoulder_rotation: [
    "shoulder rotation before", "shoulders rotate before", "early shoulder rotation",
    "rotating before landing", "shoulders rotating early", "premature shoulder rotation",
    "shoulders open before", "shoulder rotation begins before", "shoulders already",
    "shoulder already rotating", "rotating too early", "before foot lands",
    "before front foot", "rotation starts early"
  ]
};

// Scan feedback/summary text for violation keywords and return detected violations
function detectViolationsFromFeedback(text: string): Record<string, boolean> {
  const lowerText = text.toLowerCase();
  const detected: Record<string, boolean> = {};
  
  for (const [violation, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
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
    return baseInstructions + `CRITICAL HITTING KINETIC SEQUENCE:
1. Ground Force
2. Legs Drive
3. BACK ELBOW TRAVELS FORWARD (BEFORE hips rotate) ⭐
4. FRONT FOOT LANDS & STABILIZES (BEFORE any rotation) ⭐⭐⭐
5. Hips Rotate (ONLY AFTER front foot is planted)
6. Torso Rotates
7. Shoulders Rotate (FRONT SHOULDER MUST STAY CLOSED UNTIL THIS POINT) ⭐
8. Hands/Bat Release (HANDS MUST NOT PASS BACK ELBOW BEFORE SHOULDERS ROTATE) ⭐⭐

STRIDE & LANDING - FOUNDATION OF POWER:

⭐⭐⭐ CRITICAL: FRONT FOOT MUST BE PLANTED BEFORE SHOULDER ROTATION ⭐⭐⭐

The swing sequence CANNOT properly begin until the front foot is on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- This is NON-NEGOTIABLE for elite-level hitting

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE front foot lands:
→ MASSIVE POWER LEAK - rotational force dissipates into air, not through kinetic chain
→ ADJUSTABILITY DESTROYED - cannot track/adjust to pitch location mid-swing
→ BALANCE COMPROMISED - body unstable during rotation = inconsistent contact
→ ACCURACY REDUCED - contact point varies due to unanchored rotation
→ EFFORT INEFFICIENCY - requires significantly more muscular effort for same output

WHY THIS MATTERS FOR ELITE PERFORMANCE:
- Elite hitters use the ground as leverage - rotation builds FROM the ground UP
- Feet planted = stable platform = efficient energy transfer
- When feet are down first, the kinetic chain fires in proper sequence AUTOMATICALLY
- This creates an "effortless" feel with maximum power output
- The best hitters in the world look smooth because their timing starts from the ground

BALANCE & HEAD CONTROL - PHASE-SPECIFIC ANALYSIS:

PRE-SWING PHASE (Before Swing Sequence Starts):
- Forward head movement toward home plate = ACCEPTABLE ✓
- This is part of natural stride and load mechanics
- Does NOT disrupt visual tracking or timing

SWING SEQUENCE PHASE (During Active Swing):
- ⚠️ CRITICAL: Minimal forward head movement required ⭐⭐
  * Moving head = moving eyes = contact point disruption
  * Some natural movement will occur, but excessive movement is a RED FLAG
  * Proper back elbow placement and hands staying back naturally stabilize the head
  
- ⚠️ CRITICAL RED FLAG: Lateral head movement toward pitcher during swing sequence ⭐⭐⭐
  * MAJOR DISRUPTOR of swing mechanics
  * Indicates broken sequence timing (elbow and/or hands out of sequence)
  * Head racing forward = loss of time on pitch (moving closer to ball prematurely)
  * Disrupts spatial awareness → contact inaccuracies
  * Often caused by:
    → Elbow leaving sequence timing early
    → Hands leaving sequence timing early
    → Rushing the swing
    
HEAD MOVEMENT ROOT CAUSES:
- If head moves excessively during sequence: Check elbow and hand timing
- Proper sequence (elbow → hips → shoulders → hands) naturally prevents head drift
- Head stability is a RESULT of good sequence, not a separate goal
- **IMPORTANT:** Don't sacrifice swing sequence to keep head still - proper sequence creates natural head stability

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders begin rotating BEFORE front foot lands → MASSIVE POWER LEAK ⭐⭐⭐
  * This is the #1 cause of inconsistent, effortful swings
  * Destroys ability to adjust to pitch location
  * Cannot generate maximum force without ground connection
  * Makes the swing feel "heavy" and requires more effort
  * Elite hitters NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Hands pass back elbow BEFORE shoulders begin rotating → MAJOR SEQUENCE DISRUPTOR
  * Bat not on plane early enough or long enough
  * Reduces contact abilities and accuracy at contact
  * Breaks kinetic chain → Power loss
- ⚠️ CRITICAL: Front shoulder pulls/opens out of sequence (too early) → MAJOR CONTACT DISRUPTOR ⭐
  * Causes inaccuracies when making contact with the pitch
  * Barrel loses tension and connection to body rotation
  * Barrel drops BELOW the plane of the properly sequenced swing
  * Disrupts bat path and timing
- ⚠️ CRITICAL: Lateral head movement toward pitcher during swing sequence → MAJOR CONTACT DISRUPTOR ⭐⭐⭐
  * Head moving toward pitcher = broken swing sequence
  * Loss of spatial awareness and timing on pitch
  * Indicates elbow and/or hands traveling out of sequence
  * Causes contact inaccuracies and inconsistent bat path
  * Hitter loses time on pitch by moving closer to ball prematurely
- ⚠️ Excessive forward head movement during swing sequence → Balance and contact issues ⭐
  * Moving head = moving eyes = inconsistent contact point
  * Natural during load/stride is OK, but during active swing is problematic
  * Often indicates hands traveling forward out of sequence
  * Can signal improper back elbow placement
- Back elbow drops to slot without traveling forward → Reduces bat speed
- Hips rotate before back elbow travels → Broken kinetic chain

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 7
- If hands pass back elbow BEFORE shoulders rotate → MAX SCORE: 7
- If front shoulder opens/pulls early → MAX SCORE: 7.5
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
✓ Hands stay behind back elbow until shoulders rotate
✓ Front shoulder stays closed until proper timing
✓ Back elbow travels forward before hips rotate
✓ Minimal head movement during swing sequence
✓ Clean kinetic chain from ground up

CALIBRATION - What 6 looks like:
✗ Front foot lands but shoulders already rotating
✗ Hands pass back elbow too early
✓ Some correct elements (setup, finish)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐⭐ Does the head move LATERALLY toward the pitcher during swing sequence? (CRITICAL RED FLAG)
3. ⭐⭐ Does the head move EXCESSIVELY FORWARD during swing sequence? (Some natural movement OK)
4. ⭐ Do hands stay BEHIND the back elbow until AFTER shoulders begin rotating?
5. ⭐ Does the FRONT SHOULDER stay CLOSED until proper timing in sequence?
6. Does back elbow TRAVEL forward before hips?
7. Are timing gaps correct (land → elbow → hips → shoulders → hands)?

Provide:
- Efficiency score (1-10) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders rotate before front foot lands (score CAPPED at 7)
- **PRIORITY CHECK:** Flag if hands pass back elbow before shoulder rotation (score CAPPED at 7)
- **PRIORITY CHECK:** Flag if front shoulder opens/pulls out of sequence (score CAPPED at 7.5)
- **BALANCE CHECK:** Assess head movement and balance throughout the swing
- Specific feedback on:
  * Front foot landing timing relative to rotation (MUST land first)
  * Hand-elbow timing relative to shoulder rotation
  * Front shoulder control and timing (watch for early opening)
  * Head position and forward movement (balance indicator)
  * Back elbow travel
  * Kinetic sequence timing
- Identify any sequence violations and their impact on power/contact
- **If early rotation detected:** Explain how this creates power leak, hurts adjustability, and requires more effort
- **If front shoulder opens early:** Explain impact on barrel tension, swing plane, and contact accuracy
- **If forward head movement detected:** Note correlation with back elbow position and hand travel
- Recommended drills to correct any sequence issues and improve balance

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
3. Shoulders → IN LINE WITH TARGET (pitcher-catcher alignment) ⭐⭐
4. Front elbow → In line with target ⭐
5. Glove → Open and facing the target ⭐

STRIDE & LANDING - FOUNDATION OF VELOCITY AND ACCURACY:

The pitching sequence CANNOT properly begin until the front foot is on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- Shoulders MUST be aligned with the target at the moment of landing
- This is NON-NEGOTIABLE for elite-level pitching

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE front foot lands:
→ MASSIVE POWER LEAK - rotational force dissipates into air
→ ACCURACY DESTROYED - cannot maintain shoulder-target alignment
→ BALANCE COMPROMISED - body unstable during rotation
→ VELOCITY REDUCED - requires significantly more arm effort
→ INJURY RISK INCREASED - arm must compensate for lost body power

SHOULDER-TARGET ALIGNMENT REQUIREMENT:
- Shoulders MUST be in line with target at the moment of landing
- Think: draw a line from throwing shoulder through front shoulder to catcher
- This alignment ensures DIRECT energy transfer to target
- Misalignment = wasted energy = reduced velocity AND accuracy
- Elite pitchers look "effortless" because alignment maximizes efficiency

Phase 2 - STANDARD SEQUENCING (After Landing):
6. Hip rotation continues through landing
7. Torso rotation
8. Shoulder rotation (ONLY AFTER foot is planted)
9. Arm action
10. Release

ARM ANGLE SAFETY CHECK (Phase 2 - During Arm Action):
⭐ GOAL: Hand-Elbow-Shoulder angle LESS than 90° when hand flips up ⭐
- As the hand flips up to travel forward in the sequence
- Measure the angle formed by: Hand → Elbow → Shoulder
- LESS than 90° = GOOD (reduces harmful pinpointed stress) ✓
- 90° or GREATER = INCREASED INJURY RISK ⚠️

Why this matters:
- Keeps arm in safer "layback" position during acceleration
- Distributes force across larger muscle groups (not just elbow/shoulder)
- Reduces pinpointed stress on connective tissue
- Natural consequence of proper shoulder rotation timing

If angle is ≥90°:
- Often indicates shoulder rotation is late or insufficient
- Arm may be "catching up" instead of being driven by body
- Increased stress on elbow and rotator cuff

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders begin rotating BEFORE front foot lands → MASSIVE POWER LEAK & ACCURACY LOSS ⭐⭐⭐
  * This is the #1 cause of inconsistent, arm-heavy deliveries
  * Destroys ability to maintain target alignment
  * Cannot generate maximum force without ground connection
  * Makes the pitch require more arm effort
  * Elite pitchers NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Shoulders NOT in line with target at landing → ENERGY LEAKAGE ⭐⭐
  * Direct line to target = maximum energy transfer
  * Misalignment forces compensations later in delivery
  * Reduces both velocity and accuracy
- ⚠️ Back leg (foot/knee/hip) NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK (pinpointed stress)
- ⚠️ Glove closed or not facing target at landing → Poor directional control

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 7
- If shoulders NOT aligned with target at landing → MAX SCORE: 7.5
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
✓ Shoulders PERFECTLY aligned with target at landing
✓ Back leg (foot, knee, hip) ALL facing target
✓ Glove open and facing target
✓ Arm angle under 90° at flip-up
✓ Clean sequencing through release

CALIBRATION - What 6 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (arm path, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. Is back leg (foot, knee, hip) facing target at landing?
4. Are shoulders and front elbow aligned with target at landing?
5. Is glove open and facing target at landing?
6. Does arm flip up before shoulder rotation (patterning issue)?
7. Does back leg face target BEFORE shoulder moves?
8. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the pitch should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "softball") {
    return baseInstructions + `CRITICAL SOFTBALL PITCHING SEQUENCE:

⭐⭐⭐ FOUNDATION PRINCIPLE: FEET BEFORE SHOULDERS ⭐⭐⭐

Phase 1 - LANDING POSITION (MUST CHECK FIRST):
At the moment of front foot landing (push-off completion):
1. Front foot → FIRMLY PLANTED before any shoulder rotation begins ⭐⭐⭐
2. Shoulders → In line with target (pitcher-catcher alignment) ⭐⭐
3. Hips → Beginning to drive through
4. Arm → At proper position in circle

STRIDE & LANDING - FOUNDATION OF VELOCITY AND ACCURACY:

The pitching sequence CANNOT properly begin until the front foot is on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- Shoulders MUST be aligned with the target at the moment of landing
- This applies to BOTH windmill and slingshot styles
- This is NON-NEGOTIABLE for elite-level softball pitching

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE front foot lands:
→ MASSIVE POWER LEAK - rotational force has no anchor point
→ ARM CIRCLE COMPROMISED - timing breaks down
→ ACCURACY DESTROYED - cannot maintain target alignment
→ VELOCITY REDUCED - requires more arm effort for same speed
→ This applies to BOTH windmill and slingshot styles

SHOULDER-TARGET ALIGNMENT REQUIREMENT:
- Shoulders MUST be in line with target at landing
- Think: draw a line from throwing shoulder through front shoulder to catcher
- This alignment ensures DIRECT energy transfer to target
- Misalignment = wasted energy = reduced velocity AND accuracy
- Elite softball pitchers maintain shoulder-target line through delivery

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Hip rotation continues through landing
6. Torso rotation
7. Shoulder rotation (ONLY AFTER foot is planted)
8. Arm circle completion
9. Release at hip
10. Follow-through

Key Focus Areas:
1. Arm circle mechanics (windmill or slingshot)
2. Hip drive and rotation
3. Release point consistency
4. Balance and stability throughout delivery
5. Follow-through mechanics
6. Lower body engagement
7. Shoulder alignment

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders rotate BEFORE front foot lands → MASSIVE POWER LEAK ⭐⭐⭐
  * This is the #1 cause of inconsistent, arm-heavy deliveries
  * Destroys ability to maintain target alignment
  * Cannot generate maximum force without ground connection
  * Makes the pitch require more arm effort
  * Elite pitchers NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Shoulders NOT in line with target at landing → ENERGY LEAKAGE ⭐⭐
  * Direct line to target = maximum energy transfer
  * Misalignment forces compensations later in delivery
  * Reduces both velocity and accuracy
- ⚠️ Arm circle breaks or stalls → Reduces power and consistency
- ⚠️ Inconsistent release point → Reduces accuracy and movement
- ⚠️ Poor hip drive → Arm-only delivery, injury risk
- ⚠️ Landing off-balance → Control and repeat issues

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 7
- If shoulders NOT aligned with target at landing → MAX SCORE: 7.5
- If arm circle breaks or stalls → MAX SCORE: 7.5
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
✓ Shoulders PERFECTLY aligned with target at landing
✓ Smooth, continuous arm circle
✓ Consistent release point at hip
✓ Strong hip drive through landing
✓ Clean sequencing through follow-through

CALIBRATION - What 6 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (arm circle, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. Is arm circle smooth and continuous?
4. Is release point consistent at the hip?
5. Is there strong hip drive through landing?

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
3. Shoulders → IN LINE WITH TARGET at landing ⭐⭐
4. Glove → Open and facing target

STRIDE & LANDING - FOUNDATION OF VELOCITY AND ACCURACY:

The throwing sequence CANNOT properly begin until the feet are on the ground:
- Ground contact creates the stable base for rotational force
- Without this foundation, rotation has no anchor point
- Shoulders MUST be aligned with the target when stride foot lands
- This is NON-NEGOTIABLE for elite-level throwing

POWER LEAK WARNING - EARLY SHOULDER ROTATION:
If shoulders begin rotating BEFORE stride foot lands:
→ MASSIVE POWER LEAK - rotational force dissipates into air
→ ACCURACY DESTROYED - cannot maintain shoulder-target alignment
→ BALANCE COMPROMISED - body unstable during rotation
→ VELOCITY REDUCED - requires significantly more arm effort
→ INJURY RISK INCREASED - arm must compensate for lost body power

SHOULDER-TARGET ALIGNMENT REQUIREMENT:
- Shoulders MUST be in line with target when stride foot lands
- Think: draw a line from throwing shoulder through front shoulder to target
- This alignment ensures DIRECT energy transfer to target
- Misalignment = wasted energy = reduced velocity AND accuracy
- Elite throwers look "effortless" because alignment maximizes efficiency

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Footwork → Crow hop or pro step (aligned to target)
6. Hip rotation
7. Torso rotation
8. Shoulder rotation (ONLY AFTER stride foot is planted AND back leg faces target)
9. Arm action (follows shoulder)
10. Release

ARM ANGLE SAFETY CHECK (During Arm Action):
⭐ GOAL: Hand-Elbow-Shoulder angle LESS than 90° when hand flips up ⭐
- As the hand flips up to travel forward in the sequence
- Measure the angle formed by: Hand → Elbow → Shoulder
- LESS than 90° = GOOD (reduces harmful pinpointed stress) ✓
- 90° or GREATER = INCREASED INJURY RISK ⚠️

Why this matters:
- Keeps arm in safer throwing position
- Distributes force across body instead of concentrating at elbow
- Reduces pinpointed stress on arm structures
- Natural result of proper shoulder-first sequencing

If angle is ≥90°:
- Check if shoulder rotation is leading the arm action
- Arm should be "whipped" by body rotation, not pushing itself

RED FLAGS TO IDENTIFY:
- ⚠️ CRITICAL: Shoulders begin rotating BEFORE stride foot lands → MASSIVE POWER LEAK ⭐⭐⭐
  * This is the #1 cause of inconsistent, arm-heavy throws
  * Destroys ability to maintain target alignment
  * Cannot generate maximum force without ground connection
  * Makes the throw require more arm effort
  * Elite throwers NEVER rotate before landing - this is non-negotiable
- ⚠️ CRITICAL: Shoulders NOT in line with target at landing → ENERGY LEAKAGE ⭐⭐
  * Direct line to target = maximum energy transfer
  * Misalignment forces compensations during arm action
  * Reduces both velocity and accuracy
- ⚠️ Back leg NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK (pinpointed stress)
- ⚠️ Poor footwork alignment (not directed to target) → Reduces accuracy

SCORING FRAMEWORK - PROFESSIONAL STANDARDS:

Base your efficiency score on THIS rubric:

STARTING POINT: Begin at 5 (mediocre baseline) - scale is 1-10
- ADD points for correct mechanics
- Scores above 8 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 7
- If shoulders NOT aligned with target at landing → MAX SCORE: 7.5
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
✓ Stride foot FULLY planted before ANY shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Back leg (foot, knee, hip) ALL facing target
✓ Arm angle under 90° at flip-up
✓ Proper footwork toward target
✓ Clean sequencing through release

CALIBRATION - What 6 looks like:
✗ Stride foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (footwork, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 6.5 with honest feedback is more valuable than 8.5 with false praise.

Focus on:
1. ⭐⭐⭐ Is the STRIDE FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. Does back leg (foot, knee, hip) face target BEFORE shoulder rotation?
4. Does arm flip up before shoulder moves (T-spine/patterning issue)?
5. Is footwork aligned to target?
6. Does shoulder move BEFORE arm action?
7. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

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
                        description: 'TRUE if shoulders NOT aligned with target at moment of landing'
                      },
                      back_leg_not_facing_target: {
                        type: 'boolean',
                        description: 'TRUE if back hip/leg (foot, knee, hip) NOT facing target at landing'
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
                    required: ['early_shoulder_rotation', 'shoulders_not_aligned', 'back_leg_not_facing_target']
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
        
        const feedbackViolations = detectViolationsFromFeedback(allTextForScanning);
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
        let violationCount = 0;
        if (violations.early_shoulder_rotation) violationCount++;
        if (violations.shoulders_not_aligned) violationCount++;
        if (violations.back_leg_not_facing_target) violationCount++;
        if (violations.hands_pass_elbow_early) violationCount++;
        if (violations.front_shoulder_opens_early) violationCount++;
        
        console.log(`[VIOLATIONS] After feedback override: ${JSON.stringify(violations)}, count: ${violationCount}`);
        
        // Apply score caps (scaled to 1-10) - MULTIPLE VIOLATIONS FIRST
        if (violationCount >= 2) {
          cappedScore = Math.min(cappedScore, 6); // 60/100 = 6/10
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Multiple violations (${violationCount}) - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.early_shoulder_rotation) {
          cappedScore = Math.min(cappedScore, 7); // 70/100 = 7/10
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Early shoulder rotation - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.hands_pass_elbow_early) {
          cappedScore = Math.min(cappedScore, 7);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Hands pass elbow early - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.shoulders_not_aligned) {
          cappedScore = Math.min(cappedScore, 7.5); // 75/100 = 7.5/10
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Shoulders not aligned - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.back_leg_not_facing_target) {
          cappedScore = Math.min(cappedScore, 7.5);
          if (cappedScore !== analysis.overallScore) {
            console.log(`[SCORE CAP] Back leg not facing target - capping from ${analysis.overallScore} to ${cappedScore}`);
            scoreWasAdjusted = true;
          }
        }
        else if (violations.front_shoulder_opens_early) {
          cappedScore = Math.min(cappedScore, 7.5);
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
