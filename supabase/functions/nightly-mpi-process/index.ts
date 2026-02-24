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

      const scores: Array<{ userId: string; score: number; sessionsCount: number; segment: string; integrityScore: number; composites: Record<string, number> }> = [];

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

        // Calculate eligibility gates
        const gatesUpdate: Record<string, boolean> = {};
        gatesUpdate.games_minimum_met = count >= 60;
        gatesUpdate.integrity_threshold_met = integrityScore >= 80;
        gatesUpdate.coach_validation_met = gradedSessions.length >= count * 0.4;
        gatesUpdate.data_span_met = count >= 14;
        gatesUpdate.ranking_eligible = Object.values(gatesUpdate).every(v => v === true);

        await supabase
          .from('athlete_mpi_settings')
          .update(gatesUpdate)
          .eq('user_id', athlete.user_id);

        // Gap #5: Skip ineligible athletes from ranking pool
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
        const { userId, score, segment, integrityScore, composites } = scores[i];
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

        // Gap #1: Use proper segment_pool, Gap #3: Use upsert
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
        }, { onConflict: 'user_id,sport,calculation_date' });
      }

      console.log(`[nightly-mpi] ${sport}: Ranked ${scores.length} eligible athletes`);
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
