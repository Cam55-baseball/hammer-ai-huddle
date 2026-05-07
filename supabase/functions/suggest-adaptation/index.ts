import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { resolveSeasonPhase, getSeasonProfile } from '../_shared/seasonPhase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AdaptationSuggestion {
  priority: 'high' | 'medium' | 'low';
  type: 'reduce_volume' | 'reduce_intensity' | 'swap_exercise' | 'add_recovery' | 'skip_block';
  message: string;
  action?: string;
  targetBlockId?: string;
  targetExerciseId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // --- Subscription entitlement check ---
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .eq('status', 'active')
      .maybeSingle();

    if (!ownerRole) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, subscribed_modules')
        .eq('user_id', userId)
        .maybeSingle();

      const hasActiveModule = subscription?.status === 'active'
        && (subscription?.subscribed_modules?.length ?? 0) > 0;

      if (!hasActiveModule) {
        return new Response(
          JSON.stringify({ error: 'Subscription required to use AI features' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- End entitlement check ---

    const body = await req.json();
    const { readiness_score, pain_areas, planned_workout, sleep_quality, energy_level, soreness_level } = body;

    console.log('[suggest-adaptation] Analyzing for user:', userId);

    // Phase context
    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings')
      .select('season_status, preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date')
      .eq('user_id', userId)
      .maybeSingle();
    const phaseRes = resolveSeasonPhase(mpiSettings as any);
    const profile = getSeasonProfile(phaseRes.phase);

    const suggestions: AdaptationSuggestion[] = [];

    // Phase-driven baseline
    if (phaseRes.phase === 'in_season') {
      suggestions.push({ priority: 'medium', type: 'reduce_intensity',
        message: 'In-Season: protecting game-day bandwidth — keep training submax.',
        action: 'Cap intensity at 70-75% and avoid new mechanical changes.' });
    } else if (phaseRes.phase === 'post_season') {
      suggestions.push({ priority: 'high', type: 'add_recovery',
        message: 'Post-Season: prioritize physical reset and pain resolution.',
        action: 'Skip max-effort lifts; emphasize mobility, sleep, soft tissue.' });
    } else if (phaseRes.phase === 'preseason') {
      suggestions.push({ priority: 'low', type: 'reduce_intensity',
        message: 'Pre-Season: ramping toward opening day — monitor fatigue closely.',
        action: 'Add a recovery day for every 3 high-CNS days.' });
    }

    if (readiness_score !== undefined) {
      if (readiness_score < 50) {
        suggestions.push({
          priority: 'high',
          type: 'reduce_intensity',
          message: 'Low readiness detected - consider reducing workout intensity by 20-30%',
          action: 'Switch to submax intent for all explosive exercises',
        });
      } else if (readiness_score < 70) {
        suggestions.push({
          priority: 'medium',
          type: 'reduce_volume',
          message: 'Moderate readiness - consider reducing total volume',
          action: 'Remove one set from each compound exercise',
        });
      }
    }

    if (sleep_quality !== undefined && sleep_quality < 3) {
      suggestions.push({
        priority: 'high',
        type: 'skip_block',
        message: 'Poor sleep quality impacts CNS recovery - skip high-intensity blocks',
        action: 'Skip CNS Primer block or reduce to 50% intensity',
      });
    }

    if (energy_level !== undefined && energy_level < 3) {
      suggestions.push({
        priority: 'medium',
        type: 'reduce_volume',
        message: 'Low energy - prioritize quality over quantity',
        action: 'Reduce total sets by 25% and focus on technique',
      });
    }

    if (soreness_level !== undefined && soreness_level > 3) {
      suggestions.push({
        priority: 'high',
        type: 'add_recovery',
        message: 'High soreness detected - add extra recovery work',
        action: 'Add 5-10 minutes of foam rolling before training',
      });
    }

    if (pain_areas && pain_areas.length > 0) {
      for (const area of pain_areas) {
        const lowerArea = area.toLowerCase();
        
        if (lowerArea.includes('back') || lowerArea.includes('spine')) {
          suggestions.push({
            priority: 'high',
            type: 'swap_exercise',
            message: `Back discomfort reported - modify loading patterns`,
            action: 'Replace axial loading exercises with unilateral alternatives',
          });
        }
        
        if (lowerArea.includes('shoulder') || lowerArea.includes('arm')) {
          suggestions.push({
            priority: 'high',
            type: 'swap_exercise',
            message: `Upper body discomfort - reduce overhead and pressing work`,
            action: 'Reduce pressing volume by 50% and avoid overhead positions',
          });
        }
        
        if (lowerArea.includes('knee') || lowerArea.includes('leg')) {
          suggestions.push({
            priority: 'high',
            type: 'reduce_intensity',
            message: `Lower body discomfort - reduce impact and load`,
            action: 'Skip plyometric exercises and reduce squat depth',
          });
        }
      }
    }

    if (planned_workout?.blocks) {
      const blocks = planned_workout.blocks;
      const hasHighCNS = blocks.some((b: any) => 
        b.blockType === 'cns_primer' || b.blockType === 'power_speed'
      );
      const hasPlyos = blocks.some((b: any) => 
        b.exercises?.some((e: any) => e.type === 'plyometric')
      );

      if (hasHighCNS && readiness_score && readiness_score < 60) {
        suggestions.push({
          priority: 'high',
          type: 'skip_block',
          message: 'CNS-intensive blocks detected with low readiness',
          action: 'Consider skipping or significantly modifying CNS Primer block',
        });
      }

      if (hasPlyos && soreness_level && soreness_level > 3) {
        suggestions.push({
          priority: 'medium',
          type: 'swap_exercise',
          message: 'Plyometrics planned with elevated soreness',
          action: 'Replace plyometric exercises with lower-impact alternatives',
        });
      }
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return new Response(JSON.stringify({
      success: true,
      suggestions,
      context: {
        readinessScore: readiness_score,
        painAreas: pain_areas,
        sleepQuality: sleep_quality,
        energyLevel: energy_level,
        sorenessLevel: soreness_level,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[suggest-adaptation] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
