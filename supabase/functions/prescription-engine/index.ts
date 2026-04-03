import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MicroPattern {
  category: string;
  metric: string;
  value: number;
  threshold: number;
  severity: "high" | "medium" | "low";
  description: string;
  zone_details?: string;
  data_points?: Record<string, any>;
}

interface WeaknessScore {
  metric: string;
  value: number;
  prev_value: number | null;
}

interface RecentPrescription {
  drill_name: string;
  weakness_area: string;
  effectiveness_score: number | null;
  adherence_count: number;
  targeted_metric: string | null;
}

interface AthleteProfile {
  age: number;
  level: string;
  batting_side: string;
  throwing_hand: string;
}

interface DrillCandidate {
  id: string;
  name: string;
  module: string;
  skill_target: string;
  default_constraints: any;
}

interface PrescriptionInput {
  user_id: string;
  patterns: MicroPattern[];
  weakness_scores: WeaknessScore[];
  recent_prescriptions: RecentPrescription[];
  athlete_profile: AthleteProfile;
  readiness_score: number;
  available_drills: DrillCandidate[];
}

interface PrescriptionResult {
  drill_id: string;
  name: string;
  module: string;
  constraints: { reps: number; velocity_band?: string; duration_sec?: number; intensity_pct?: number };
  rationale: string;
  targeted_metric: string;
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: PATTERN RANKING
// ═══════════════════════════════════════════════════════════════

function rankPatterns(patterns: MicroPattern[]): MicroPattern[] {
  const sevWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return [...patterns].sort((a, b) => {
    const aGameBonus = a.data_points?.context === 'game_gap' ? 0.5 : 0;
    const aFatigueBonus = a.metric === 'fatigue_dropoff' ? 0.3 : 0;
    const bGameBonus = b.data_points?.context === 'game_gap' ? 0.5 : 0;
    const bFatigueBonus = b.metric === 'fatigue_dropoff' ? 0.3 : 0;
    const aScore = (sevWeight[a.severity] ?? 1) * (1 + aGameBonus + aFatigueBonus);
    const bScore = (sevWeight[b.severity] ?? 1) * (1 + bGameBonus + bFatigueBonus);
    return bScore - aScore;
  });
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: CANDIDATE POOL
// ═══════════════════════════════════════════════════════════════

function getCandidatePool(
  pattern: MicroPattern,
  drills: DrillCandidate[],
  recentPrescriptions: RecentPrescription[],
): DrillCandidate[] {
  // Filter drills that target this pattern's metric or category
  let candidates = drills.filter(d =>
    d.skill_target === pattern.metric ||
    d.module === pattern.category ||
    d.skill_target === pattern.category
  );

  // Remove drills with negative effectiveness
  const ineffectiveNames = new Set(
    recentPrescriptions
      .filter(rx => rx.effectiveness_score != null && rx.effectiveness_score < 0)
      .map(rx => rx.drill_name)
  );
  candidates = candidates.filter(d => !ineffectiveNames.has(d.name));

  // Remove drills with adherence_count >= 3 in unresolved prescriptions
  const overusedNames = new Set(
    recentPrescriptions
      .filter(rx => rx.adherence_count >= 3)
      .map(rx => rx.drill_name)
  );
  candidates = candidates.filter(d => !overusedNames.has(d.name));

  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: DETERMINISTIC SCORING
// ═══════════════════════════════════════════════════════════════

function scoreDrill(
  drill: DrillCandidate,
  pattern: MicroPattern,
  recentPrescriptions: RecentPrescription[],
  readinessScore: number,
): number {
  // Base relevance
  const baseRelevance = drill.skill_target === pattern.metric ? 1.0 : 0.6;

  // Historical effectiveness
  const matchingRx = recentPrescriptions.filter(rx => rx.drill_name === drill.name && rx.effectiveness_score != null);
  const historicalEffectiveness = matchingRx.length > 0
    ? Math.max(0.1, matchingRx.reduce((sum, rx) => sum + (rx.effectiveness_score ?? 0), 0) / matchingRx.length / 10 + 0.5)
    : 1.0;

  // Fatigue penalty
  const currentRx = recentPrescriptions.find(rx => rx.drill_name === drill.name);
  const fatiguePenalty = currentRx ? Math.min(0.8, currentRx.adherence_count / 5) : 0;

  // Readiness adjustment
  const readinessAdj = readinessScore >= 70 ? 1.0 : readinessScore >= 50 ? 0.85 : 0.7;

  return baseRelevance * historicalEffectiveness * (1 - fatiguePenalty) * readinessAdj;
}

function selectTopDrill(
  pattern: MicroPattern,
  drills: DrillCandidate[],
  recentPrescriptions: RecentPrescription[],
  readinessScore: number,
): { drill: DrillCandidate; score: number } | null {
  const candidates = getCandidatePool(pattern, drills, recentPrescriptions);
  if (candidates.length === 0) return null;

  let best: DrillCandidate = candidates[0];
  let bestScore = -1;

  for (const drill of candidates) {
    const s = scoreDrill(drill, pattern, recentPrescriptions, readinessScore);
    if (s > bestScore) {
      bestScore = s;
      best = drill;
    }
  }

  return { drill: best, score: bestScore };
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: AI REFINEMENT
// ═══════════════════════════════════════════════════════════════

async function aiRefine(
  deterministicResults: PrescriptionResult[],
  patterns: MicroPattern[],
  athleteProfile: AthleteProfile,
  readinessScore: number,
): Promise<PrescriptionResult[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return deterministicResults;

  const drillList = deterministicResults.map(r => ({
    drill_id: r.drill_id, name: r.name, module: r.module,
    targeted_metric: r.targeted_metric, current_constraints: r.constraints,
  }));

  const prompt = `You are an elite baseball/softball development coach AI. 
Given the following athlete data and pre-selected drills, adjust the constraints and provide rationale for each drill.

ATHLETE: Age ${athleteProfile.age}, Level: ${athleteProfile.level}, Bats: ${athleteProfile.batting_side}, Throws: ${athleteProfile.throwing_hand}
READINESS: ${readinessScore}/100

PATTERNS DETECTED:
${patterns.slice(0, 5).map(p => `- ${p.metric}: ${p.description} (severity: ${p.severity}, value: ${p.value})`).join('\n')}

PRE-SELECTED DRILLS (you MUST only use these drill_ids — do NOT invent new drills):
${JSON.stringify(drillList, null, 2)}

For each drill, return adjusted constraints and a 1-2 sentence rationale explaining why this drill addresses the specific weakness.

RULES:
- You MUST only use drill_ids from the provided list
- Reps must be between 5 and 200
- intensity_pct must be between 50 and 100
- If readiness < 60, reduce reps by 30% and cap intensity at 75
- Rationale must reference the specific pattern data`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a sports science prescription engine. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_prescriptions",
            description: "Set the adjusted drill prescriptions",
            parameters: {
              type: "object",
              properties: {
                prescriptions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      drill_id: { type: "string" },
                      reps: { type: "number" },
                      velocity_band: { type: "string" },
                      duration_sec: { type: "number" },
                      intensity_pct: { type: "number" },
                      rationale: { type: "string" },
                    },
                    required: ["drill_id", "reps", "rationale"],
                  },
                },
              },
              required: ["prescriptions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_prescriptions" } },
      }),
    });

    if (!response.ok) {
      console.error(`AI gateway error: ${response.status}`);
      return deterministicResults;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return deterministicResults;

    const parsed = JSON.parse(toolCall.function.arguments);
    const aiPrescriptions = parsed.prescriptions;
    if (!Array.isArray(aiPrescriptions)) return deterministicResults;

    // Merge AI adjustments into deterministic results
    const validDrillIds = new Set(deterministicResults.map(r => r.drill_id));

    for (const aiRx of aiPrescriptions) {
      if (!validDrillIds.has(aiRx.drill_id)) continue; // Skip invented drills
      const existing = deterministicResults.find(r => r.drill_id === aiRx.drill_id);
      if (!existing) continue;

      // Validate and apply constraints
      if (typeof aiRx.reps === 'number' && aiRx.reps >= 5 && aiRx.reps <= 200) {
        existing.constraints.reps = aiRx.reps;
      }
      if (aiRx.velocity_band && typeof aiRx.velocity_band === 'string') {
        existing.constraints.velocity_band = aiRx.velocity_band;
      }
      if (typeof aiRx.duration_sec === 'number' && aiRx.duration_sec > 0) {
        existing.constraints.duration_sec = aiRx.duration_sec;
      }
      if (typeof aiRx.intensity_pct === 'number' && aiRx.intensity_pct >= 50 && aiRx.intensity_pct <= 100) {
        existing.constraints.intensity_pct = aiRx.intensity_pct;
      }
      if (typeof aiRx.rationale === 'string' && aiRx.rationale.length > 0) {
        existing.rationale = aiRx.rationale;
      }
    }

    return deterministicResults;
  } catch (err) {
    console.error("AI refinement failed:", err);
    return deterministicResults;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: PrescriptionInput = await req.json();

    // Step 1: Rank patterns
    const ranked = rankPatterns(input.patterns);
    const topPatterns = ranked.slice(0, 5);

    // Step 3: Deterministic scoring for each top pattern
    const deterministicResults: PrescriptionResult[] = [];
    const usedDrillIds = new Set<string>();

    for (const pattern of topPatterns) {
      const result = selectTopDrill(pattern, input.available_drills, input.recent_prescriptions, input.readiness_score);
      if (result && !usedDrillIds.has(result.drill.id)) {
        usedDrillIds.add(result.drill.id);
        const defaultConstraints = result.drill.default_constraints ?? {};
        deterministicResults.push({
          drill_id: result.drill.id,
          name: result.drill.name,
          module: result.drill.module,
          constraints: {
            reps: defaultConstraints.reps ?? 20,
            velocity_band: defaultConstraints.velocity_band,
            duration_sec: defaultConstraints.duration_sec,
            intensity_pct: defaultConstraints.intensity_pct ?? 80,
          },
          rationale: `Based on your performance data: ${pattern.description}`,
          targeted_metric: pattern.metric,
        });
      }
    }

    if (deterministicResults.length === 0) {
      return new Response(JSON.stringify({ prescriptions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: AI refinement (non-blocking fallback)
    const refined = await aiRefine(deterministicResults, topPatterns, input.athlete_profile, input.readiness_score);

    // Step 5: Final validation
    const validDrillIds = new Set(input.available_drills.map(d => d.id));
    const validated = refined.filter(r => {
      if (!validDrillIds.has(r.drill_id)) return false;
      if (r.constraints.reps < 5 || r.constraints.reps > 200) {
        r.constraints.reps = Math.max(5, Math.min(200, r.constraints.reps));
      }
      return true;
    });

    return new Response(JSON.stringify({ prescriptions: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Prescription engine error:", err);
    return new Response(JSON.stringify({ error: err.message, prescriptions: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
