import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function tierToSegment(tier: string): string {
  if (['rec', 'travel'].includes(tier)) return 'youth';
  if (['hs_jv', 'hs_varsity'].includes(tier)) return 'hs';
  if (['college_d3', 'college_d2', 'college_d1'].includes(tier)) return 'college';
  if (['indie_pro', 'milb', 'mlb', 'ausl'].includes(tier)) return 'pro';
  return 'general';
}

function generateDevPrompts(composites: Record<string, number>, integrityScore: number, trendDirection: string, sessionsCount: number): string[] {
  const prompts: string[] = [];

  // Find weakest composite
  const entries = Object.entries(composites).filter(([k]) => k !== 'volume_adjusted');
  if (entries.length > 0) {
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0];
    const strongest = entries[entries.length - 1];
    const labels: Record<string, string> = { bqi: 'Bat Quality', fqi: 'Fielding Quality', pei: 'Pitching Execution', decision: 'Decision Making', competitive: 'Competitive Execution' };
    prompts.push(`Focus on ${labels[weakest[0]] || weakest[0]} — it's your lowest composite at ${Math.round(weakest[1])}`);
    if (strongest[1] > 60) {
      prompts.push(`${labels[strongest[0]] || strongest[0]} is your strength at ${Math.round(strongest[1])} — leverage it in games`);
    }
  }

  if (integrityScore < 80) {
    prompts.push('Maintain consistent self-grading to boost your integrity score above 80');
  }

  if (trendDirection === 'rising') {
    prompts.push('Your trend is rising — maintain consistency to lock in your gains');
  } else if (trendDirection === 'dropping') {
    prompts.push('Your trend is dipping — consider reviewing recent session footage and intensifying quality reps');
  }

  if (sessionsCount < 30) {
    prompts.push(`Log ${30 - sessionsCount} more sessions to strengthen your data profile`);
  } else if (sessionsCount < 60) {
    prompts.push(`${60 - sessionsCount} sessions until ranking eligibility — keep building`);
  }

  return prompts.slice(0, 4); // Max 4 prompts
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[nightly-mpi] Starting nightly MPI process...');

    // Step 1: Auto-resolve info-level governance flags older than 7 days
    await supabase
      .from('governance_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('severity', 'info')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

    // Step 2: Lock all unlocked sessions
    await supabase
      .from('performance_sessions')
      .update({ is_locked: true })
      .eq('is_locked', false)
      .is('deleted_at', null);

    console.log('[nightly-mpi] Sessions locked.');

    // Step 3: Calculate scores and rank per sport pool
    const sports = ['baseball', 'softball'];
    const today = new Date().toISOString().split('T')[0];

    for (const sport of sports) {
      const { data: athletes } = await supabase
        .from('athlete_mpi_settings')
        .select('*')
        .eq('sport', sport)
        .eq('admin_ranking_excluded', false);

      if (!athletes || athletes.length === 0) continue;

      const scores: Array<{ userId: string; score: number; sessionsCount: number; segment: string; integrityScore: number; composites: Record<string, number>; trendDirection?: string }> = [];

      for (const athlete of athletes) {
        const { data: sessions } = await supabase
          .from('performance_sessions')
          .select('composite_indexes, session_type, effective_grade, player_grade, coach_grade')
          .eq('user_id', athlete.user_id)
          .eq('sport', sport)
          .is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);

        if (!sessions || sessions.length === 0) continue;

        // Calculate adjusted global score
        let totalScore = 0;
        let totalBqi = 0, totalFqi = 0, totalPei = 0, totalDecision = 0, totalCompetitive = 0;

        for (const session of sessions) {
          const indexes = session.composite_indexes || {};
          const bqi = indexes.bqi || 0;
          const fqi = indexes.fqi || 0;
          const pei = indexes.pei || 0;
          const decision = indexes.decision || 0;
          const competitive = indexes.competitive_execution || 0;

          totalScore += (bqi * 0.25 + fqi * 0.15 + pei * 0.2 + decision * 0.2 + competitive * 0.2);
          totalBqi += bqi; totalFqi += fqi; totalPei += pei;
          totalDecision += decision; totalCompetitive += competitive;
        }

        const count = sessions.length;
        const avgScore = totalScore / count;

        // Apply tier multiplier
        const tierMultipliers: Record<string, number> = {
          rec: 0.6, travel: 0.75, hs_jv: 0.8, hs_varsity: 0.85,
          college_d3: 0.9, college_d2: 0.95, college_d1: 1.05,
          indie_pro: 1.1, milb: 1.25, mlb: 1.5, ausl: 1.5,
        };
        const tierMult = tierMultipliers[athlete.league_tier] || 1.0;
        const adjustedScore = avgScore * tierMult;

        // Check integrity
        const { data: flags } = await supabase
          .from('governance_flags')
          .select('flag_type, severity')
          .eq('user_id', athlete.user_id)
          .eq('status', 'pending');

        let integrityScore = 100;
        if (flags) {
          for (const flag of flags) {
            if (flag.severity === 'critical') integrityScore -= 15;
            else if (flag.severity === 'warning') integrityScore -= 5;
            else integrityScore -= 2;
          }
        }
        integrityScore = Math.max(0, integrityScore);

        // Self vs coach delta
        const gradedSessions = sessions.filter(s => s.player_grade && s.coach_grade);

        // Fix 1: Coach-less athletes auto-pass coach validation gate
        const hasCoach = !!athlete.primary_coach_id;
        const coachValidationMet = hasCoach
          ? gradedSessions.length >= count * 0.4
          : true; // Auto-pass if no coach assigned

        // Calculate eligibility gates
        const gatesUpdate: Record<string, boolean> = {};
        gatesUpdate.games_minimum_met = count >= 60;
        gatesUpdate.integrity_threshold_met = integrityScore >= 80;
        gatesUpdate.coach_validation_met = coachValidationMet;
        gatesUpdate.data_span_met = count >= 14;
        gatesUpdate.ranking_eligible = Object.values(gatesUpdate).every(v => v === true);

        await supabase
          .from('athlete_mpi_settings')
          .update(gatesUpdate)
          .eq('user_id', athlete.user_id);

        // Skip ineligible athletes from ranking pool
        if (!gatesUpdate.ranking_eligible) continue;

        const segment = tierToSegment(athlete.league_tier || '');

        scores.push({
          userId: athlete.user_id,
          score: adjustedScore * (integrityScore / 100),
          sessionsCount: count,
          segment,
          integrityScore,
          composites: {
            bqi: totalBqi / count,
            fqi: totalFqi / count,
            pei: totalPei / count,
            decision: totalDecision / count,
            competitive: totalCompetitive / count,
          },
        });
      }

      // Sort and assign ranks
      scores.sort((a, b) => b.score - a.score);
      const totalPool = scores.length;

      for (let i = 0; i < scores.length; i++) {
        const { userId, score, segment, integrityScore, composites, sessionsCount } = scores[i];
        const rank = i + 1;
        const percentile = totalPool > 1 ? ((totalPool - rank) / (totalPool - 1)) * 100 : 100;

        let proProbability = Math.min(99, score * 1.1);
        const proProbabilityCapped = proProbability >= 99;

        // Calculate trend
        const { data: prevMpi } = await supabase
          .from('mpi_scores')
          .select('adjusted_global_score')
          .eq('user_id', userId)
          .eq('sport', sport)
          .lt('calculation_date', today)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const prevScore = prevMpi?.adjusted_global_score || score;
        const trendDelta = score - prevScore;
        const trendDirection = trendDelta > 2 ? 'rising' : trendDelta < -2 ? 'dropping' : 'stable';

        // Fix 6: Generate development prompts
        const developmentPrompts = generateDevPrompts(composites, integrityScore, trendDirection, sessionsCount);

        await supabase.from('mpi_scores').upsert({
          user_id: userId,
          sport,
          calculation_date: today,
          adjusted_global_score: score,
          global_rank: rank,
          global_percentile: percentile,
          total_athletes_in_pool: totalPool,
          pro_probability: proProbability,
          pro_probability_capped: proProbabilityCapped,
          trend_direction: trendDirection,
          trend_delta_30d: trendDelta,
          segment_pool: `${sport}_${segment}`,
          integrity_score: integrityScore,
          composite_bqi: composites.bqi,
          composite_fqi: composites.fqi,
          composite_pei: composites.pei,
          composite_decision: composites.decision,
          composite_competitive: composites.competitive,
          development_prompts: developmentPrompts,
        }, { onConflict: 'user_id,sport,calculation_date' });
      }

      console.log(`[nightly-mpi] ${sport}: Ranked ${scores.length} eligible athletes`);

      // Fix 12: Generate heat map snapshots from micro_layer_data
      for (const { userId } of scores) {
        const { data: recentSessions } = await supabase
          .from('performance_sessions')
          .select('micro_layer_data, module')
          .eq('user_id', userId)
          .eq('sport', sport)
          .is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
          .not('micro_layer_data', 'is', null);

        if (!recentSessions || recentSessions.length === 0) continue;

        // Aggregate pitch locations into 3x3 grid
        const grid: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
        let totalPoints = 0;

        for (const sess of recentSessions) {
          const microData = sess.micro_layer_data || [];
          for (const rep of (Array.isArray(microData) ? microData : [])) {
            if (rep.pitch_location && typeof rep.pitch_location.row === 'number' && typeof rep.pitch_location.col === 'number') {
              const r = Math.min(2, Math.max(0, rep.pitch_location.row));
              const c = Math.min(2, Math.max(0, rep.pitch_location.col));
              grid[r][c]++;
              totalPoints++;
            }
          }
        }

        if (totalPoints > 0) {
          // Find blind zones (zones with <5% of total)
          const blindZones: Array<{row: number; col: number}> = [];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              if (grid[r][c] / totalPoints < 0.05) {
                blindZones.push({ row: r, col: c });
              }
            }
          }

          await supabase.from('heat_map_snapshots').upsert({
            user_id: userId,
            sport,
            map_type: 'pitch_location',
            time_window: '30d',
            grid_data: grid,
            blind_zones: blindZones,
            total_data_points: totalPoints,
            split_key: 'all',
            context_filter: 'all',
          }, { onConflict: 'user_id,sport,map_type,time_window,split_key,context_filter' } as any);
        }
      }

      // Fix 13: Update roadmap progress for athletes
      const { data: milestones } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .eq('sport', sport);

      if (milestones && milestones.length > 0) {
        for (const { userId, sessionsCount, score, integrityScore } of scores) {
          const { data: mpiSettings } = await supabase
            .from('athlete_mpi_settings')
            .select('streak_current')
            .eq('user_id', userId)
            .maybeSingle();

          const { data: prevMpi } = await supabase
            .from('mpi_scores')
            .select('trend_direction')
            .eq('user_id', userId)
            .eq('sport', sport)
            .eq('calculation_date', today)
            .maybeSingle();

          for (const milestone of milestones) {
            const req = milestone.requirements || {};
            let met = false;
            let progress = 0;

            if (req.min_sessions) {
              progress = Math.min(100, (sessionsCount / req.min_sessions) * 100);
              met = sessionsCount >= req.min_sessions;
            } else if (req.min_streak) {
              const streak = mpiSettings?.streak_current || 0;
              progress = Math.min(100, (streak / req.min_streak) * 100);
              met = streak >= req.min_streak;
            } else if (req.min_mpi) {
              progress = Math.min(100, (score / req.min_mpi) * 100);
              met = score >= req.min_mpi;
            } else if (req.trend) {
              met = prevMpi?.trend_direction === req.trend;
              progress = met ? 100 : 0;
            }

            await supabase.from('athlete_roadmap_progress').upsert({
              user_id: userId,
              milestone_id: milestone.id,
              status: met ? 'completed' : 'in_progress',
              progress_pct: Math.round(progress),
              completed_at: met ? new Date().toISOString() : null,
            }, { onConflict: 'user_id,milestone_id' } as any);
          }
        }
      }
    }

    console.log('[nightly-mpi] Complete.');

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[nightly-mpi] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
