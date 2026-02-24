import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Step 4: Lock all unlocked sessions
    await supabase
      .from('performance_sessions')
      .update({ is_locked: true })
      .eq('is_locked', false)
      .is('deleted_at', null);

    console.log('[nightly-mpi] Sessions locked.');

    // Step 14-15: Calculate scores and rank per sport pool
    const sports = ['baseball', 'softball'];
    
    for (const sport of sports) {
      // Get all users with MPI settings for this sport
      const { data: athletes } = await supabase
        .from('athlete_mpi_settings')
        .select('*')
        .eq('sport', sport)
        .eq('admin_ranking_excluded', false);

      if (!athletes || athletes.length === 0) continue;

      const scores: Array<{ userId: string; score: number; sessionsCount: number }> = [];

      for (const athlete of athletes) {
        // Get recent sessions (last 90 days)
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
        let totalWeight = 0;

        for (const session of sessions) {
          const indexes = session.composite_indexes || {};
          const bqi = indexes.bqi || 0;
          const fqi = indexes.fqi || 0;
          const pei = indexes.pei || 0;
          const decision = indexes.decision || 0;
          const competitive = indexes.competitive_execution || 0;

          const sessionScore = (bqi * 0.25 + fqi * 0.15 + pei * 0.2 + decision * 0.2 + competitive * 0.2);
          totalScore += sessionScore;
          totalWeight += 1;
        }

        const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;

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
        let deltaMaturity = 0;
        const gradedSessions = sessions.filter(s => s.player_grade && s.coach_grade);
        if (gradedSessions.length > 0) {
          deltaMaturity = gradedSessions.reduce((sum, s) => 
            sum + Math.abs((s.player_grade || 0) - (s.coach_grade || 0)), 0) / gradedSessions.length;
        }

        scores.push({
          userId: athlete.user_id,
          score: adjustedScore * (integrityScore / 100),
          sessionsCount: sessions.length,
        });

        // Check ranking eligibility gates
        const gatesUpdate: Record<string, boolean> = {};
        gatesUpdate.games_minimum_met = sessions.length >= 60;
        gatesUpdate.integrity_threshold_met = integrityScore >= 80;
        gatesUpdate.coach_validation_met = gradedSessions.length >= sessions.length * 0.4;
        
        const firstSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
        const lastSession = sessions.length > 0 ? sessions[0] : null;
        gatesUpdate.data_span_met = sessions.length >= 14;
        gatesUpdate.ranking_eligible = Object.values(gatesUpdate).every(v => v === true);

        await supabase
          .from('athlete_mpi_settings')
          .update(gatesUpdate)
          .eq('user_id', athlete.user_id);
      }

      // Sort and assign ranks
      scores.sort((a, b) => b.score - a.score);
      const totalPool = scores.length;

      for (let i = 0; i < scores.length; i++) {
        const { userId, score, sessionsCount } = scores[i];
        const rank = i + 1;
        const percentile = ((totalPool - rank) / totalPool) * 100;

        // Calculate pro probability (simplified)
        let proProbability = Math.min(99, score * 1.1);
        const proProbabilityCapped = proProbability >= 99;

        // Calculate trend
        const { data: prevMpi } = await supabase
          .from('mpi_scores')
          .select('adjusted_global_score')
          .eq('user_id', userId)
          .eq('sport', sport)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const prevScore = prevMpi?.adjusted_global_score || score;
        const trendDelta = score - prevScore;
        const trendDirection = trendDelta > 2 ? 'rising' : trendDelta < -2 ? 'dropping' : 'stable';

        // Insert MPI score snapshot
        await supabase.from('mpi_scores').insert({
          user_id: userId,
          sport,
          calculation_date: new Date().toISOString().split('T')[0],
          adjusted_global_score: score,
          global_rank: rank,
          global_percentile: percentile,
          total_athletes_in_pool: totalPool,
          pro_probability: proProbability,
          pro_probability_capped: proProbabilityCapped,
          trend_direction: trendDirection,
          trend_delta_30d: trendDelta,
          segment_pool: `${sport}_general`,
          integrity_score: 100,
          composite_bqi: score * 0.25,
          composite_fqi: score * 0.15,
          composite_pei: score * 0.2,
          composite_decision: score * 0.2,
          composite_competitive: score * 0.2,
        });
      }

      console.log(`[nightly-mpi] ${sport}: Processed ${scores.length} athletes`);
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
