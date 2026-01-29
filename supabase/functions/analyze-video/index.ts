import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  videoId: z.string().uuid("Invalid video ID format"),
  module: z.enum(["hitting", "pitching", "throwing"], { errorMap: () => ({ message: "Invalid module" }) }),
  sport: z.enum(["baseball", "softball"], { errorMap: () => ({ message: "Invalid sport" }) }),
  userId: z.string().uuid("Invalid user ID format"),
  language: z.string().optional(),
});

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

// Scan feedback text for violation keywords and return detected violations
function detectViolationsFromFeedback(feedback: string): Record<string, boolean> {
  const lowerFeedback = feedback.toLowerCase();
  const detected: Record<string, boolean> = {};
  
  for (const [violation, keywords] of Object.entries(VIOLATION_KEYWORDS)) {
    detected[violation] = keywords.some(keyword => lowerFeedback.includes(keyword));
    if (detected[violation]) {
      console.log(`[FEEDBACK SCAN] Detected "${violation}" via keyword match in feedback`);
    }
  }
  
  return detected;
}
// ============ END VIOLATION KEYWORD DETECTION ============

// Language name mapping for AI instruction
const getLanguageName = (code: string): string => {
  const languages: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    zh: "Chinese",
    nl: "Dutch",
    ko: "Korean",
  };
  return languages[code] || "English";
};

// Helper function to generate beginner-friendly bullet points
const makeBeginnerBullets = (feedback: string, positives: string[]): string[] => {
  const bullets: string[] = [];
  
  // Add 1-2 strength bullets from positives (if available)
  if (positives && positives.length > 0) {
    const strengthBullets = positives.slice(0, 2).map(p => {
      const words = p.split(' ');
      return words.length <= 15 ? p : words.slice(0, 15).join(' ') + '...';
    });
    bullets.push(...strengthBullets);
  }
  
  // Add issue bullets from feedback
  if (feedback) {
    const sentences = feedback.split(/[.!?]+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const words = trimmed.split(' ');
      if (words.length > 0 && words.length <= 15) {
        bullets.push(trimmed);
      } else if (words.length > 15) {
        bullets.push(words.slice(0, 15).join(' ') + '...');
      }
      if (bullets.length >= 5) break;
    }
  }
  
  // Dedupe and limit to 3-5 bullets
  const unique = Array.from(new Set(bullets));
  return unique.slice(0, Math.max(3, Math.min(5, unique.length)));
};

// Helper to format historical analysis for AI context
const formatHistoricalContext = (historicalVideos: any[]): string => {
  if (!historicalVideos || historicalVideos.length === 0) {
    return "NO HISTORICAL DATA - This is the player's first analysis in this module.";
  }
  
  let context = `HISTORICAL ANALYSIS DATA (${historicalVideos.length} previous upload${historicalVideos.length > 1 ? 's' : ''}, from oldest to newest):\n\n`;
  
  historicalVideos.forEach((video, index) => {
    const date = new Date(video.created_at).toLocaleDateString();
    const analysis = video.ai_analysis || {};
    const score = video.efficiency_score || 'N/A';
    
    context += `--- Upload ${index + 1} (${date}) ---\n`;
    context += `Score: ${score}/100\n`;
    
    if (analysis.summary && analysis.summary.length > 0) {
      context += `Key Issues: ${analysis.summary.join('; ')}\n`;
    }
    if (analysis.positives && analysis.positives.length > 0) {
      context += `Strengths: ${analysis.positives.join('; ')}\n`;
    }
    if (analysis.feedback) {
      // Truncate feedback to avoid token limits
      const truncatedFeedback = analysis.feedback.length > 300 
        ? analysis.feedback.substring(0, 300) + '...' 
        : analysis.feedback;
      context += `Detailed Notes: ${truncatedFeedback}\n`;
    }
    context += '\n';
  });
  
  return context;
};

