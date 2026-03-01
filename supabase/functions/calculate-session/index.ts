import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// JSONB field validation patterns
const VELOCITY_BAND_REGEX = /^(\d+-\d+|\d+\+|<\d+)$/;
const VALID_SWING_INTENTS = ['mechanical', 'game_intent', 'situational', 'hr_derby'];
const VALID_BATTED_BALL_TYPES = ['ground', 'line', 'fly', 'barrel'];
const VALID_SPIN_DIRECTIONS = ['topspin', 'backspin', 'sidespin'];

function validateMicroRep(rep: any): any {
  const cleaned = { ...rep };
  if (cleaned.swing_intent && !VALID_SWING_INTENTS.includes(cleaned.swing_intent)) delete cleaned.swing_intent;
  if (cleaned.batted_ball_type && !VALID_BATTED_BALL_TYPES.includes(cleaned.batted_ball_type)) delete cleaned.batted_ball_type;
  if (cleaned.spin_direction && !VALID_SPIN_DIRECTIONS.includes(cleaned.spin_direction)) delete cleaned.spin_direction;
  if (cleaned.machine_velocity_band && !VELOCITY_BAND_REGEX.test(cleaned.machine_velocity_band)) delete cleaned.machine_velocity_band;
  if (cleaned.velocity_band && !VELOCITY_BAND_REGEX.test(cleaned.velocity_band)) delete cleaned.velocity_band;
  return cleaned;
}

// Parse the numeric upper bound from a velocity band string (e.g. "100-110" -> 110, "75+" -> 75, "<60" -> 60)
function parseVeloBandUpper(band: string): number {
  if (band.endsWith('+')) return parseInt(band.replace('+', ''), 10);
  if (band.startsWith('<')) return parseInt(band.replace('<', ''), 10);
  const parts = band.split('-');
  return parseInt(parts[parts.length - 1], 10);
}

// Determine if a velocity band is "high" for its sport context
function isHighVelocityBand(band: string, sport: string): boolean {
  const upper = parseVeloBandUpper(band);
  if (sport === 'softball') return upper >= 70 || band.endsWith('+');
  // baseball
  return upper >= 100 || band === '110+';
}

