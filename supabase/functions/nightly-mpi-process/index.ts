import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Data constants (mirrored from src/data/) ──

const tierMultipliers: Record<string, number> = {
  rec: 0.6, travel: 0.75, hs_jv: 0.8, hs_varsity: 0.85,
  college_d3: 0.9, college_d2: 0.95, college_d1: 1.05,
  indie_pro: 1.1, milb: 1.25, mlb: 1.5, ausl: 1.5,
};

const ageCurvesBaseball = [
  { min: 0, max: 15, m: 0.85 }, { min: 16, max: 18, m: 0.92 },
  { min: 19, max: 22, m: 0.97 }, { min: 23, max: 27, m: 1.0 },
  { min: 28, max: 32, m: 0.98 }, { min: 33, max: 36, m: 0.95 },
  { min: 37, max: 40, m: 0.90 }, { min: 41, max: 999, m: 0.85 },
];
const ageCurvesSoftball = [
  { min: 0, max: 14, m: 0.85 }, { min: 15, max: 17, m: 0.92 },
  { min: 18, max: 21, m: 0.97 }, { min: 22, max: 28, m: 1.0 },
  { min: 29, max: 33, m: 0.97 }, { min: 34, max: 38, m: 0.93 },
  { min: 39, max: 999, m: 0.88 },
];

function getAgeMult(sport: string, age: number): number {
  const curves = sport === 'softball' ? ageCurvesSoftball : ageCurvesBaseball;
  return curves.find(c => age >= c.min && age <= c.max)?.m ?? 1.0;
}

const positionWeights: Record<string, number> = {
  C: 1.08, '1B': 0.95, '2B': 1.02, SS: 1.06, '3B': 1.00,
  LF: 0.96, CF: 1.04, RF: 0.98, P: 1.10, DH: 0.90, UT: 1.00, DP: 0.90,
};

const verifiedStatBoosts: Record<string, { competitiveBoost: number; validationBoost: number }> = {
  mlb: { competitiveBoost: 22, validationBoost: 15 },
  milb: { competitiveBoost: 8, validationBoost: 5 },
  ncaa_d1: { competitiveBoost: 12, validationBoost: 10 },
  ncaa_d2: { competitiveBoost: 8, validationBoost: 7 },
  ncaa_d3: { competitiveBoost: 5, validationBoost: 4 },
  naia: { competitiveBoost: 4, validationBoost: 3 },
  ausl: { competitiveBoost: 22, validationBoost: 15 },
  indie_pro: { competitiveBoost: 6, validationBoost: 4 },
  foreign_pro: { competitiveBoost: 10, validationBoost: 7 },
};

const releasePenalties = [
  { n: 1, pct: 12 }, { n: 2, pct: 18 }, { n: 3, pct: 25 },
];
function getReleasePenalty(count: number): number {
  if (count <= 0) return 0;
  return releasePenalties.find(r => r.n === count)?.pct ?? 30;
}

// Tiered pro probability
const tierThresholds = [
  { minS: 80, maxS: 100, minP: 75, maxP: 99 },
  { minS: 65, maxS: 79.99, minP: 45, maxP: 74 },
  { minS: 55, maxS: 64.99, minP: 20, maxP: 44 },
  { minS: 45, maxS: 54.99, minP: 8, maxP: 19 },
  { minS: 30, maxS: 44.99, minP: 2, maxP: 7 },
  { minS: 0, maxS: 29.99, minP: 0.1, maxP: 1.9 },
];
function calcProProb(score: number): number {
  const t = tierThresholds.find(t => score >= t.minS && score <= t.maxS);
  if (!t) return 0.1;
  const ratio = (t.maxS - t.minS) > 0 ? (score - t.minS) / (t.maxS - t.minS) : 0;
  return t.minP + ratio * (t.maxP - t.minP);
}