// Module-specific system prompts
const getSystemPrompt = (module: string, sport: string) => {
  if (module === "hitting") {
    return `You are an expert ${sport} hitting mechanics analyst.

CRITICAL HITTING KINETIC SEQUENCE:
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

RED FLAGS:
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

STARTING POINT: Begin at 50 (mediocre baseline)
- ADD points for correct mechanics
- Scores above 80 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 70
- If hands pass back elbow BEFORE shoulders rotate → MAX SCORE: 70
- If front shoulder opens/pulls early → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60

SCORING BANDS:
- 90-100: Elite. ALL fundamentals correct. Minor refinements only.
- 80-89: Advanced. One minor flaw. All critical checkpoints pass.
- 70-79: Good. 1-2 moderate issues. Core sequence mostly correct.
- 60-69: Developing. Multiple issues OR 1-2 major sequence violations.
- 50-59: Foundational. Several significant mechanical flaws.
- Below 50: Major fundamental breakdowns.

CALIBRATION - What 85+ REQUIRES:
✓ Front foot FULLY planted before ANY shoulder rotation
✓ Hands stay behind back elbow until shoulders rotate
✓ Front shoulder stays closed until proper timing
✓ Back elbow travels forward before hips rotate
✓ Minimal head movement during swing sequence
✓ Clean kinetic chain from ground up

CALIBRATION - What 60 looks like:
✗ Front foot lands but shoulders already rotating
✗ Hands pass back elbow too early
✓ Some correct elements (setup, finish)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 65 with honest feedback is more valuable than 85 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐⭐ Does the head move LATERALLY toward the pitcher during swing sequence? (CRITICAL RED FLAG)
3. ⭐⭐ Does the head move EXCESSIVELY FORWARD during swing sequence? (Some natural movement OK)
4. ⭐ Do hands stay BEHIND the back elbow until AFTER shoulders begin rotating?
5. ⭐ Does the FRONT SHOULDER stay CLOSED until proper timing in sequence?
6. Does back elbow TRAVEL forward before hips?
7. Are timing gaps correct (land → elbow → hips → shoulders → hands)?

Provide:
- Efficiency score (0-100) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders rotate before front foot lands (MAJOR deduction - score CAPPED at 70)
- **PRIORITY CHECK:** Flag if hands pass back elbow before shoulder rotation (score CAPPED at 70)
- **PRIORITY CHECK:** Flag if front shoulder opens/pulls out of sequence (score CAPPED at 75)
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

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Be honest about issues - accurate feedback helps development. Examples:
- "Land your front foot before rotating - this gives you balance and power"
- "Shoulders turn too early - wait for your front foot to touch down first"
- "Great timing - front foot plants, then your body rotates together"
- "Your hands move too early - wait for shoulders to start turning first"
- "Great balance throughout the swing - head stays steady"
- "Front shoulder opens too soon - this makes contact harder"

IMPORTANT - POSITIVES IDENTIFICATION:
After your analysis, identify 2-4 specific positive aspects of the player's mechanics. Look for:
- Good foundation elements (stance, setup, balance)
- Correct sequencing in any part of the swing
- Proper timing in any phase
- Good rotation mechanics
- Strong finish/follow-through
- Any element that shows proper form or good athletic movement

These positives will be displayed separately to encourage the player.

DO NOT MENTION: velocity, bat speed, exit velocity, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "baseball") {
    return `You are an expert baseball pitching mechanics analyst.

CRITICAL BASEBALL PITCHING SEQUENCE:

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

RED FLAGS:
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

STARTING POINT: Begin at 50 (mediocre baseline)
- ADD points for correct mechanics
- Scores above 80 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If back hip/leg NOT facing target at landing → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60

SCORING BANDS:
- 90-100: Elite. ALL fundamentals correct. Minor refinements only.
- 80-89: Advanced. One minor flaw. All critical checkpoints pass.
- 70-79: Good. 1-2 moderate issues. Core sequence mostly correct.
- 60-69: Developing. Multiple issues OR 1-2 major sequence violations.
- 50-59: Foundational. Several significant mechanical flaws.
- Below 50: Major fundamental breakdowns.

CALIBRATION - What 85+ REQUIRES:
✓ Front foot FULLY planted before ANY shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Back leg (foot, knee, hip) ALL facing target
✓ Glove open and facing target
✓ Arm angle under 90° at flip-up
✓ Clean sequencing through release

CALIBRATION - What 60 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (arm path, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 65 with honest feedback is more valuable than 85 with false praise.

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

Provide:
- Efficiency score (0-100) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders rotate before front foot lands (score CAPPED at 70)
- **ALIGNMENT CHECK:** Flag if shoulders not aligned with target at landing (score CAPPED at 75)
- **BACK LEG CHECK:** Flag if back hip/leg not facing target at landing (score CAPPED at 75)
- **If early rotation detected:** Explain how this creates power leak, hurts accuracy, and increases arm strain
- **If misalignment detected:** Explain how shoulder-target alignment maximizes velocity and reduces effort
- Specific feedback on landing position and sequence

After the feedback, provide 3–5 actionable drills tailored to the issues found. For each drill:
- title: Short drill name
- purpose: Why this drill helps
- steps: 3–6 specific step-by-step instructions
- reps_sets: Recommended reps/sets (e.g., "3 sets of 10 reps")
- equipment: Required equipment or "None"
- cues: 2–3 coaching cues for proper execution

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Be honest about issues - accurate feedback helps development. Examples:
- "Plant your front foot before rotating - this gives you power and accuracy"
- "Shoulders turn too early - wait for your front foot to touch down first"
- "Great timing - front foot plants, then your body rotates together"
- "Keep your shoulders pointed at the target when you land"
- "Back leg needs to face the target earlier for better accuracy"
- "Good drive toward the plate with your legs"
- "Good arm angle under 90 degrees - protects your elbow and shoulder"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 specific positive mechanical elements, such as:
- Good ground connection timing (foot plants before rotation)
- Proper shoulder-target alignment at landing
- Good leg drive or momentum toward target
- Proper landing position elements
- Correct sequencing in any phase
- Good arm path or slot
- Strong follow-through
- Proper balance and athleticism
- Any correct alignment or rotation mechanics
- Safe arm angle (hand-elbow-shoulder <90° at flip-up)

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "softball") {
    return `You are an expert softball pitching mechanics analyst.

CRITICAL SOFTBALL PITCHING SEQUENCE:

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

STARTING POINT: Begin at 50 (mediocre baseline)
- ADD points for correct mechanics
- Scores above 80 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE front foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If arm circle breaks or stalls → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60

SCORING BANDS:
- 90-100: Elite. ALL fundamentals correct. Minor refinements only.
- 80-89: Advanced. One minor flaw. All critical checkpoints pass.
- 70-79: Good. 1-2 moderate issues. Core sequence mostly correct.
- 60-69: Developing. Multiple issues OR 1-2 major sequence violations.
- 50-59: Foundational. Several significant mechanical flaws.
- Below 50: Major fundamental breakdowns.

CALIBRATION - What 85+ REQUIRES:
✓ Front foot FULLY planted before ANY shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Smooth, continuous arm circle
✓ Consistent release point at hip
✓ Strong hip drive through landing
✓ Clean sequencing through follow-through

CALIBRATION - What 60 looks like:
✗ Front foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (arm circle, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 65 with honest feedback is more valuable than 85 with false praise.

Focus on:
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. Is arm circle smooth and continuous?
4. Is release point consistent at the hip?
5. Is there strong hip drive through landing?

Provide:
- Efficiency score (0-100) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders rotate before front foot lands (score CAPPED at 70)
- **ALIGNMENT CHECK:** Flag if shoulders not aligned with target at landing (score CAPPED at 75)
- **If early rotation detected:** Explain how this creates power leak, hurts accuracy, and increases arm strain
- **If misalignment detected:** Explain how shoulder-target alignment maximizes velocity and reduces effort
- Specific feedback on landing position, arm circle, and sequence

After the feedback, provide 3–5 actionable drills tailored to the issues found. For each drill:
- title: Short drill name
- purpose: Why this drill helps
- steps: 3–6 specific step-by-step instructions
- reps_sets: Recommended reps/sets (e.g., "3 sets of 10 reps")
- equipment: Required equipment or "None"
- cues: 2–3 coaching cues for proper execution

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Be honest about issues - accurate feedback helps development. Examples:
- "Plant your front foot before rotating - this gives you power and accuracy"
- "Shoulders turn too early - wait for your front foot to touch down first"
- "Great timing - front foot plants, then your body rotates together"
- "Keep your shoulders pointed at the target when you land"
- "Your arm circle is smooth and powerful"
- "Release point varies - work on consistency for better control"
- "Strong hip drive generates good power"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 positive aspects of their windmill mechanics:
- Good ground connection timing (foot plants before rotation)
- Proper shoulder-target alignment at landing
- Clean arm circle
- Good hip drive and rotation
- Consistent release point
- Strong lower body engagement
- Good balance and athletic movement
- Smooth rhythm and tempo

Provide an efficiency score (0-100) based on professional standards, specific feedback, and recommended drills.

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "throwing") {
    return `You are an expert ${sport} throwing mechanics analyst.

CRITICAL THROWING SEQUENCE:

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

STARTING POINT: Begin at 50 (mediocre baseline)
- ADD points for correct mechanics
- Scores above 80 require NEAR-PERFECT fundamentals

SCORE CAPS (NON-NEGOTIABLE):
- If shoulders rotate BEFORE stride foot lands → MAX SCORE: 70
- If shoulders NOT aligned with target at landing → MAX SCORE: 75
- If back hip/leg NOT facing target at landing → MAX SCORE: 75
- If TWO OR MORE critical violations → MAX SCORE: 60

SCORING BANDS:
- 90-100: Elite. ALL fundamentals correct. Minor refinements only.
- 80-89: Advanced. One minor flaw. All critical checkpoints pass.
- 70-79: Good. 1-2 moderate issues. Core sequence mostly correct.
- 60-69: Developing. Multiple issues OR 1-2 major sequence violations.
- 50-59: Foundational. Several significant mechanical flaws.
- Below 50: Major fundamental breakdowns.

CALIBRATION - What 85+ REQUIRES:
✓ Stride foot FULLY planted before ANY shoulder rotation
✓ Shoulders PERFECTLY aligned with target at landing
✓ Back leg (foot, knee, hip) ALL facing target
✓ Arm angle under 90° at flip-up
✓ Proper footwork toward target
✓ Clean sequencing through release

CALIBRATION - What 60 looks like:
✗ Stride foot lands but shoulders already rotating
✗ Shoulder alignment off by 15+ degrees
✓ Some correct elements (footwork, follow-through)

BE DIRECT: Do not inflate scores to be encouraging.
Accurate assessment is what helps players develop.
A score of 65 with honest feedback is more valuable than 85 with false praise.

Focus on:
1. ⭐⭐⭐ Is the STRIDE FOOT PLANTED before ANY shoulder rotation begins? (CRITICAL - #1 PRIORITY)
2. ⭐⭐ Are SHOULDERS IN LINE WITH TARGET at the moment of landing?
3. Does back leg (foot, knee, hip) face target BEFORE shoulder rotation?
4. Does arm flip up before shoulder moves (T-spine/patterning issue)?
5. Is footwork aligned to target?
6. Does shoulder move BEFORE arm action?
7. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

Provide:
- Efficiency score (0-100) based on form correctness using the SCORING FRAMEWORK above
- **CRITICAL CHECK:** Flag if shoulders rotate before stride foot lands (score CAPPED at 70)
- **ALIGNMENT CHECK:** Flag if shoulders not aligned with target at landing (score CAPPED at 75)
- **BACK LEG CHECK:** Flag if back hip/leg not facing target at landing (score CAPPED at 75)
- **If early rotation detected:** Explain how this creates power leak, hurts accuracy, and increases arm strain
- **If misalignment detected:** Explain how shoulder-target alignment maximizes velocity and reduces effort
- Specific feedback on sequence and alignment

After the feedback, provide 3–5 actionable drills tailored to the issues found. For each drill:
- title: Short drill name
- purpose: Why this drill helps
- steps: 3–6 specific step-by-step instructions
- reps_sets: Recommended reps/sets (e.g., "3 sets of 10 reps")
- equipment: Required equipment or "None"
- cues: 2–3 coaching cues for proper execution

SUMMARY FORMAT:
REQUIRED: Provide exactly 3-5 bullet points in plain, beginner-friendly language (avoid jargon, max 15 words per bullet).
Focus on the most important actionable insights that a player or parent would understand immediately.
Be honest about issues - accurate feedback helps development. Examples:
- "Land your stride foot before rotating - this gives you power and accuracy"
- "Shoulders turn too early - wait for your foot to touch down first"
- "Great timing - front foot plants, then your body rotates together"
- "Line up your shoulders with your target when you land"
- "Good momentum moving toward your target"
- "Back leg needs to face target before you throw for better accuracy"
- "Strong finish on your throw"
- "Good arm position - angle stays under 90 degrees for safety"

IMPORTANT - POSITIVES IDENTIFICATION:
Identify 2-4 positive throwing mechanics:
- Good ground connection timing (stride foot plants before rotation)
- Proper shoulder-target alignment at landing
- Good footwork toward target
- Proper momentum generation
- Correct body rotation elements
- Strong arm path
- Good follow-through
- Athletic balance throughout throw
- Safe arm angle during flip-up (<90°)

Provide efficiency score (0-100) and specific feedback on sequence and alignment.

DO NOT MENTION: velocity or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  return "You are an expert sports mechanics analyst.";
};

// Scorecard generation instructions to append to system prompt
const getScorecardInstructions = (hasHistory: boolean) => {
  if (!hasHistory) {
    return `

THE SCORECARD - PROGRESS TRACKING:
Since this is the player's FIRST analysis in this module, you will establish a baseline.
Set is_first_analysis to true and provide empty arrays for improvements, regressions, and neutral.
The overall_trend should be an encouraging message about establishing their baseline.`;
  }
  
  return `

THE SCORECARD - PROGRESS TRACKING:
You have been provided with the player's COMPLETE historical analysis data above.
Compare the CURRENT video analysis against ALL previous analyses to generate "The Scorecard" progress report.

CRITICAL: Your comparison must reference:
1. The MOST RECENT previous upload (immediate comparison)
2. PATTERNS across ALL previous uploads (long-term trends)

For IMPROVEMENTS - identify areas where the player has gotten better:
- Compare to last upload AND overall historical pattern
- Explain WHAT improved and HOW it aligns with long-term progress
- Use trend descriptors: "consistent improvement", "recent breakthrough", "gradual progress"

For REGRESSIONS - identify areas where the player has declined:
- Compare to last upload AND overall historical pattern
- Explain WHAT regressed and how it differs from recent AND historical performance
- Use trend descriptors: "recent decline", "recurring issue", "gradual regression"

For NEUTRAL - identify areas with no meaningful change:
- Note that performance is consistent with previous uploads
- This is not necessarily bad - stability in good mechanics is positive

SCORE TREND:
- Calculate direction: "improving" if trending up, "declining" if trending down, "stable" if within ±5 points
- average_change: average point change between consecutive uploads
- comparison_to_first: difference between current score and first-ever score

Be SPECIFIC and ACTIONABLE in your assessments. Reference actual mechanical elements, not vague generalities.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const body = await req.json();
    const { videoId, module, sport, userId } = requestSchema.parse(body);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    console.log(`Analyzing video ${videoId} for user ${userId}`);

    // Initialize Supabase client with service role
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update video status to processing
    await supabase.from("videos").update({ status: "processing" }).eq("id", videoId);

    // ===== FETCH HISTORICAL ANALYSIS DATA =====
    console.log(`Fetching historical analysis for user ${userId}, sport ${sport}, module ${module}`);
    
    const { data: historicalVideos, error: historyError } = await supabase
      .from("videos")
      .select("id, created_at, efficiency_score, ai_analysis")
      .eq("user_id", userId)
      .eq("sport", sport)
      .eq("module", module)
      .eq("status", "completed")
      .not("ai_analysis", "is", null)
      .neq("id", videoId) // Exclude current video
      .order("created_at", { ascending: true }); // Oldest first for chronological context
    
    if (historyError) {
      console.error("Error fetching historical data:", historyError);
    }
    
    const hasHistory = !!(historicalVideos && historicalVideos.length > 0);
    console.log(`Found ${historicalVideos?.length || 0} previous analyses`);
    
    // Format historical context for AI
    const historicalContext = formatHistoricalContext(historicalVideos || []);
    
    // Extract historical scores for trend display
    const historicalScores = historicalVideos?.map(v => v.efficiency_score).filter(s => s != null) || [];

    // Extract language from request
    const language = body.language || 'en';
    const languageName = getLanguageName(language);
    
    // Language instruction for non-English responses
    const languageInstruction = language !== 'en' 
      ? `\n\nIMPORTANT LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in ${languageName}. ALL text including feedback, drill names, drill steps, drill purposes, drill cues, summary bullets, scorecard areas, and descriptions MUST be written in ${languageName}. Do not use any English except for proper nouns or technical terms that have no translation.`
      : '';
    
    // Get system prompt based on module and sport
    const systemPrompt = getSystemPrompt(module, sport) + getScorecardInstructions(hasHistory) + languageInstruction;

    // Build user message with historical context
    const userMessage = `${historicalContext}

---

CURRENT VIDEO ANALYSIS:
Analyze this ${sport} ${module} video. Provide detailed feedback on form and mechanics. Include an efficiency score out of 100 and recommended drills.

${hasHistory ? `Based on the historical data above and this current analysis, generate "The Scorecard" progress report comparing current performance to ALL previous uploads.` : `This is the player's first analysis - establish a baseline.`}`;

    // Call Lovable AI for video analysis with tool-calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Provide structured video analysis with efficiency score and recommendations",
              parameters: {
                type: "object",
                properties: {
                  efficiency_score: {
                    type: "number",
                    description: "Score from 0-100 based on form correctness"
                  },
                  violations: {
                    type: "object",
                    description: "CRITICAL: Report ALL critical violations detected in the mechanics. Be HONEST - these flags directly determine score caps.",
                    properties: {
                      early_shoulder_rotation: {
                        type: "boolean",
                        description: "TRUE if shoulders rotate BEFORE front foot lands/plants"
                      },
                      shoulders_not_aligned: {
                        type: "boolean",
                        description: "TRUE if shoulders NOT aligned with target at moment of landing"
                      },
                      back_leg_not_facing_target: {
                        type: "boolean",
                        description: "TRUE if back hip/leg (foot, knee, hip) NOT facing target at landing"
                      },
                      hands_pass_elbow_early: {
                        type: "boolean",
                        description: "TRUE if hands pass back elbow BEFORE shoulders rotate (hitting only)"
                      },
                      front_shoulder_opens_early: {
                        type: "boolean",
                        description: "TRUE if front shoulder opens/pulls out of sequence too early (hitting only)"
                      }
                    },
                    required: ["early_shoulder_rotation", "shoulders_not_aligned", "back_leg_not_facing_target"]
                  },
                  summary: {
                    type: "array",
                    description: "REQUIRED: Exactly 3-5 bullet points in plain, beginner-friendly language (no jargon, max 15 words per bullet). Focus on actionable insights a player or parent would understand. Be direct about issues.",
                    items: { type: "string" }
                  },
                  feedback: {
                    type: "string",
                    description: "Detailed feedback on mechanics and form"
                  },
                  positives: {
                    type: "array",
                    description: "List of 2-4 specific positive aspects of the player's mechanics that they should feel good about and build upon",
                    items: { type: "string" }
                  },
                  drills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        purpose: { type: "string" },
                        steps: { type: "array", items: { type: "string" } },
                        reps_sets: { type: "string" },
                        equipment: { type: "string" },
                        cues: { type: "array", items: { type: "string" } }
                      },
                      required: ["title", "purpose", "steps", "reps_sets", "equipment", "cues"]
                    }
                  },
                  scorecard: {
                    type: "object",
                    description: "Progress tracking scorecard comparing current analysis to historical data",
                    properties: {
                      improvements: {
                        type: "array",
                        description: "Areas where player has improved compared to previous uploads",
                        items: {
                          type: "object",
                          properties: {
                            area: { type: "string", description: "Mechanical area that improved (e.g., 'Hand-elbow timing')" },
                            description: { type: "string", description: "What improved and how" },
                            trend: { type: "string", description: "One of: 'consistent improvement', 'recent breakthrough', 'gradual progress'" }
                          },
                          required: ["area", "description"]
                        }
                      },
                      regressions: {
                        type: "array",
                        description: "Areas where player has declined compared to previous uploads",
                        items: {
                          type: "object",
                          properties: {
                            area: { type: "string", description: "Mechanical area that regressed" },
                            description: { type: "string", description: "What regressed and how" },
                            trend: { type: "string", description: "One of: 'recent decline', 'recurring issue', 'gradual regression'" }
                          },
                          required: ["area", "description"]
                        }
                      },
                      neutral: {
                        type: "array",
                        description: "Areas with no meaningful change from previous uploads",
                        items: {
                          type: "object",
                          properties: {
                            area: { type: "string", description: "Mechanical area that stayed consistent" },
                            description: { type: "string", description: "Brief note about consistency" }
                          },
                          required: ["area", "description"]
                        }
                      },
                      overall_trend: { 
                        type: "string", 
                        description: "Overall progress summary in 1-2 sentences with actionable next focus" 
                      },
                      score_trend: {
                        type: "object",
                        properties: {
                          direction: { type: "string", description: "One of: 'improving', 'declining', 'stable'" },
                          average_change: { type: "number", description: "Average point change between consecutive uploads" },
                          comparison_to_first: { type: "number", description: "Score difference from first-ever to current upload" }
                        },
                        required: ["direction", "average_change", "comparison_to_first"]
                      },
                      is_first_analysis: { 
                        type: "boolean", 
                        description: "True if this is the player's first analysis in this module" 
                      }
                    },
                    required: ["improvements", "regressions", "neutral", "overall_trend", "is_first_analysis"]
                  }
                },
                required: ["efficiency_score", "violations", "summary", "feedback", "positives", "drills", "scorecard"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      const errorData = {
        code: response.status.toString(),
        message: errorText
      };
      
      await supabase
        .from("videos")
        .update({ 
          status: "failed",
          ai_analysis: { error: errorData }
        })
        .eq("id", videoId);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later.", status: 429 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace.", status: 402 }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI gateway error", status: 500 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    let efficiency_score = 75;
    let feedback = "No analysis available";
    let summary: string[] = [];
    let positives: string[] = [];
    let drills: any[] = [];
    // Calculate average historical score
    const averageHistoricalScore = historicalScores.length > 0 
      ? Math.round(historicalScores.reduce((sum, s) => sum + s, 0) / historicalScores.length)
      : null;

    let scorecard: any = {
      improvements: [],
      regressions: [],
      neutral: [],
      overall_trend: "Baseline established.",
      is_first_analysis: !hasHistory,
      historical_scores: historicalScores,
      average_historical_score: averageHistoricalScore
    };

    // Parse tool calls for structured output
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    let violations: any = {};
    let originalAiScore = 75;
    let scoreWasAdjusted = false;
    
    if (toolCalls && toolCalls.length > 0) {
      try {
        const analysisArgs = JSON.parse(toolCalls[0].function.arguments);
        efficiency_score = Math.round(analysisArgs.efficiency_score || 75);
        originalAiScore = efficiency_score;
        summary = analysisArgs.summary || [];
        feedback = analysisArgs.feedback || "No feedback available";
        positives = analysisArgs.positives || [];
        drills = analysisArgs.drills || [];
        violations = analysisArgs.violations || {};
        
        // ============ FEEDBACK-BASED VIOLATION OVERRIDE (FAILSAFE) ============
        // Scan feedback text for violation keywords - override AI flags if needed
        const feedbackViolations = detectViolationsFromFeedback(feedback);
        
        for (const [key, detected] of Object.entries(feedbackViolations)) {
          if (detected && !violations[key]) {
            console.log(`[VIOLATION OVERRIDE] "${key}" detected in feedback text but AI reported false - FORCING TRUE`);
            violations[key] = true;
          }
        }
        // ============ END FEEDBACK-BASED VIOLATION OVERRIDE ============
        
        // ============ PROGRAMMATIC SCORE CAP ENFORCEMENT ============
        // Count critical violations (after feedback override)
        let violationCount = 0;
        if (violations.early_shoulder_rotation) violationCount++;
        if (violations.shoulders_not_aligned) violationCount++;
        if (violations.back_leg_not_facing_target) violationCount++;
        if (violations.hands_pass_elbow_early) violationCount++;
        if (violations.front_shoulder_opens_early) violationCount++;
        
        console.log(`[VIOLATIONS] After feedback override: ${JSON.stringify(violations)}, count: ${violationCount}`);
        
        // Apply score caps - MULTIPLE VIOLATIONS FIRST (most restrictive)
        if (violationCount >= 2) {
          const cappedScore = Math.min(efficiency_score, 60);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Multiple critical violations (${violationCount}) - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        // Individual violation caps (only if not already capped by multiple violations)
        else if (violations.early_shoulder_rotation) {
          const cappedScore = Math.min(efficiency_score, 70);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Early shoulder rotation - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        else if (violations.hands_pass_elbow_early) {
          const cappedScore = Math.min(efficiency_score, 70);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Hands pass elbow early - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        else if (violations.shoulders_not_aligned) {
          const cappedScore = Math.min(efficiency_score, 75);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Shoulders not aligned - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        else if (violations.back_leg_not_facing_target) {
          const cappedScore = Math.min(efficiency_score, 75);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Back leg not facing target - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        else if (violations.front_shoulder_opens_early) {
          const cappedScore = Math.min(efficiency_score, 75);
          if (cappedScore !== efficiency_score) {
            console.log(`[SCORE CAP] Front shoulder opens early - capping score from ${efficiency_score} to ${cappedScore}`);
            efficiency_score = cappedScore;
            scoreWasAdjusted = true;
          }
        }
        
        // ============ HIGH SCORE SKEPTICISM CHECK ============
        // If AI gives high score (>75) with zero violations, but feedback mentions issues - be suspicious
        if (efficiency_score > 75 && violationCount === 0) {
          const feedbackMentionsIssues = feedbackViolations.back_leg_not_facing_target || 
                                          feedbackViolations.shoulders_not_aligned ||
                                          feedbackViolations.early_shoulder_rotation;
          
          if (feedbackMentionsIssues) {
            console.log(`[SKEPTICISM CHECK] High score (${efficiency_score}) with zero violations but feedback mentions issues - capping at 75`);
            efficiency_score = Math.min(efficiency_score, 75);
            scoreWasAdjusted = true;
          }
        }
        // ============ END SKEPTICISM CHECK ============
        
        if (scoreWasAdjusted) {
          console.log(`[SCORE CAP] Final score adjustment: ${originalAiScore} → ${efficiency_score}`);
        }
        // ============ END SCORE CAP ENFORCEMENT ============
        
        // Parse scorecard
        if (analysisArgs.scorecard) {
          scorecard = {
            ...analysisArgs.scorecard,
            historical_scores: historicalScores,
            average_historical_score: averageHistoricalScore,
            is_first_analysis: !hasHistory
          };
          
          // Calculate score trend if not provided
          if (!scorecard.score_trend && historicalScores.length > 0) {
            const allScores = [...historicalScores, efficiency_score];
            let totalChange = 0;
            for (let i = 1; i < allScores.length; i++) {
              totalChange += allScores[i] - allScores[i - 1];
            }
            const avgChange = allScores.length > 1 ? totalChange / (allScores.length - 1) : 0;
            const comparisonToFirst = efficiency_score - historicalScores[0];
            
            let direction = "stable";
            if (avgChange > 2) direction = "improving";
            else if (avgChange < -2) direction = "declining";
            
            scorecard.score_trend = {
              direction,
              average_change: Math.round(avgChange * 10) / 10,
              comparison_to_first: comparisonToFirst
            };
          }
        }
      } catch (parseError) {
        console.error("Error parsing tool call arguments:", parseError);
      }
    } else {
      // Fallback to text parsing if no tool calls
      const content = data.choices?.[0]?.message?.content || "";
      feedback = content;
      const scoreMatch = content.match(/(\d+)\/100/);
      if (scoreMatch) {
        efficiency_score = parseInt(scoreMatch[1]);
      }
    }
    
    // Guarantee bullets: If summary is empty or not an array, generate from feedback and positives
    if (!Array.isArray(summary) || summary.length === 0) {
      console.log("Summary empty or invalid, generating beginner bullets from feedback");
      summary = makeBeginnerBullets(feedback, positives);
    }

    const mocap_data = {
      module,
      sport,
      analyzed_at: new Date().toISOString(),
    };

    const ai_analysis = {
      summary,
      feedback,
      positives,
      drills,
      scorecard,
      violations_detected: violations,
      score_adjusted: scoreWasAdjusted,
      original_ai_score: originalAiScore,
      model_used: "google/gemini-2.5-flash",
      analyzed_at: new Date().toISOString(),
    };

    // Update video with analysis results
    const { error: updateError } = await supabase
      .from("videos")
      .update({
        status: "completed",
        efficiency_score,
        mocap_data,
        ai_analysis,
      })
      .eq("id", videoId);

    if (updateError) {
      console.error("Error updating video:", updateError);
      throw updateError;
    }

    // Update user progress
    const { data: progressData, error: progressFetchError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("module", module)
      .eq("sport", sport)
      .maybeSingle();

    if (progressFetchError) {
      console.error("Error fetching progress:", progressFetchError);
    } else {
      const newVideosAnalyzed = (progressData?.videos_analyzed || 0) + 1;
      const currentAvgScore = progressData?.average_efficiency_score || 0;
      const newAvgScore = currentAvgScore === 0 
        ? efficiency_score 
        : Math.round((currentAvgScore * (newVideosAnalyzed - 1) + efficiency_score) / newVideosAnalyzed);

      const { error: progressUpdateError } = await supabase
        .from("user_progress")
        .update({
          videos_analyzed: newVideosAnalyzed,
          average_efficiency_score: newAvgScore,
          last_activity: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("module", module)
        .eq("sport", sport);

      if (progressUpdateError) {
        console.error("Error updating progress:", progressUpdateError);
      }
    }

    // Decrement videos_remaining in subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("videos_remaining")
      .eq("user_id", userId)
      .single();

    if (subData && subData.videos_remaining > 0) {
      await supabase
        .from("subscriptions")
        .update({ videos_remaining: subData.videos_remaining - 1 })
        .eq("user_id", userId);
    }

    console.log(`Analysis complete for video ${videoId}`);

    return new Response(
      JSON.stringify({
        efficiency_score,
        summary,
        feedback,
        positives,
        drills,
        scorecard,
        mocap_data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("analyze-video error:", error);
    
    // Return validation errors with 400 status
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation error", details: error.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", status: 500 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
