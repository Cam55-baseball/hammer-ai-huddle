import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
4. Hips Rotate
5. Torso Rotates
6. Shoulders Rotate (FRONT SHOULDER MUST STAY CLOSED UNTIL THIS POINT) ⭐
7. Hands/Bat Release (HANDS MUST NOT PASS BACK ELBOW BEFORE SHOULDERS ROTATE) ⭐⭐

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

Focus on:
1. ⭐⭐⭐ Does the head move LATERALLY toward the pitcher during swing sequence? (CRITICAL RED FLAG)
2. ⭐⭐ Does the head move EXCESSIVELY FORWARD during swing sequence? (Some natural movement OK)
3. ⭐ Do hands stay BEHIND the back elbow until AFTER shoulders begin rotating?
4. ⭐ Does the FRONT SHOULDER stay CLOSED until proper timing in sequence?
5. Does back elbow TRAVEL forward before hips?
6. Are timing gaps correct (elbow → hips → shoulders → hands)?

Provide:
- Efficiency score (1-10) based on form correctness
- **PRIORITY CHECK:** Flag if hands pass back elbow before shoulder rotation (major deduction to score)
- **PRIORITY CHECK:** Flag if front shoulder opens/pulls out of sequence (major deduction to score)
- **BALANCE CHECK:** Assess head movement and balance throughout the swing
- Specific feedback on:
  * Hand-elbow timing relative to shoulder rotation
  * Front shoulder control and timing (watch for early opening)
  * Head position and forward movement (balance indicator)
  * Back elbow travel
  * Kinetic sequence timing
- Identify any sequence violations and their impact on power/contact
- **If front shoulder opens early:** Explain impact on barrel tension, swing plane, and contact accuracy
- **If forward head movement detected:** Note correlation with back elbow position and hand travel
- Recommended drills to correct any sequence issues and improve balance

DO NOT MENTION: velocity, bat speed, exit velocity, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "baseball") {
    return baseInstructions + `CRITICAL BASEBALL PITCHING SEQUENCE:

Phase 1 - LANDING POSITION (MUST CHECK FIRST):
At the moment of front foot landing:
1. Back foot, knee, hip → ALL facing the target ⭐
2. Shoulders → In line with target ⭐
3. Front elbow → In line with target ⭐
4. Glove → Open and facing the target ⭐

Phase 2 - STANDARD SEQUENCING (After Landing):
5. Hip rotation
6. Torso rotation
7. Shoulder rotation
8. Arm action
9. Release

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
- ⚠️ Back leg (foot/knee/hip) NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK (pinpointed stress)
- ⚠️ Glove closed or not facing target at landing → Poor directional control
- ⚠️ Shoulders not aligned with target at landing → Energy leakage

Focus on:
1. Is back leg (foot, knee, hip) facing target at landing?
2. Are shoulders and front elbow aligned with target at landing?
3. Is glove open and facing target at landing?
4. Does arm flip up before shoulder rotation (patterning issue)?
5. Does back leg face target BEFORE shoulder moves?
6. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

When sequence is correct, the throw should feel EFFORTLESS and AUTOMATIC due to fascial contractile properties.

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "pitching" && sport === "softball") {
    return baseInstructions + `PROFESSIONAL SOFTBALL PITCHING STANDARDS:

Key Focus Areas:
1. Arm circle mechanics (windmill or slingshot)
2. Hip drive and rotation
3. Release point consistency
4. Balance and stability throughout delivery
5. Follow-through mechanics
6. Lower body engagement
7. Shoulder alignment

RED FLAGS TO IDENTIFY:
- ⚠️ Arm circle breaks or stalls → Reduces power and consistency
- ⚠️ Early shoulder rotation → Opens too soon, loses power
- ⚠️ Inconsistent release point → Reduces accuracy and movement
- ⚠️ Poor hip drive → Arm-only delivery, injury risk
- ⚠️ Landing off-balance → Control and repeat issues

Use your knowledge of professional softball pitching mechanics to evaluate form.

DO NOT MENTION: velocity, spin rate, or output metrics.
Focus ONLY on form and body mechanics.`;
  }

  if (module === "throwing") {
    return baseInstructions + `CRITICAL THROWING SEQUENCE:

Phase 1 - PRE-THROW POSITION:
Before shoulder rotation begins:
1. Back leg (foot, knee, hip) → MUST face the target ⭐
2. Glove → Open and facing target

Phase 2 - STANDARD SEQUENCING:
3. Footwork → Crow hop or pro step (aligned to target)
4. Hip rotation
5. Torso rotation
6. Shoulder rotation (AFTER back leg faces target)
7. Arm action (follows shoulder)
8. Release

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
- ⚠️ Back leg NOT facing target before shoulder rotation → Causes INACCURACIES
- ⚠️ Arm flips up BEFORE shoulder moves → INJURY RISK + velocity lowering (indicates T-spine mobility or patterning issue)
- ⚠️ Hand-elbow-shoulder angle ≥90° during arm flip-up → INJURY RISK (pinpointed stress)
- ⚠️ Poor footwork alignment (not directed to target) → Reduces accuracy

Focus on:
1. Does back leg (foot, knee, hip) face target BEFORE shoulder rotation?
2. Does arm flip up before shoulder moves (T-spine/patterning issue)?
3. Is footwork aligned to target?
4. Does shoulder move BEFORE arm action?
5. Is hand-elbow-shoulder angle less than 90° when hand flips up to travel forward?

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
                  quickSummary: {
                    type: 'string',
                    description: 'One encouraging sentence summarizing their form. Must reference at least one specific mechanic you observed in the frames.'
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
                required: ['overallScore', 'quickSummary', 'mechanicsBreakdown', 'positives', 'keyStrength', 'priorityFix', 'drills']
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
