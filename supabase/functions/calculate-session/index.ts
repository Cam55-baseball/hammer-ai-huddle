import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeSessionToughness } from "../_shared/repSourceToughness.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// JSONB field validation patterns
const VELOCITY_BAND_REGEX = /^(\d+-\d+|\d+\+|<\d+)$/;
const VALID_SWING_INTENTS = ['mechanical', 'game_intent', 'situational', 'hr_derby'];
const VALID_BATTED_BALL_TYPES = ['ground', 'line', 'fly', 'barrel', 'slow_roller', 'chopper'];
const VALID_SPIN_DIRECTIONS = ['topspin', 'backspin', 'sidespin', 'knuckle', 'backspin_tail'];
const VALID_THROW_SPIN_QUALITIES = ['carry', 'tail', 'cut', 'neutral'];
const VALID_EXCHANGE_TIME_BANDS = ['fast', 'average', 'slow'];
const VALID_ROUTE_EFFICIENCY = ['routine', 'plus', 'elite'];
const VALID_PLAY_PROBABILITY = ['routine', 'plus', 'elite'];
const VALID_RECEIVING_QUALITY = ['poor', 'average', 'elite'];
const VALID_CONTACT_TYPES = ['swing_miss', 'foul', 'weak_contact', 'hard_contact'];

function validateMicroRep(rep: any): any {
  const cleaned = { ...rep };
  if (cleaned.swing_intent && !VALID_SWING_INTENTS.includes(cleaned.swing_intent)) delete cleaned.swing_intent;
  if (cleaned.batted_ball_type && !VALID_BATTED_BALL_TYPES.includes(cleaned.batted_ball_type)) delete cleaned.batted_ball_type;
  if (cleaned.spin_direction && !VALID_SPIN_DIRECTIONS.includes(cleaned.spin_direction)) delete cleaned.spin_direction;
  if (cleaned.machine_velocity_band && !VELOCITY_BAND_REGEX.test(cleaned.machine_velocity_band)) delete cleaned.machine_velocity_band;
  if (cleaned.velocity_band && !VELOCITY_BAND_REGEX.test(cleaned.velocity_band)) delete cleaned.velocity_band;
  if (cleaned.throw_spin_quality && !VALID_THROW_SPIN_QUALITIES.includes(cleaned.throw_spin_quality)) delete cleaned.throw_spin_quality;
  if (cleaned.exchange_time_band && !VALID_EXCHANGE_TIME_BANDS.includes(cleaned.exchange_time_band)) delete cleaned.exchange_time_band;
  if (cleaned.route_efficiency && !VALID_ROUTE_EFFICIENCY.includes(cleaned.route_efficiency)) delete cleaned.route_efficiency;
  if (cleaned.play_probability && !VALID_PLAY_PROBABILITY.includes(cleaned.play_probability)) delete cleaned.play_probability;
  if (cleaned.receiving_quality && !VALID_RECEIVING_QUALITY.includes(cleaned.receiving_quality)) delete cleaned.receiving_quality;
  if (cleaned.contact_type && !VALID_CONTACT_TYPES.includes(cleaned.contact_type)) delete cleaned.contact_type;
  return cleaned;
}

function parseVeloBandUpper(band: string): number {
  if (band.endsWith('+')) return parseInt(band.replace('+', ''), 10);
  if (band.startsWith('<')) return parseInt(band.replace('<', ''), 10);
  const parts = band.split('-');
  return parseInt(parts[parts.length - 1], 10);
}

function isHighVelocityBand(band: string, sport: string): boolean {
  const upper = parseVeloBandUpper(band);
  if (sport === 'softball') return upper >= 70 || band.endsWith('+');
  return upper >= 100 || band === '110+';
}