async function processSession(supabase: any, userId: string, sessionId: string) {
  // Fetch the session
  const { data: session, error: sessionError } = await supabase
    .from('performance_sessions').select('*')
    .eq('id', sessionId).eq('user_id', userId).single();
  if (sessionError || !session) throw new Error('Session not found');

  // Fetch user MPI settings
  const { data: mpiSettings } = await supabase
    .from('athlete_mpi_settings').select('*')
    .eq('user_id', userId).maybeSingle();

  const sport = mpiSettings?.sport || session.sport || 'baseball';

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

  // ── Micro-layer data aggregation (Block 3) ──
  const rawMicroReps = Array.isArray(session.micro_layer_data) ? session.micro_layer_data : [];
  const microReps = rawMicroReps.map(validateMicroRep);

  // execution_score average (1-10 scale, normalize to 0-100)
  const execScores = microReps.filter((r: any) => r.execution_score).map((r: any) => r.execution_score);
  const avgExecScore = execScores.length > 0 ? (execScores.reduce((a: number, b: number) => a + b, 0) / execScores.length) * 10 : null;

  // Batted ball type aggregation
  const battedBalls = microReps.filter((r: any) => r.batted_ball_type);
  const barrelPct = battedBalls.length > 0 ? battedBalls.filter((r: any) => r.batted_ball_type === 'barrel').length / battedBalls.length * 100 : null;
  const lineDrivePct = battedBalls.length > 0 ? battedBalls.filter((r: any) => r.batted_ball_type === 'line').length / battedBalls.length * 100 : null;
  const hardContactPct = battedBalls.length > 0 ? battedBalls.filter((r: any) => ['barrel', 'line'].includes(r.batted_ball_type)).length / battedBalls.length * 100 : null;

  // Machine velocity difficulty multiplier (sport-relative)
  const velocityReps = microReps.filter((r: any) => r.machine_velocity_band);
  let velocityDifficultyMult = 1.0;
  if (velocityReps.length > 0) {
    const highVeloCount = velocityReps.filter((r: any) => isHighVelocityBand(r.machine_velocity_band, sport)).length;
    velocityDifficultyMult = 1.0 + (highVeloCount / velocityReps.length) * 0.15;
  }

  // Pitch command grade -> PEI
  const commandGrades = microReps.filter((r: any) => r.pitch_command_grade).map((r: any) => r.pitch_command_grade);
  const avgCommandGrade = commandGrades.length > 0 ? commandGrades.reduce((a: number, b: number) => a + b, 0) / commandGrades.length : null;

  // Throw accuracy -> FQI
  const throwAccGrades = microReps.filter((r: any) => r.throw_accuracy).map((r: any) => r.throw_accuracy);
  const avgThrowAcc = throwAccGrades.length > 0 ? throwAccGrades.reduce((a: number, b: number) => a + b, 0) / throwAccGrades.length : null;

  // BQI: blend drill grade with micro data
  let bqiRaw = normalizedScore * competitiveMultiplier;
  if (avgExecScore !== null) bqiRaw = bqiRaw * 0.7 + avgExecScore * 0.3;
  if (barrelPct !== null) bqiRaw += barrelPct * 0.1;
  bqiRaw *= velocityDifficultyMult;

  // FQI: blend with throw accuracy
  let fqiRaw = normalizedScore * 0.9;
  if (avgThrowAcc !== null) fqiRaw = fqiRaw * 0.6 + ((avgThrowAcc - 20) / 60) * 100 * 0.4;

  // PEI: blend with command grade
  let peiRaw = normalizedScore * 1.05;
  if (avgCommandGrade !== null) peiRaw = peiRaw * 0.6 + ((avgCommandGrade - 20) / 60) * 100 * 0.4;

  // BP distance power trend (Block 12)
  const distanceReps = microReps.filter((r: any) => r.bp_distance_ft);
  let bpPowerTrend: string | null = null;
  if (distanceReps.length >= 5) {
    const distances = distanceReps.map((r: any) => r.bp_distance_ft).sort((a: number, b: number) => a - b);
    const p75 = distances[Math.floor(distances.length * 0.75)];
    const aboveP75 = distances.filter((d: number) => d > p75).length / distances.length;
    bpPowerTrend = aboveP75 > 0.25 ? 'improving' : 'stable';
  }

  // High velocity success rate
  let proReadinessVelocity = false;
  const highVeloReps = velocityReps.filter((r: any) => isHighVelocityBand(r.machine_velocity_band, sport));
  if (highVeloReps.length >= 5) {
    const successReps = highVeloReps.filter((r: any) =>
      ['barrel', 'hard', 'line'].includes(r.contact_quality || r.batted_ball_type || '')
    );
    if (successReps.length / highVeloReps.length > 0.4) proReadinessVelocity = true;
  }

  const compositeIndexes: Record<string, any> = {
    bqi: Math.min(100, bqiRaw),
    fqi: Math.min(100, fqiRaw),
    pei: Math.min(100, peiRaw),
    decision: Math.min(100, normalizedScore * decisionMultiplier),
    competitive_execution: Math.min(100, normalizedScore * competitiveMultiplier),
    volume_adjusted: totalReps * volumeMultiplier,
    // Micro aggregates for downstream analytics
    barrel_pct: barrelPct,
    hard_contact_pct: hardContactPct,
    line_drive_pct: lineDrivePct,
    velocity_difficulty_mult: velocityDifficultyMult,
    bp_power_trend: bpPowerTrend,
    pro_readiness_velocity: proReadinessVelocity,
  };

  const effectiveGrade = session.coach_grade ?? session.player_grade ?? avgExecution;

  // Update session
  const { error: updateError } = await supabase
    .from('performance_sessions').update({
      composite_indexes: compositeIndexes,
      intent_compliance_pct: intentCompliancePct,
      effective_grade: effectiveGrade,
      data_density_level: mpiSettings?.data_density_level || 1,
    }).eq('id', sessionId);
  if (updateError) throw updateError;

  // Streak logic
  if (mpiSettings) {
    const { data: lastSession } = await supabase
      .from('performance_sessions').select('session_date')
      .eq('user_id', userId).is('deleted_at', null)
      .neq('id', sessionId)
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
    }).eq('user_id', userId);
  }

  // ── Governance flags ──
  const flags: any[] = [];

  // 1. Inflated grading
  if (session.player_grade && session.coach_grade) {
    const delta = session.player_grade - session.coach_grade;
    if (delta > 12) {
      flags.push({
        user_id: userId, flag_type: 'inflated_grading', severity: 'warning',
        source_session_id: sessionId,
        details: { player_grade: session.player_grade, coach_grade: session.coach_grade, delta },
      });
    }
  }

  // 2. Volume spike
  const { data: recentSessions } = await supabase
    .from('performance_sessions').select('drill_blocks')
    .eq('user_id', userId)
    .gte('session_date', new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0])
    .is('deleted_at', null);

  if (recentSessions && recentSessions.length > 2) {
    const avgVolume = recentSessions.reduce((sum: number, s: any) => {
      const blocks = s.drill_blocks || [];
      return sum + blocks.reduce((b: number, block: any) => b + (block.volume || 0), 0);
    }, 0) / recentSessions.length;

    if (totalReps > avgVolume * 3 && avgVolume > 0) {
      flags.push({
        user_id: userId, flag_type: 'volume_spike', severity: 'info',
        source_session_id: sessionId,
        details: { current_volume: totalReps, avg_volume: avgVolume },
      });
    }
  }

  // 3. Fatigue inconsistency
  const fatigueState = session.fatigue_state_at_session as any;
  if (fatigueState && (fatigueState.body <= 2 || fatigueState.overall <= 2) && avgExecution > 60) {
    flags.push({
      user_id: userId, flag_type: 'fatigue_inconsistency_hrv', severity: 'info',
      source_session_id: sessionId,
      details: { fatigue_state: fatigueState, execution_grade: avgExecution },
    });
  }

  // 4. Retroactive abuse
  if (session.is_retroactive) {
    const { data: retroSessions } = await supabase
      .from('performance_sessions').select('id')
      .eq('user_id', userId).eq('is_retroactive', true)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .is('deleted_at', null);

    if (retroSessions && retroSessions.length > 3) {
      flags.push({
        user_id: userId, flag_type: 'retroactive_abuse', severity: 'warning',
        source_session_id: sessionId,
        details: { retroactive_count_7d: retroSessions.length },
      });
    }
  }

  // 5. Grade consistency (narrow band)
  const { data: last10 } = await supabase
    .from('performance_sessions').select('player_grade')
    .eq('user_id', userId).is('deleted_at', null)
    .not('player_grade', 'is', null)
    .order('session_date', { ascending: false }).limit(10);

  if (last10 && last10.length >= 10) {
    const grades = last10.map((s: any) => s.player_grade as number);
    const minG = Math.min(...grades);
    const maxG = Math.max(...grades);
    if (maxG - minG <= 5) {
      flags.push({
        user_id: userId, flag_type: 'grade_consistency', severity: 'info',
        source_session_id: sessionId,
        details: { min_grade: minG, max_grade: maxG, range: maxG - minG },
      });
    }
  }

  // 6. Rapid improvement
  const { data: weekAgoScores } = await supabase
    .from('mpi_scores').select('adjusted_global_score')
    .eq('user_id', userId)
    .lte('calculation_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .order('calculation_date', { ascending: false }).limit(1).maybeSingle();

  if (weekAgoScores?.adjusted_global_score) {
    const currentComposite = (compositeIndexes.bqi + compositeIndexes.fqi + compositeIndexes.pei +
      compositeIndexes.decision + compositeIndexes.competitive_execution) / 5;
    const pctChange = ((currentComposite - weekAgoScores.adjusted_global_score) / weekAgoScores.adjusted_global_score) * 100;
    if (pctChange > 20) {
      flags.push({
        user_id: userId, flag_type: 'rapid_improvement', severity: 'info',
        source_session_id: sessionId,
        details: { pct_change: Math.round(pctChange), previous: weekAgoScores.adjusted_global_score },
      });
    }
  }

  // 7. Game inflation
  if (isGame && session.player_grade) {
    const { data: practiceSessions } = await supabase
      .from('performance_sessions').select('player_grade')
      .eq('user_id', userId).is('deleted_at', null)
      .not('player_grade', 'is', null)
      .not('session_type', 'in', '("game","live_scrimmage")')
      .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);

    if (practiceSessions && practiceSessions.length >= 3) {
      const avgPractice = practiceSessions.reduce((sum: number, s: any) => sum + (s.player_grade as number), 0) / practiceSessions.length;
      if (session.player_grade - avgPractice > 15) {
        flags.push({
          user_id: userId, flag_type: 'game_inflation', severity: 'warning',
          source_session_id: sessionId,
          details: { game_grade: session.player_grade, avg_practice: Math.round(avgPractice), delta: Math.round(session.player_grade - avgPractice) },
        });
      }
    }
  }

  // Insert governance flags
  if (flags.length > 0) {
    await supabase.from('governance_flags').insert(flags);
  }

  return { compositeIndexes, flags: flags.length };
}

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
    const { session_id, retroactive, date } = body;

    // ── Block 2: Retroactive recalculation path ──
    if (retroactive && date && !session_id) {
      const { data: dateSessions } = await supabase
        .from('performance_sessions').select('id')
        .eq('user_id', user.id).eq('session_date', date).is('deleted_at', null);

      if (!dateSessions || dateSessions.length === 0) {
        return new Response(JSON.stringify({ success: true, recalculated: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = [];
      for (const ds of dateSessions) {
        const result = await processSession(supabase, user.id, ds.id);
        results.push(result);
      }

      return new Response(JSON.stringify({ success: true, recalculated: dateSessions.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session_id) throw new Error('session_id required');

    const result = await processSession(supabase, user.id, session_id);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
