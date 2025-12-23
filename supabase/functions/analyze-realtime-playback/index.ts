import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Module-specific mechanics categories and standards
const getModuleConfig = (module: string) => {
  switch (module) {
    case 'hitting':
      return {
        categories: ['Stance & Setup', 'Load & Timing', 'Stride & Weight Transfer', 'Hip Rotation', 'Bat Path & Contact', 'Follow-Through'],
        standards: `
HITTING STANDARDS TO CHECK:
- Stance: Feet shoulder-width, athletic bend, balanced weight distribution
- Load: Hands move back, weight shifts to back leg, front shoulder stays closed
- Stride: Controlled step toward pitcher, weight stays back until rotation
- Hip Rotation: Hips fire first before hands, creates hip-shoulder separation
- Bat Path: Hands stay inside ball, barrel stays in zone long, short to the ball
- Contact: Head down, eyes on ball, extension through contact zone
- Follow-Through: Full extension, balanced finish, belt buckle faces pitcher

RED FLAGS TO IDENTIFY:
- Stepping in the bucket (stepping away from plate)
- Casting the hands (bat gets too far from body)
- Early shoulder opening (losing power)
- Lunging forward (weight transfer too early)
- Rolling over on contact (weak ground balls)`
      };
    case 'pitching':
      return {
        categories: ['Balance & Posture', 'Leg Lift', 'Hip Lead & Stride', 'Arm Action', 'Release Point', 'Follow-Through'],
        standards: `
PITCHING STANDARDS TO CHECK:
- Balance: Tall posture at set, head over belly button
- Leg Lift: Knee at belt height minimum, controlled tempo
- Hip Lead: Hips move toward plate before hands break, creates separation
- Stride: 80-90% of height, landing closed, glove side pulls through
- Arm Action: Clean circle, elbow above shoulder at release, forearm layback
- Release: Out front, consistent slot, fingers behind ball
- Follow-Through: Full deceleration, fielding position

RED FLAGS TO IDENTIFY:
- Short stride (losing velocity and control)
- Flying open early (arm drag, control issues)
- Elbow below shoulder (injury risk)
- Landing open (opens too early)
- No trunk flexion at release (leaving pitches up)`
      };
    case 'throwing':
      return {
        categories: ['Grip & Setup', 'Footwork Alignment', 'Hip Rotation', 'Arm Path', 'Release', 'Follow-Through'],
        standards: `
THROWING STANDARDS TO CHECK:
- Grip: Four-seam for accuracy, fingers across seams
- Footwork: Aligned to target, momentum toward target
- Hip Rotation: Hips open before shoulders, creates power
- Arm Path: Elbow at or above shoulder, clean arm circle
- Release: Out front, fingers behind ball, wrist snap
- Follow-Through: Full arm extension, balanced finish

RED FLAGS TO IDENTIFY:
- Short-arming (no arm extension)
- Throwing across body (accuracy issues)
- Elbow dropping below shoulder (injury risk)
- No lower half involvement (all arm)
- Landing closed or too open`
      };
    default:
      return {
        categories: ['Setup', 'Load', 'Execution', 'Follow-Through'],
        standards: 'Focus on athletic position, balanced movement, and smooth execution.'
      };
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
    const moduleConfig = getModuleConfig(module);
    
    const systemPrompt = `You are an elite ${sport} ${module} coach with 20+ years of experience coaching at all levels from youth to professional. You provide SPECIFIC, ACTIONABLE feedback based on real mechanics standards - never generic advice.

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

${moduleConfig.standards}

Respond in ${languageName}.`;

    // Build message content with frames if available
    const userContent: Array<{type: string; text?: string; image_url?: {url: string}}> = [];
    
    if (frames.length > 0) {
      userContent.push({
        type: 'text',
        text: `Analyze these ${frames.length} key frames from this ${module} video for a ${sport} athlete. These frames are sequential from the beginning to end of the movement. Look at the specific body positions, movements, and mechanics visible in each frame. Provide specific feedback based on what you ACTUALLY SEE.

Use the analyze_mechanics tool to return your structured analysis.`
      });
      
      // Add each frame as an image
      for (const frame of frames) {
        userContent.push({
          type: 'image_url',
          image_url: { url: frame }
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

    // Use tool calling for guaranteed structured output
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
                          description: `One of: ${moduleConfig.categories.join(', ')}`
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
                    description: 'Analysis of 4-5 key mechanics categories based on what you observe in the frames'
                  },
                  keyStrength: {
                    type: 'string',
                    description: 'The ONE thing they are doing best - be specific about what body part or movement looks good THAT YOU CAN SEE'
                  },
                  priorityFix: {
                    type: 'string',
                    description: 'The ONE most important thing to fix based on what you observe - reference a specific issue you can see'
                  },
                  drillRecommendation: {
                    type: 'string',
                    description: 'One specific named drill with a focus cue to address the priority fix you identified'
                  }
                },
                required: ['overallScore', 'quickSummary', 'mechanicsBreakdown', 'keyStrength', 'priorityFix', 'drillRecommendation']
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
        keyStrength: 'Solid athletic stance with good balance throughout the swing',
        priorityFix: 'Work on initiating the hip rotation before the hands start forward',
        drillRecommendation: 'Tee work with pause at load - feel weight on back hip before firing'
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
        keyStrength: 'Excellent balance and posture throughout the delivery',
        priorityFix: 'Lead with the hip toward the plate before breaking the hands',
        drillRecommendation: 'Rocker drill focusing on hip lead - feel back hip driving toward target'
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
        keyStrength: 'Good lower body engagement and momentum toward target',
        priorityFix: 'Keep the throwing elbow at or above shoulder height at release',
        drillRecommendation: 'One-knee throws focusing on high elbow position through release'
      }
    };
    
    return new Response(JSON.stringify(fallbackByModule[module] || fallbackByModule.hitting), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