async function processSession(supabase: any, userId: string, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('performance_sessions').select('*')
    .eq('id', sessionId).eq('user_id', userId).single();
  if (sessionError || !session) throw new Error('Session not found');

  const { data: mpiSettings } = await supabase
    .from('athlete_mpi_settings').select('*')
    .eq('user_id', userId).maybeSingle();

  const sport = mpiSettings?.sport || session.sport || 'baseball';

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

  // ── Micro-layer data aggregation ──
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

  // ── Rep-source toughness (per-rep context: tee vs live BP, bullpen vs vs-hitter, etc.) ──
  // This is the primary "practice toughness" signal — separates 100mph live BP from coach flips,
  // and live-hitter pitching from a clean bullpen. Scales BQI / PEI / competitive_execution.
  const moduleForToughness = (session.module ?? 'hitting') as string;
  const { toughness: repSourceToughness, breakdown: repSourceBreakdown } =
    computeSessionToughness(moduleForToughness, microReps);
  const isHittingSession = moduleForToughness === 'hitting' || moduleForToughness === 'bunting';
  const isPitchingSession = moduleForToughness === 'pitching';
  // Decision multiplier only boosts when reps were against a live arm/hitter.
  const liveContextBonus = repSourceToughness >= 1.05 ? repSourceToughness : 1.0;

  // Pitch command grade -> PEI
  const commandGrades = microReps.filter((r: any) => r.pitch_command_grade).map((r: any) => r.pitch_command_grade);
  const avgCommandGrade = commandGrades.length > 0 ? commandGrades.reduce((a: number, b: number) => a + b, 0) / commandGrades.length : null;

  // Throw accuracy -> FQI
  const throwAccGrades = microReps.filter((r: any) => r.throw_accuracy).map((r: any) => r.throw_accuracy);
  const avgThrowAcc = throwAccGrades.length > 0 ? throwAccGrades.reduce((a: number, b: number) => a + b, 0) / throwAccGrades.length : null;

  // ── NEW: 11 micro-layer field aggregation (Phase 2) ──
  // spin_direction -> BQI modifier
  const spinDirs = microReps.filter((r: any) => r.spin_direction).map((r: any) => r.spin_direction);
  let spinDirectionMod = 0;
  if (spinDirs.length > 0) {
    const spinMap: Record<string, number> = { backspin: 3, sidespin: 1, topspin: -2, knuckle: 0, backspin_tail: 4 };
    spinDirectionMod = spinDirs.reduce((sum: number, sd: string) => sum + (spinMap[sd] ?? 0), 0) / spinDirs.length;
  }

  // throw_spin_quality -> FQI modifier
  const throwSpins = microReps.filter((r: any) => r.throw_spin_quality).map((r: any) => r.throw_spin_quality);
  let throwSpinMod = 0;
  if (throwSpins.length > 0) {
    const tsMap: Record<string, number> = { carry: 5, tail: 2, cut: 2, neutral: 0 };
    throwSpinMod = throwSpins.reduce((sum: number, ts: string) => sum + (tsMap[ts] ?? 0), 0) / throwSpins.length;
  }

  // footwork_grade -> FQI sub-weight (20-80 scale)
  const footworkGrades = microReps.filter((r: any) => r.footwork_grade != null).map((r: any) => r.footwork_grade);
  const avgFootworkGrade = footworkGrades.length > 0 ? footworkGrades.reduce((a: number, b: number) => a + b, 0) / footworkGrades.length : null;

  // exchange_time_band -> FQI modifier
  const exchangeTimes = microReps.filter((r: any) => r.exchange_time_band).map((r: any) => r.exchange_time_band);
  let exchangeTimeMod = 0;
  if (exchangeTimes.length > 0) {
    const etMap: Record<string, number> = { fast: 5, average: 0, slow: -5 };
    exchangeTimeMod = exchangeTimes.reduce((sum: number, et: string) => sum + (etMap[et] ?? 0), 0) / exchangeTimes.length;
  }

  // clean_field_pct -> FQI consistency modifier (direct from drill blocks)
  const cleanFieldPcts = drillBlocks.filter((b: any) => b.clean_field_pct != null).map((b: any) => b.clean_field_pct);
  const avgCleanFieldPct = cleanFieldPcts.length > 0 ? cleanFieldPcts.reduce((a: number, b: number) => a + b, 0) / cleanFieldPcts.length : null;

  // whiff_pct -> BQI penalty
  const whiffPcts = drillBlocks.filter((b: any) => b.whiff_pct != null).map((b: any) => b.whiff_pct);
  const avgWhiffPct = whiffPcts.length > 0 ? whiffPcts.reduce((a: number, b: number) => a + b, 0) / whiffPcts.length : null;

  // chase_pct -> Decision penalty
  const chasePcts = drillBlocks.filter((b: any) => b.chase_pct != null).map((b: any) => b.chase_pct);
  const avgChasePct = chasePcts.length > 0 ? chasePcts.reduce((a: number, b: number) => a + b, 0) / chasePcts.length : null;

  // in_zone_contact_pct -> BQI bonus
  const izContactPcts = drillBlocks.filter((b: any) => b.in_zone_contact_pct != null).map((b: any) => b.in_zone_contact_pct);
  const avgIzContactPct = izContactPcts.length > 0 ? izContactPcts.reduce((a: number, b: number) => a + b, 0) / izContactPcts.length : null;

  // zone_pct -> PEI command precision
  const zonePcts = drillBlocks.filter((b: any) => b.zone_pct != null).map((b: any) => b.zone_pct);
  const avgZonePct = zonePcts.length > 0 ? zonePcts.reduce((a: number, b: number) => a + b, 0) / zonePcts.length : null;

  // pitch_whiff_pct -> PEI effectiveness
  const pitchWhiffPcts = drillBlocks.filter((b: any) => b.pitch_whiff_pct != null).map((b: any) => b.pitch_whiff_pct);
  const avgPitchWhiffPct = pitchWhiffPcts.length > 0 ? pitchWhiffPcts.reduce((a: number, b: number) => a + b, 0) / pitchWhiffPcts.length : null;

  // pitch_chase_pct -> PEI deception
  const pitchChasePcts = drillBlocks.filter((b: any) => b.pitch_chase_pct != null).map((b: any) => b.pitch_chase_pct);
  const avgPitchChasePct = pitchChasePcts.length > 0 ? pitchChasePcts.reduce((a: number, b: number) => a + b, 0) / pitchChasePcts.length : null;

  // ── BQI: blend drill grade with micro data ──
  let bqiRaw = normalizedScore * competitiveMultiplier;
  if (avgExecScore !== null) bqiRaw = bqiRaw * 0.7 + avgExecScore * 0.3;
  if (barrelPct !== null) bqiRaw += barrelPct * 0.1;
  if (spinDirectionMod !== 0) bqiRaw += spinDirectionMod;        // Phase 2: spin_direction
  if (avgWhiffPct !== null) bqiRaw -= avgWhiffPct * 0.1;         // Phase 2: whiff_pct penalty
  if (avgIzContactPct !== null) bqiRaw += avgIzContactPct * 0.1; // Phase 2: in_zone_contact bonus
  bqiRaw *= velocityDifficultyMult;
  // Apply rep-source toughness for hitting sessions (tee << flip << live BP).
  if (isHittingSession) bqiRaw *= repSourceToughness;

  // ── FQI: blend with throw accuracy + Phase 2 fields ──
  let fqiRaw = normalizedScore * 0.9;
  // Existing: throw_accuracy at 40%
  if (avgThrowAcc !== null) {
    const normalizedThrowAcc = ((avgThrowAcc - 20) / 60) * 100;
    // Phase 2: footwork_grade at 20%, clean_field_pct at 15%, throw_accuracy at 40%, base at 25%
    let fqiBase = normalizedScore * 0.25;
    fqiBase += normalizedThrowAcc * 0.40;
    if (avgFootworkGrade !== null) fqiBase += ((avgFootworkGrade - 20) / 60) * 100 * 0.20;
    else fqiBase += normalizedScore * 0.20;
    if (avgCleanFieldPct !== null) fqiBase += avgCleanFieldPct * 0.15;
    else fqiBase += normalizedScore * 0.15;
    fqiRaw = fqiBase;
  } else {
    // No throw_accuracy: use footwork/clean_field if available
    if (avgFootworkGrade !== null) fqiRaw = fqiRaw * 0.8 + ((avgFootworkGrade - 20) / 60) * 100 * 0.2;
    if (avgCleanFieldPct !== null) fqiRaw = fqiRaw * 0.85 + avgCleanFieldPct * 0.15;
  }
  if (throwSpinMod !== 0) fqiRaw += throwSpinMod;          // Phase 2: throw_spin_quality
  if (exchangeTimeMod !== 0) fqiRaw += exchangeTimeMod;    // Phase 2: exchange_time_band

  // ── Phase 3: Fielding quality modifiers ──
  const routeEffReps = microReps.filter((r: any) => r.route_efficiency).map((r: any) => r.route_efficiency);
  if (routeEffReps.length > 0) {
    const reMap: Record<string, number> = { routine: 0, plus: 3, elite: 6 };
    fqiRaw += routeEffReps.reduce((sum: number, v: string) => sum + (reMap[v] ?? 0), 0) / routeEffReps.length;
  }
  const playProbReps = microReps.filter((r: any) => r.play_probability).map((r: any) => r.play_probability);
  if (playProbReps.length > 0) {
    const ppMap: Record<string, number> = { routine: 0, plus: 3, elite: 6 };
    fqiRaw += playProbReps.reduce((sum: number, v: string) => sum + (ppMap[v] ?? 0), 0) / playProbReps.length;
  }
  const recQualReps = microReps.filter((r: any) => r.receiving_quality).map((r: any) => r.receiving_quality);
  if (recQualReps.length > 0) {
    const rqMap: Record<string, number> = { poor: -3, average: 0, elite: 5 };
    fqiRaw += recQualReps.reduce((sum: number, v: string) => sum + (rqMap[v] ?? 0), 0) / recQualReps.length;
  }

  // ── PEI: blend with command grade + Phase 2 fields ──
  let peiRaw = normalizedScore * 1.05;
  if (avgCommandGrade !== null) peiRaw = peiRaw * 0.6 + ((avgCommandGrade - 20) / 60) * 100 * 0.4;
  if (avgZonePct !== null) peiRaw += avgZonePct * 0.1;              // Phase 2: zone_pct
  if (avgPitchWhiffPct !== null) peiRaw += avgPitchWhiffPct * 0.08; // Phase 2: pitch_whiff_pct
  if (avgPitchChasePct !== null) peiRaw += avgPitchChasePct * 0.05; // Phase 2: pitch_chase_pct
  // Apply rep-source toughness for pitching sessions (bullpen << flat-ground vs hitter << live BP vs hitters).
  if (isPitchingSession) peiRaw *= repSourceToughness;

  // ── Decision: apply chase_pct penalty (only meaningful when reps had a live read) ──
  let decisionRaw = normalizedScore * decisionMultiplier * liveContextBonus;
  if (avgChasePct !== null) decisionRaw -= avgChasePct * 0.15; // Phase 2: chase_pct penalty

  // BP distance power trend
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
    bqi: Math.min(100, Math.max(0, bqiRaw)),
    fqi: Math.min(100, Math.max(0, fqiRaw)),
    pei: Math.min(100, Math.max(0, peiRaw)),
    decision: Math.min(100, Math.max(0, decisionRaw)),
    competitive_execution: Math.min(100, normalizedScore * competitiveMultiplier),
    volume_adjusted: totalReps * volumeMultiplier,
    // Micro aggregates for downstream analytics
    barrel_pct: barrelPct,
    hard_contact_pct: hardContactPct,
    line_drive_pct: lineDrivePct,
    velocity_difficulty_mult: velocityDifficultyMult,
    bp_power_trend: bpPowerTrend,
    pro_readiness_velocity: proReadinessVelocity,
    // Phase 2: store micro aggregates for roadmap gates
    avg_whiff_pct: avgWhiffPct,
    avg_chase_pct: avgChasePct,
    avg_iz_contact_pct: avgIzContactPct,
    avg_zone_pct: avgZonePct,
    avg_footwork_grade: avgFootworkGrade,
    avg_clean_field_pct: avgCleanFieldPct,
    // Phase 3: flat_ground_vs_hitter hybrid tagging
    evaluation_type: microReps.some((r: any) => r.rep_source === 'flat_ground_vs_hitter') ? 'hybrid' : undefined,
  };

  const effectiveGrade = session.coach_grade ?? session.player_grade ?? avgExecution;

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

    // ── Deterministic HIE execution with atomic lock ──
    let hie_completed = false;

    let lockAcquired = false;
    try {
      const r: any = await supabase
        .rpc('try_acquire_hie_lock', { p_user_id: user.id, p_stale_seconds: 120 });
      lockAcquired = r?.data === true;
    } catch {
      lockAcquired = false;
    }

    if (!lockAcquired) {
      // Another execution owns the lock — request rerun
      await supabase
        .from('hie_execution_locks')
        .update({ rerun_requested: true })
        .eq('user_id', user.id);
      // hie_completed = false signals client analysis is pending
    } else {
      try {
        // Loop until no more reruns requested
        let shouldRun = true;
        while (shouldRun) {
          // Extend lock timestamp before each run (prevents stale takeover)
          await supabase
            .from('hie_execution_locks')
            .update({ locked_at: new Date().toISOString(), rerun_requested: false })
            .eq('user_id', user.id);

          // 3-attempt retry with backoff
          let runSucceeded = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await supabase.functions.invoke('hie-analyze', {
                body: { user_id: user.id, sport: 'baseball' },
              });
              runSucceeded = true;
              hie_completed = true;
              break;
            } catch (hieErr) {
              console.warn(`HIE attempt ${attempt + 1}/3 failed:`, hieErr);
              if (attempt < 2) await new Promise(r => setTimeout(r, [2000, 5000, 10000][attempt]));
            }
          }

          // Check if rerun was requested during this execution
          const { data: lockState } = await supabase
            .from('hie_execution_locks')
            .select('rerun_requested')
            .eq('user_id', user.id)
            .maybeSingle();

          shouldRun = lockState?.rerun_requested === true;

          if (!runSucceeded && !shouldRun) {
            // All retries failed and no rerun pending — log governance flag
            try {
              await supabase.from('governance_flags').insert({
                user_id: user.id,
                flag_type: 'hie_analysis_failed',
                severity: 'warning',
                status: 'pending',
                source_session_id: session_id,
                details: { attempts: 3, timestamp: new Date().toISOString() },
              });
            } catch { /* non-fatal */ }
          }
        }
      } finally {
        // GUARANTEED lock release — even on unexpected errors
        await supabase
          .from('hie_execution_locks')
          .delete()
          .eq('user_id', user.id);
      }
    }

    return new Response(JSON.stringify({ success: true, hie_completed, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
