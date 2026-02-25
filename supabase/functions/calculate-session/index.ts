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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { session_id } = body;
    if (!session_id) throw new Error('session_id required');

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('performance_sessions').select('*')
      .eq('id', session_id).eq('user_id', user.id).single();
    if (sessionError || !session) throw new Error('Session not found');

    // Fetch user MPI settings
    const { data: mpiSettings } = await supabase
      .from('athlete_mpi_settings').select('*')
      .eq('user_id', user.id).maybeSingle();

    // Calculate composite indexes from drill blocks
    const drillBlocks = session.drill_blocks || [];
    let totalExecution = 0, totalReps = 0, intentTagged = 0;

    for (const block of drillBlocks) {
      const execution = block.execution_grade || 50;
      const reps = block.volume || 1;
      totalExecution += execution * reps;
      totalReps += reps;
      if (block.intent) intentTagged += reps;
    }

    const avgExecution = totalReps > 0 ? totalExecution / totalReps : 50;
    const intentCompliancePct = totalReps > 0 ? (intentTagged / totalReps) * 100 : 0;
    const normalizedScore = ((avgExecution - 20) / 60) * 100;

    const sessionType = session.session_type;
    const isGame = ['game', 'live_scrimmage'].includes(sessionType);
    const isRehab = sessionType === 'rehab_session';

    const competitiveMultiplier = isGame ? 1.25 : isRehab ? 0.3 : 1.0;
    const decisionMultiplier = isGame ? 1.18 : isRehab ? 0.3 : 1.0;
    const volumeMultiplier = isGame ? 0.7 : isRehab ? 0.3 : 1.0;

    const compositeIndexes = {
      bqi: Math.min(100, normalizedScore * competitiveMultiplier),
      fqi: Math.min(100, normalizedScore * 0.9),
      pei: Math.min(100, normalizedScore * 1.05),
      decision: Math.min(100, normalizedScore * decisionMultiplier),
      competitive_execution: Math.min(100, normalizedScore * competitiveMultiplier),
      volume_adjusted: totalReps * volumeMultiplier,
    };

    const effectiveGrade = session.coach_grade ?? session.player_grade ?? avgExecution;

    // Update session
    const { error: updateError } = await supabase
      .from('performance_sessions').update({
        composite_indexes: compositeIndexes,
        intent_compliance_pct: intentCompliancePct,
        effective_grade: effectiveGrade,
        data_density_level: mpiSettings?.data_density_level || 1,
      }).eq('id', session_id);
    if (updateError) throw updateError;

    // Streak logic
    if (mpiSettings) {
      const { data: lastSession } = await supabase
        .from('performance_sessions').select('session_date')
        .eq('user_id', user.id).is('deleted_at', null)
        .neq('id', session_id)
        .order('session_date', { ascending: false })
        .limit(1).maybeSingle();

      const today = new Date(session.session_date);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let isConsecutive = false;
      if (lastSession?.session_date) {
        isConsecutive = new Date(lastSession.session_date) >= yesterday;
      }

      const newStreak = isConsecutive ? (mpiSettings.streak_current || 0) + 1 : 1;
      await supabase.from('athlete_mpi_settings').update({
        streak_current: newStreak,
        streak_best: Math.max(newStreak, mpiSettings.streak_best || 0),
      }).eq('user_id', user.id);
    }

    // ── Governance flags ──
    const flags: any[] = [];

    // 1. Inflated grading
    if (session.player_grade && session.coach_grade) {
      const delta = session.player_grade - session.coach_grade;
      if (delta > 12) {
        flags.push({
          user_id: user.id, flag_type: 'inflated_grading', severity: 'warning',
          source_session_id: session_id,
          details: { player_grade: session.player_grade, coach_grade: session.coach_grade, delta },
        });
      }
    }

    // 2. Volume spike
    const { data: recentSessions } = await supabase
      .from('performance_sessions').select('drill_blocks')
      .eq('user_id', user.id)
      .gte('session_date', new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0])
      .is('deleted_at', null);

    if (recentSessions && recentSessions.length > 2) {
      const avgVolume = recentSessions.reduce((sum, s) => {
        const blocks = s.drill_blocks || [];
        return sum + blocks.reduce((b: number, block: any) => b + (block.volume || 0), 0);
      }, 0) / recentSessions.length;

      if (totalReps > avgVolume * 3 && avgVolume > 0) {
        flags.push({
          user_id: user.id, flag_type: 'volume_spike', severity: 'info',
          source_session_id: session_id,
          details: { current_volume: totalReps, avg_volume: avgVolume },
        });
      }
    }

    // 3. Fatigue inconsistency
    const fatigueState = session.fatigue_state_at_session as any;
    if (fatigueState && (fatigueState.body <= 2 || fatigueState.overall <= 2) && avgExecution > 60) {
      flags.push({
        user_id: user.id, flag_type: 'fatigue_inconsistency_hrv', severity: 'info',
        source_session_id: session_id,
        details: { fatigue_state: fatigueState, execution_grade: avgExecution },
      });
    }

    // 4. Retroactive abuse
    if (session.is_retroactive) {
      const { data: retroSessions } = await supabase
        .from('performance_sessions').select('id')
        .eq('user_id', user.id).eq('is_retroactive', true)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .is('deleted_at', null);

      if (retroSessions && retroSessions.length > 3) {
        flags.push({
          user_id: user.id, flag_type: 'retroactive_abuse', severity: 'warning',
          source_session_id: session_id,
          details: { retroactive_count_7d: retroSessions.length },
        });
      }
    }

    // 5. Grade consistency (narrow band)
    const { data: last10 } = await supabase
      .from('performance_sessions').select('player_grade')
      .eq('user_id', user.id).is('deleted_at', null)
      .not('player_grade', 'is', null)
      .order('session_date', { ascending: false }).limit(10);

    if (last10 && last10.length >= 10) {
      const grades = last10.map(s => s.player_grade as number);
      const minG = Math.min(...grades);
      const maxG = Math.max(...grades);
      if (maxG - minG <= 5) {
        flags.push({
          user_id: user.id, flag_type: 'grade_consistency', severity: 'info',
          source_session_id: session_id,
          details: { min_grade: minG, max_grade: maxG, range: maxG - minG },
        });
      }
    }

    // 6. Rapid improvement
    const { data: weekAgoScores } = await supabase
      .from('mpi_scores').select('adjusted_global_score')
      .eq('user_id', user.id)
      .lte('calculation_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      .order('calculation_date', { ascending: false }).limit(1).maybeSingle();

    if (weekAgoScores?.adjusted_global_score) {
      const currentComposite = (compositeIndexes.bqi + compositeIndexes.fqi + compositeIndexes.pei +
        compositeIndexes.decision + compositeIndexes.competitive_execution) / 5;
      const pctChange = ((currentComposite - weekAgoScores.adjusted_global_score) / weekAgoScores.adjusted_global_score) * 100;
      if (pctChange > 20) {
        flags.push({
          user_id: user.id, flag_type: 'rapid_improvement', severity: 'info',
          source_session_id: session_id,
          details: { pct_change: Math.round(pctChange), previous: weekAgoScores.adjusted_global_score },
        });
      }
    }

    // 7. Game inflation
    if (isGame && session.player_grade) {
      const { data: practiceSessions } = await supabase
        .from('performance_sessions').select('player_grade')
        .eq('user_id', user.id).is('deleted_at', null)
        .not('player_grade', 'is', null)
        .not('session_type', 'in', '("game","live_scrimmage")')
        .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);

      if (practiceSessions && practiceSessions.length >= 3) {
        const avgPractice = practiceSessions.reduce((sum, s) => sum + (s.player_grade as number), 0) / practiceSessions.length;
        if (session.player_grade - avgPractice > 15) {
          flags.push({
            user_id: user.id, flag_type: 'game_inflation', severity: 'warning',
            source_session_id: session_id,
            details: { game_grade: session.player_grade, avg_practice: Math.round(avgPractice), delta: Math.round(session.player_grade - avgPractice) },
          });
        }
      }
    }

    // Insert governance flags
    if (flags.length > 0) {
      await supabase.from('governance_flags').insert(flags);
    }

    return new Response(JSON.stringify({ success: true, compositeIndexes, flags: flags.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