function tierToSegment(tier: string): string {
  if (['rec', 'travel'].includes(tier)) return 'youth';
  if (['hs_jv', 'hs_varsity'].includes(tier)) return 'hs';
  if (['college_d3', 'college_d2', 'college_d1'].includes(tier)) return 'college';
  if (['indie_pro', 'milb', 'mlb', 'ausl'].includes(tier)) return 'pro';
  return 'general';
}

function generateDevPrompts(composites: Record<string, number>, integrityScore: number, trendDirection: string, sessionsCount: number): string[] {
  const prompts: string[] = [];
  const entries = Object.entries(composites).filter(([k]) => k !== 'volume_adjusted');
  if (entries.length > 0) {
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0];
    const strongest = entries[entries.length - 1];
    const labels: Record<string, string> = { bqi: 'Bat Quality', fqi: 'Fielding Quality', pei: 'Pitching Execution', decision: 'Decision Making', competitive: 'Competitive Execution' };
    prompts.push(`Focus on ${labels[weakest[0]] || weakest[0]} — it's your lowest composite at ${Math.round(weakest[1])}`);
    if (strongest[1] > 60) prompts.push(`${labels[strongest[0]] || strongest[0]} is your strength at ${Math.round(strongest[1])} — leverage it in games`);
  }
  if (integrityScore < 80) prompts.push('Maintain consistent self-grading to boost your integrity score above 80');
  if (trendDirection === 'rising') prompts.push('Your trend is rising — maintain consistency to lock in your gains');
  else if (trendDirection === 'dropping') prompts.push('Your trend is dipping — consider reviewing recent session footage and intensifying quality reps');
  if (sessionsCount < 30) prompts.push(`Log ${30 - sessionsCount} more sessions to strengthen your data profile`);
  else if (sessionsCount < 60) prompts.push(`${60 - sessionsCount} sessions until ranking eligibility — keep building`);
  return prompts.slice(0, 4);
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sq = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(sq);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    console.log('[nightly-mpi] Starting nightly MPI process...');

    // Step 1: Auto-resolve info-level governance flags older than 7 days
    await supabase.from('governance_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('severity', 'info').eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

    // Step 2: Lock all unlocked sessions
    await supabase.from('performance_sessions')
      .update({ is_locked: true })
      .eq('is_locked', false).is('deleted_at', null);
    console.log('[nightly-mpi] Sessions locked.');

    // Step 3: Calculate scores per sport
    const sports = ['baseball', 'softball'];
    const today = new Date().toISOString().split('T')[0];

    for (const sport of sports) {
      const { data: athletes } = await supabase.from('athlete_mpi_settings')
        .select('*').eq('sport', sport).eq('admin_ranking_excluded', false);
      if (!athletes || athletes.length === 0) continue;

      // Batch-fetch professional statuses & verified profiles
      const userIds = athletes.map(a => a.user_id);
      const { data: proStatuses } = await supabase.from('athlete_professional_status')
        .select('*').in('user_id', userIds).eq('sport', sport);
      const proMap = new Map((proStatuses ?? []).map(p => [p.user_id, p]));

      const { data: verifiedProfiles } = await supabase.from('verified_stat_profiles')
        .select('*').in('user_id', userIds).eq('verified', true);
      const verifiedMap = new Map<string, any[]>();
      for (const vp of verifiedProfiles ?? []) {
        if (!verifiedMap.has(vp.user_id)) verifiedMap.set(vp.user_id, []);
        verifiedMap.get(vp.user_id)!.push(vp);
      }

      // Batch-fetch scout evaluations
      const { data: scoutEvals } = await supabase.from('scout_evaluations')
        .select('*').in('athlete_id', userIds)
        .order('created_at', { ascending: false });
      const scoutMap = new Map<string, number[]>();
      for (const se of scoutEvals ?? []) {
        if (!scoutMap.has(se.athlete_id)) scoutMap.set(se.athlete_id, []);
        scoutMap.get(se.athlete_id)!.push(se.overall_grade ?? se.tools_grade ?? 50);
      }

      const scores: Array<{
        userId: string; score: number; sessionsCount: number; segment: string;
        integrityScore: number; composites: Record<string, number>;
        verifiedBoost: number; contractMod: number;
        gamePracticeRatio: number | null; deltaMaturity: number | null;
        fatigueCorrFlag: boolean; hofActive: boolean; hofProb: number | null;
        proProbability: number; proProbCapped: boolean;
      }> = [];

      for (const athlete of athletes) {
        const uid = athlete.user_id;

        // Fetch 90-day sessions
        const { data: sessions } = await supabase.from('performance_sessions')
          .select('composite_indexes, session_type, effective_grade, player_grade, coach_grade, fatigue_state_at_session')
          .eq('user_id', uid).eq('sport', sport).is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
        if (!sessions || sessions.length === 0) continue;

        // ── Raw composite averages ──
        let totalBqi = 0, totalFqi = 0, totalPei = 0, totalDecision = 0, totalCompetitive = 0;
        for (const s of sessions) {
          const ix = s.composite_indexes || {};
          totalBqi += ix.bqi || 0; totalFqi += ix.fqi || 0; totalPei += ix.pei || 0;
          totalDecision += ix.decision || 0; totalCompetitive += ix.competitive_execution || 0;
        }
        const count = sessions.length;
        const composites = {
          bqi: totalBqi / count, fqi: totalFqi / count, pei: totalPei / count,
          decision: totalDecision / count, competitive: totalCompetitive / count,
        };

        // Raw score = weighted composite
        const rawScore = composites.bqi * 0.25 + composites.fqi * 0.15 + composites.pei * 0.20 +
          composites.decision * 0.20 + composites.competitive * 0.20;

        // ── Tier multiplier ──
        const tierMult = tierMultipliers[athlete.league_tier] || 1.0;
        let adjusted = rawScore * tierMult;

        // ── Age curve ──
        let age: number | null = null;
        if (athlete.date_of_birth) {
          const dob = new Date(athlete.date_of_birth);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
          adjusted *= getAgeMult(sport, age);
        }

        // ── Position weight ──
        const posWeight = positionWeights[(athlete.primary_position || '').toUpperCase()] ?? 1.0;
        adjusted *= posWeight;

        // ── Verified stat boost ──
        let verifiedBoostTotal = 0;
        const vps = verifiedMap.get(uid) ?? [];
        for (const vp of vps) {
          const boost = verifiedStatBoosts[vp.profile_type];
          if (boost) verifiedBoostTotal += boost.competitiveBoost;
        }
        adjusted += verifiedBoostTotal;

        // ── Contract status modifier ──
        const proStatus = proMap.get(uid);
        let contractMod = 1.0;
        if (proStatus) {
          const cs = proStatus.contract_status;
          if (cs === 'free_agent') contractMod = 0.95;
          else if (cs === 'released') contractMod = 1.0 - getReleasePenalty(proStatus.release_count || 0) / 100;
          else if (cs === 'injured_list') contractMod = 0.9;
          else if (cs === 'retired') contractMod = 0; // freeze
        }
        if (contractMod > 0) adjusted *= contractMod;
        else adjusted = adjusted; // frozen - keep last score

        // ── Scout evaluation blending ──
        const scoutGrades = scoutMap.get(uid);
        if (scoutGrades && scoutGrades.length > 0) {
          const avgScout = scoutGrades.reduce((a, b) => a + b, 0) / scoutGrades.length;
          // Blend: 80% data-driven, 20% scout
          adjusted = adjusted * 0.8 + avgScout * 0.2;
        }

        // ── Integrity score with rebuild ──
        const { data: flags } = await supabase.from('governance_flags')
          .select('flag_type, severity').eq('user_id', uid).eq('status', 'pending');
        let integrityScore = 100;
        if (flags) {
          for (const f of flags) {
            if (f.severity === 'critical') integrityScore -= 15;
            else if (f.severity === 'warning') integrityScore -= 5;
            else integrityScore -= 2;
          }
        }
        // Rebuild: +0.5 per verified session (has coach grade)
        const verifiedSessionCount = sessions.filter(s => s.coach_grade != null).length;
        integrityScore += verifiedSessionCount * 0.5;
        integrityScore = Math.max(0, Math.min(100, integrityScore));

        // Apply integrity
        const finalScore = adjusted * (integrityScore / 100);

        // ── Game-practice ratio ──
        const gameSessions = sessions.filter(s => ['game', 'live_scrimmage'].includes(s.session_type));
        const practiceSessions = sessions.filter(s => !['game', 'live_scrimmage'].includes(s.session_type));
        const gamePracticeRatio = practiceSessions.length > 0 ? gameSessions.length / practiceSessions.length : null;

        // ── Delta maturity index ──
        const deltas = sessions
          .filter(s => s.player_grade != null && s.coach_grade != null)
          .map(s => (s.player_grade as number) - (s.coach_grade as number));
        const deltaMaturity = deltas.length >= 3 ? Math.round(stdDev(deltas) * 100) / 100 : null;

        // ── Fatigue correlation flag ──
        let fatigueCorr = false;
        const fatigueSessions = sessions.filter(s => {
          const fs = s.fatigue_state_at_session as any;
          return fs && (fs.body <= 2 || fs.overall <= 2);
        });
        if (fatigueSessions.length >= 3) {
          const highGradeFatigue = fatigueSessions.filter(s => (s.effective_grade ?? s.player_grade ?? 0) > 60);
          fatigueCorr = highGradeFatigue.length / fatigueSessions.length > 0.6;
        }

        // ── Pro probability (tiered) ──
        // Contract penalties are already applied to finalScore via contractMod (line 233).
        // Do NOT apply again here — that would be double-penalizing.
        let proProbability = calcProProb(finalScore);
        // Cap at 99% for non-verified MLB/AUSL
        const isVerifiedPro = proStatus?.roster_verified === true &&
          ['mlb', 'ausl'].includes(proStatus?.current_league?.toLowerCase() ?? '');
        if (!isVerifiedPro) proProbability = Math.min(99, proProbability);
        else proProbability = Math.min(100, proProbability);
        const proProbCapped = proProbability >= 99;

        // ── HoF tracking ──
        // Baseball: only MLB seasons count. Softball: MLB + AUSL both count.
        let hofActive = false;
        let hofProb: number | null = null;
        if (proStatus && proProbability >= 100) {
          const totalProSeasons = sport === 'baseball'
            ? (proStatus.mlb_seasons_completed || 0)
            : (proStatus.mlb_seasons_completed || 0) + (proStatus.ausl_seasons_completed || 0);
          if (totalProSeasons >= 5) {
            hofActive = true;
            // HoF probability based on consistency + longevity
            const consistencyBonus = deltaMaturity != null && deltaMaturity < 5 ? 10 : 0;
            hofProb = Math.min(99, (totalProSeasons * 3) + (finalScore * 0.3) + consistencyBonus);
          }
        }

        // ── Eligibility gates ──
        const gradedSessions = sessions.filter(s => s.player_grade && s.coach_grade);
        const hasCoach = !!athlete.primary_coach_id;
        const coachValidationMet = hasCoach ? gradedSessions.length >= count * 0.4 : true;

        const gates: Record<string, boolean> = {
          games_minimum_met: count >= 60,
          integrity_threshold_met: integrityScore >= 80,
          coach_validation_met: coachValidationMet,
          data_span_met: count >= 14,
        };
        gates.ranking_eligible = Object.values(gates).every(v => v);

        await supabase.from('athlete_mpi_settings').update(gates).eq('user_id', uid);
        if (!gates.ranking_eligible) continue;

        const segment = tierToSegment(athlete.league_tier || '');
        scores.push({
          userId: uid, score: finalScore, sessionsCount: count, segment, integrityScore, composites,
          verifiedBoost: verifiedBoostTotal, contractMod: contractMod,
          gamePracticeRatio: gamePracticeRatio, deltaMaturity: deltaMaturity,
          fatigueCorrFlag: fatigueCorr, hofActive, hofProb,
          proProbability, proProbCapped: proProbCapped,
        });
      }

      // Sort and assign ranks
      scores.sort((a, b) => b.score - a.score);
      const totalPool = scores.length;

      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        const rank = i + 1;
        const percentile = totalPool > 1 ? ((totalPool - rank) / (totalPool - 1)) * 100 : 100;

        // Trend
        const { data: prevMpi } = await supabase.from('mpi_scores')
          .select('adjusted_global_score').eq('user_id', s.userId).eq('sport', sport)
          .lt('calculation_date', today).order('calculation_date', { ascending: false })
          .limit(1).maybeSingle();
        const prevScore = prevMpi?.adjusted_global_score || s.score;
        const trendDelta = s.score - prevScore;
        const trendDirection = trendDelta > 2 ? 'rising' : trendDelta < -2 ? 'dropping' : 'stable';

        const developmentPrompts = generateDevPrompts(s.composites, s.integrityScore, trendDirection, s.sessionsCount);

        await supabase.from('mpi_scores').upsert({
          user_id: s.userId, sport, calculation_date: today,
          adjusted_global_score: s.score, global_rank: rank,
          global_percentile: percentile, total_athletes_in_pool: totalPool,
          pro_probability: s.proProbability, pro_probability_capped: s.proProbCapped,
          trend_direction: trendDirection, trend_delta_30d: trendDelta,
          segment_pool: `${sport}_${s.segment}`, integrity_score: s.integrityScore,
          composite_bqi: s.composites.bqi, composite_fqi: s.composites.fqi,
          composite_pei: s.composites.pei, composite_decision: s.composites.decision,
          composite_competitive: s.composites.competitive,
          development_prompts: developmentPrompts,
          verified_stat_boost: s.verifiedBoost,
          contract_status_modifier: s.contractMod,
          game_practice_ratio: s.gamePracticeRatio,
          delta_maturity_index: s.deltaMaturity,
          fatigue_correlation_flag: s.fatigueCorrFlag,
          hof_tracking_active: s.hofActive,
          hof_probability: s.hofProb,
        }, { onConflict: 'user_id,sport,calculation_date' });
      }

      console.log(`[nightly-mpi] ${sport}: Ranked ${scores.length} eligible athletes`);

      // ── Heat map snapshots (pitch_location + swing_chase + barrel_zone) ──
      for (const { userId } of scores) {
        const { data: recentSessions } = await supabase.from('performance_sessions')
          .select('micro_layer_data, module, batting_side_used, throwing_hand_used')
          .eq('user_id', userId).eq('sport', sport).is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
          .not('micro_layer_data', 'is', null);
        if (!recentSessions || recentSessions.length === 0) continue;

        // Aggregation buckets
        const maps: Record<string, { grid: number[][]; total: number }> = {
          pitch_location: { grid: [[0,0,0],[0,0,0],[0,0,0]], total: 0 },
          swing_chase: { grid: [[0,0,0],[0,0,0],[0,0,0]], total: 0 },
          barrel_zone: { grid: [[0,0,0],[0,0,0],[0,0,0]], total: 0 },
        };
        // Split buckets
        const splitMaps: Record<string, Record<string, { grid: number[][]; total: number }>> = {};

        for (const sess of recentSessions) {
          const microData = Array.isArray(sess.micro_layer_data) ? sess.micro_layer_data : [];
          const batSide = sess.batting_side_used || 'all';
          const throwHand = sess.throwing_hand_used || 'all';

          for (const rep of microData as any[]) {
            // Pitch location
            if (rep.pitch_location && typeof rep.pitch_location.row === 'number') {
              const r = Math.min(2, Math.max(0, rep.pitch_location.row));
              const c = Math.min(2, Math.max(0, rep.pitch_location.col));
              maps.pitch_location.grid[r][c]++;
              maps.pitch_location.total++;

              // Split by batting side
              const splitKey = `bat_${batSide}`;
              if (!splitMaps[splitKey]) splitMaps[splitKey] = { pitch_location: { grid: [[0,0,0],[0,0,0],[0,0,0]], total: 0 } };
              if (!splitMaps[splitKey].pitch_location) splitMaps[splitKey].pitch_location = { grid: [[0,0,0],[0,0,0],[0,0,0]], total: 0 };
              splitMaps[splitKey].pitch_location.grid[r][c]++;
              splitMaps[splitKey].pitch_location.total++;
            }

            // Swing chase (swing at ball outside zone)
            if (rep.swing_result && rep.pitch_location) {
              const r = Math.min(2, Math.max(0, rep.pitch_location.row));
              const c = Math.min(2, Math.max(0, rep.pitch_location.col));
              if (rep.in_zone === false && rep.swing_result !== 'take') {
                maps.swing_chase.grid[r][c]++;
                maps.swing_chase.total++;
              }
            }

            // Barrel zone
            if (rep.contact_quality === 'barrel' && rep.pitch_location) {
              const r = Math.min(2, Math.max(0, rep.pitch_location.row));
              const c = Math.min(2, Math.max(0, rep.pitch_location.col));
              maps.barrel_zone.grid[r][c]++;
              maps.barrel_zone.total++;
            }
          }
        }

        // Upsert all map types
        for (const [mapType, data] of Object.entries(maps)) {
          if (data.total === 0) continue;
          const blindZones: Array<{row: number; col: number}> = [];
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              if (data.grid[r][c] / data.total < 0.05) blindZones.push({ row: r, col: c });
            }
          }
          await supabase.from('heat_map_snapshots').upsert({
            user_id: userId, sport, map_type: mapType, time_window: '30d',
            grid_data: data.grid, blind_zones: blindZones,
            total_data_points: data.total, split_key: 'all', context_filter: 'all',
          }, { onConflict: 'user_id,sport,map_type,time_window,split_key,context_filter' } as any);
        }

        // Upsert split heat maps
        for (const [splitKey, mapTypes] of Object.entries(splitMaps)) {
          for (const [mapType, data] of Object.entries(mapTypes)) {
            if (data.total === 0) continue;
            const blindZones: Array<{row: number; col: number}> = [];
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                if (data.grid[r][c] / data.total < 0.05) blindZones.push({ row: r, col: c });
              }
            }
            await supabase.from('heat_map_snapshots').upsert({
              user_id: userId, sport, map_type: mapType, time_window: '30d',
              grid_data: data.grid, blind_zones: blindZones,
              total_data_points: data.total, split_key: splitKey, context_filter: 'all',
            }, { onConflict: 'user_id,sport,map_type,time_window,split_key,context_filter' } as any);
          }
        }
      }

      // ── Roadmap progress ──
      const { data: milestones } = await supabase.from('roadmap_milestones').select('*').eq('sport', sport);
      if (milestones && milestones.length > 0) {
        for (const { userId, sessionsCount, score, integrityScore } of scores) {
          const { data: mpiSettings } = await supabase.from('athlete_mpi_settings')
            .select('streak_current').eq('user_id', userId).maybeSingle();
          const { data: prevMpi } = await supabase.from('mpi_scores')
            .select('trend_direction').eq('user_id', userId).eq('sport', sport)
            .eq('calculation_date', today).maybeSingle();

          for (const milestone of milestones) {
            const req = milestone.requirements || {};
            let met = false, progress = 0;
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
              user_id: userId, milestone_id: milestone.id,
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
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
