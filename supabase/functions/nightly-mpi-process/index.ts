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

// Parse numeric upper bound from velocity band for sport-relative comparison
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const nightlyStartTime = Date.now();
    let totalProcessed = 0;
    console.log('[nightly-mpi] Starting nightly MPI process...');

    // ── LOAD ENGINE SETTINGS (dynamic weights & thresholds) ──
    const { data: engineSettingsRows } = await supabase
      .from('engine_settings')
      .select('setting_key, setting_value');
    const es: Record<string, any> = {};
    (engineSettingsRows ?? []).forEach((r: any) => { es[r.setting_key] = r.setting_value; });
    const W_BQI = typeof es.mpi_weight_bqi === 'number' ? es.mpi_weight_bqi : 0.25;
    const W_FQI = typeof es.mpi_weight_fqi === 'number' ? es.mpi_weight_fqi : 0.15;
    const W_PEI = typeof es.mpi_weight_pei === 'number' ? es.mpi_weight_pei : 0.20;
    const W_DECISION = typeof es.mpi_weight_decision === 'number' ? es.mpi_weight_decision : 0.20;
    const W_COMPETITIVE = typeof es.mpi_weight_competitive === 'number' ? es.mpi_weight_competitive : 0.20;
    const INTEGRITY_THRESHOLD = typeof es.integrity_threshold === 'number' ? es.integrity_threshold : 80;
    // ── PHASE A1: Gate split — provisional vs ranking ──
    // ranking_min_sessions: required for leaderboard inclusion (strict, unchanged behavior).
    // provisional_min_sessions: required to produce a dashboard-only snapshot (low bar).
    // Falls back to legacy data_gate_min_sessions if new keys absent.
    const LEGACY_GATE = typeof es.data_gate_min_sessions === 'number' ? es.data_gate_min_sessions : 60;
    const RANKING_MIN = typeof es.ranking_min_sessions === 'number' ? es.ranking_min_sessions : LEGACY_GATE;
    const PROVISIONAL_MIN = typeof es.provisional_min_sessions === 'number' ? es.provisional_min_sessions : 1;
    const DATA_GATE_MIN = RANKING_MIN; // alias: ranking_eligible still uses the strict bar
    console.log(`[nightly-mpi] Engine settings loaded: BQI=${W_BQI}, FQI=${W_FQI}, PEI=${W_PEI}, DEC=${W_DECISION}, COMP=${W_COMPETITIVE}, integrity=${INTEGRITY_THRESHOLD}, ranking_gate=${RANKING_MIN}, provisional_gate=${PROVISIONAL_MIN}`);

    // ── RETRY PREVIOUSLY FAILED ATHLETES FIRST ──
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: recentFailures } = await supabase
      .from('audit_log')
      .select('metadata')
      .eq('action', 'nightly_mpi_failures')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(1);
    const retryUserIds: string[] = [];
    if (recentFailures && recentFailures.length > 0) {
      const meta = recentFailures[0].metadata as any;
      if (meta?.failed_users && Array.isArray(meta.failed_users)) {
        retryUserIds.push(...meta.failed_users);
        console.log(`[nightly-mpi] Retrying ${retryUserIds.length} previously failed athletes first`);
      }
    }

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

    const processedUserIds: string[] = [];

    for (const sport of sports) {
      const { data: athletes } = await supabase.from('athlete_mpi_settings')
        .select('*').eq('sport', sport).eq('admin_ranking_excluded', false);
      if (!athletes || athletes.length === 0) continue;

      const userIds = athletes.map(a => a.user_id);
      const { data: proStatuses } = await supabase.from('athlete_professional_status')
        .select('*').in('user_id', userIds).eq('sport', sport);
      const proMap = new Map((proStatuses ?? []).map(p => [p.user_id, p]));

      const { data: verifiedProfiles } = await supabase.from('verified_stat_profiles')
        .select('*').in('user_id', userIds).eq('verified', true).eq('admin_verified', true);
      const verifiedMap = new Map<string, any[]>();
      for (const vp of verifiedProfiles ?? []) {
        if (!verifiedMap.has(vp.user_id)) verifiedMap.set(vp.user_id, []);
        verifiedMap.get(vp.user_id)!.push(vp);
      }

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
        consecutiveHeavy: number;
        tierMult: number; ageCurveMult: number; posWeight: number;
      }> = [];

      // ── Batch processing: batches of 50 with error isolation ──
      const BATCH_SIZE = 50;
      const failedUsers: Array<{ user_id: string; error: string }> = [];
      // Prioritize retry athletes by moving them to the front
      if (retryUserIds.length > 0) {
        const retrySet = new Set(retryUserIds);
        const retryAthletes = athletes.filter(a => retrySet.has(a.user_id));
        const normalAthletes = athletes.filter(a => !retrySet.has(a.user_id));
        athletes.length = 0;
        athletes.push(...retryAthletes, ...normalAthletes);
      }
      // ── Read continuation token from previous run ──
      const { data: continuationLog } = await supabase.from('audit_log')
        .select('metadata')
        .eq('action', 'nightly_mpi_continuation')
        .eq('table_name', 'mpi_scores')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      let resumeFrom = 0;
      if (continuationLog && continuationLog.length > 0) {
        const contMeta = continuationLog[0].metadata as any;
        if (contMeta?.sport === sport && typeof contMeta?.resume_from === 'number') {
          resumeFrom = contMeta.resume_from;
          console.log(`[nightly-mpi] ${sport}: Resuming from athlete index ${resumeFrom}`);
        }
      }

      // Log the starting batch index for resume verification
      await supabase.from('audit_log').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action: 'nightly_mpi_batch_start',
        table_name: 'mpi_scores',
        metadata: { sport, batch_start: resumeFrom, total_athletes: athletes.length, timestamp: new Date().toISOString() },
      });

      for (let batchStart = resumeFrom; batchStart < athletes.length; batchStart += BATCH_SIZE) {
        // Check runtime budget — stop if approaching 50s limit
        if (Date.now() - nightlyStartTime > 50000) {
          const remaining = athletes.length - batchStart;
          console.warn(`[nightly-mpi] Runtime budget exceeded (${Date.now() - nightlyStartTime}ms). ${remaining} athletes remaining.`);
          await supabase.from('audit_log').insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            action: 'nightly_mpi_timeout',
            table_name: 'mpi_scores',
            metadata: { sport, processed: batchStart, remaining, elapsed_ms: Date.now() - nightlyStartTime },
          });
          // Store continuation token for next invocation
          await supabase.from('audit_log').insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            action: 'nightly_mpi_continuation',
            table_name: 'mpi_scores',
            metadata: { sport, resume_from: batchStart, total_athletes: athletes.length, timestamp: new Date().toISOString() },
          });
          break;
        }
        const batch = athletes.slice(batchStart, batchStart + BATCH_SIZE);
        const batchTimestamp = Date.now();
        console.log(`[nightly-mpi] ${sport}: Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (${batch.length} athletes)`);

      for (const athlete of batch) {
       try {
        const uid = athlete.user_id;

        const { data: sessions } = await supabase.from('performance_sessions')
          .select('composite_indexes, session_type, effective_grade, player_grade, coach_grade, fatigue_state_at_session')
          .eq('user_id', uid).eq('sport', sport).is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);

        // ── PHASE A1: Provisional snapshot path ──
        // If athlete has no performance_sessions, check alternative inputs and produce a
        // provisional MPI row (dashboard-only, excluded from leaderboard) instead of skipping.
        if (!sessions || sessions.length === 0) {
          const sinceIso = new Date(Date.now() - 90 * 86400000).toISOString();
          const sinceDate = sinceIso.split('T')[0];
          const [calRes, txRes, vqRes] = await Promise.all([
            supabase.from('custom_activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('entry_date', sinceDate),
            supabase.from('tex_vision_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('session_date', sinceDate),
            supabase.from('vault_focus_quizzes').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', sinceIso),
          ]);
          const altInputs = {
            custom_activity_logs: calRes.count ?? 0,
            tex_vision_sessions: txRes.count ?? 0,
            vault_focus_quizzes: vqRes.count ?? 0,
          };
          const totalAlt = altInputs.custom_activity_logs + altInputs.tex_vision_sessions + altInputs.vault_focus_quizzes;
          if (totalAlt < PROVISIONAL_MIN) continue;

          // Neutral baseline composites — surfaces a snapshot without inventing performance data.
          const provisionalScore = 50;
          await supabase.from('mpi_scores').upsert({
            user_id: uid, sport, calculation_date: today,
            adjusted_global_score: provisionalScore,
            global_rank: null, global_percentile: null, total_athletes_in_pool: null,
            pro_probability: null, pro_probability_capped: false,
            trend_direction: 'stable', trend_delta_30d: 0,
            segment_pool: `${sport}_${tierToSegment(athlete.league_tier || '')}`,
            integrity_score: 100,
            composite_bqi: 50, composite_fqi: 50, composite_pei: 50,
            composite_decision: 50, composite_competitive: 50,
            development_prompts: [{
              area: 'data_collection',
              message: 'Log a few performance sessions to unlock your full ranking and personalized insights.',
              priority: 'high',
            }],
            verified_stat_boost: 0, contract_status_modifier: 0,
            tier_multiplier: tierMultipliers[athlete.league_tier] || 1.0,
            age_curve_multiplier: 1.0, position_weight: 1.0,
            is_provisional: true,
            scoring_inputs: {
              source: 'provisional',
              reason: 'No performance_sessions in last 90 days; provisional snapshot from alternative inputs.',
              alternative_inputs: altInputs,
              ranking_min_sessions: RANKING_MIN,
              provisional_min_sessions: PROVISIONAL_MIN,
              computed_at: new Date().toISOString(),
            },
          }, { onConflict: 'user_id,sport,calculation_date' });
          processedUserIds.push(uid);
          continue;
        }


        // ── Block 9: Game-weighted composite averages (1.5x for game sessions) ──
        let totalWeight = 0;
        let wBqi = 0, wFqi = 0, wPei = 0, wDecision = 0, wCompetitive = 0;
        for (const s of sessions) {
          const ix = s.composite_indexes || {};
          const isGameSession = ['game', 'live_scrimmage'].includes(s.session_type);
          const weight = isGameSession ? 1.5 : 1.0;
          wBqi += (ix.bqi || 0) * weight;
          wFqi += (ix.fqi || 0) * weight;
          wPei += (ix.pei || 0) * weight;
          wDecision += (ix.decision || 0) * weight;
          wCompetitive += (ix.competitive_execution || 0) * weight;
          totalWeight += weight;
        }
        const count = sessions.length;
        const composites = {
          bqi: wBqi / totalWeight, fqi: wFqi / totalWeight, pei: wPei / totalWeight,
          decision: wDecision / totalWeight, competitive: wCompetitive / totalWeight,
        };

        const rawScore = composites.bqi * W_BQI + composites.fqi * W_FQI + composites.pei * W_PEI +
          composites.decision * W_DECISION + composites.competitive * W_COMPETITIVE;

        const tierMult = tierMultipliers[athlete.league_tier] || 1.0;
        let adjusted = rawScore * tierMult;

        let age: number | null = null;
        let ageCurveMult = 1.0;
        if (athlete.date_of_birth) {
          const dob = new Date(athlete.date_of_birth);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000));
          ageCurveMult = getAgeMult(sport, age);
          adjusted *= ageCurveMult;
        }

        const posWeight = positionWeights[(athlete.primary_position || '').toUpperCase()] ?? 1.0;
        adjusted *= posWeight;

        let verifiedBoostTotal = 0;
        const vps = verifiedMap.get(uid) ?? [];
        for (const vp of vps) {
          const boost = verifiedStatBoosts[vp.profile_type];
          if (boost) {
            const weight = (vp.confidence_weight ?? 100) / 100;
            verifiedBoostTotal += boost.competitiveBoost * weight;
          }
        }
        adjusted += verifiedBoostTotal;

        const proStatus = proMap.get(uid);
        let contractMod = 1.0;
        if (proStatus) {
          const cs = proStatus.contract_status;
          if (cs === 'free_agent') contractMod = 0.95;
          else if (cs === 'released') contractMod = 1.0 - getReleasePenalty(proStatus.release_count || 0) / 100;
          else if (cs === 'injured_list') contractMod = 0.9;
          else if (cs === 'retired') contractMod = 0;

          if (cs === 'released' && proStatus.roster_verified === true) {
            await supabase.from('athlete_professional_status')
              .update({ roster_verified: false })
              .eq('user_id', uid).eq('sport', sport);
            proStatus.roster_verified = false;
          }
          if (cs === 'active' && proStatus.roster_verified === false && ['mlb', 'ausl'].includes(proStatus.current_league?.toLowerCase() ?? '')) {
            await supabase.from('athlete_professional_status')
              .update({ roster_verified: true })
              .eq('user_id', uid).eq('sport', sport);
            proStatus.roster_verified = true;
          }
        }
        if (contractMod > 0) adjusted *= contractMod;
        if (contractMod === 0) {
          const { data: lastMpi } = await supabase.from('mpi_scores')
            .select('adjusted_global_score')
            .eq('user_id', uid).eq('sport', sport)
            .order('calculation_date', { ascending: false })
            .limit(1).maybeSingle();
          if (lastMpi) continue;
        }

        const scoutGrades = scoutMap.get(uid);
        if (scoutGrades && scoutGrades.length > 0) {
          const avgScout = scoutGrades.reduce((a, b) => a + b, 0) / scoutGrades.length;
          adjusted = adjusted * 0.8 + avgScout * 0.2;
        }

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
        const verifiedSessionCount = sessions.filter(s => s.coach_grade != null).length;
        integrityScore += verifiedSessionCount * 0.5;
        integrityScore = Math.max(0, Math.min(100, integrityScore));

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const { data: dailyLogs } = await supabase.from('athlete_daily_log')
          .select('entry_date, day_status, injury_mode, cns_load_actual')
          .eq('user_id', uid)
          .gte('entry_date', thirtyDaysAgo);

        let dampingMultiplier = 1.0;
        let injuryHoldActive = false;

        if (dailyLogs && dailyLogs.length > 0) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
          injuryHoldActive = dailyLogs.some(l => l.injury_mode === true && l.entry_date >= sevenDaysAgo);
        }

        // Count absent days
        const now = new Date();
        let absent7 = 0, absent14 = 0;
        for (let i = 1; i <= 14; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const log = (dailyLogs ?? []).find(l => l.entry_date === dateStr);
          const isAbsent = !log || log.day_status === 'missed';
          if (isAbsent && i <= 7) absent7++;
          if (isAbsent) absent14++;
        }
        if (absent14 >= 4) dampingMultiplier = 0.85;
        else if (absent7 >= 2) dampingMultiplier = 0.95;

        // Consistency recovery lift
        let totalLoggedDays = 0;
        let injuryDays = 0;
        for (let i = 1; i <= 30; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const log = (dailyLogs ?? []).find(l => l.entry_date === dateStr);
          if (log) {
            if (log.day_status !== 'missed') totalLoggedDays++;
            if (log.injury_mode) injuryDays++;
          }
        }
        const consistencyScore = totalLoggedDays / Math.max(1, 30 - injuryDays) * 100;
        if (consistencyScore >= 80) dampingMultiplier = 1.0;

        // ── Block 4: Graduated overload dampening ──
        let consecutiveHeavy = 0;
        for (let i = 1; i <= 30; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const log = (dailyLogs ?? []).find(l => l.entry_date === dateStr);
          if (log && ['full_training', 'game_only'].includes(log.day_status)) {
            consecutiveHeavy++;
          } else {
            break;
          }
        }
        if (consecutiveHeavy >= 28) dampingMultiplier = Math.min(dampingMultiplier, 0.80);
        else if (consecutiveHeavy >= 21) dampingMultiplier = Math.min(dampingMultiplier, 0.85);
        else if (consecutiveHeavy >= 14) dampingMultiplier = Math.min(dampingMultiplier, 0.90);

        // CNS load average check
        const cnsLogs = (dailyLogs ?? []).filter(l => l.cns_load_actual != null && l.entry_date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
        if (cnsLogs.length >= 5) {
          const avgCNS = cnsLogs.reduce((s, l) => s + (l.cns_load_actual || 0), 0) / cnsLogs.length;
          if (avgCNS > 80) dampingMultiplier = Math.min(dampingMultiplier, 0.90);
        }

        if (injuryHoldActive) continue;

        const finalScore = adjusted * (integrityScore / 100) * dampingMultiplier;

        const gameSessions = sessions.filter(s => ['game', 'live_scrimmage'].includes(s.session_type));
        const practiceSessions = sessions.filter(s => !['game', 'live_scrimmage'].includes(s.session_type));
        const gamePracticeRatio = practiceSessions.length > 0 ? gameSessions.length / practiceSessions.length : null;

        const deltas = sessions
          .filter(s => s.player_grade != null && s.coach_grade != null)
          .map(s => (s.player_grade as number) - (s.coach_grade as number));
        const deltaMaturity = deltas.length >= 3 ? Math.round(stdDev(deltas) * 100) / 100 : null;

        let fatigueCorr = false;
        const fatigueSessions = sessions.filter(s => {
          const fs = s.fatigue_state_at_session as any;
          return fs && (fs.body <= 2 || fs.overall <= 2);
        });
        if (fatigueSessions.length >= 3) {
          const highGradeFatigue = fatigueSessions.filter(s => (s.effective_grade ?? s.player_grade ?? 0) > 60);
          fatigueCorr = highGradeFatigue.length / fatigueSessions.length > 0.6;
        }

        let proProbability = calcProProb(finalScore);
        const isVerifiedPro = proStatus?.roster_verified === true &&
          ['mlb', 'ausl'].includes(proStatus?.current_league?.toLowerCase() ?? '');
        if (!isVerifiedPro) proProbability = Math.min(99, proProbability);
        else proProbability = Math.min(100, proProbability);
        const proProbCapped = proProbability >= 99;

        let hofActive = false;
        let hofProb: number | null = null;
        if (proStatus && proProbability >= 100) {
          const totalProSeasons = sport === 'baseball'
            ? (proStatus.mlb_seasons_completed || 0)
            : (proStatus.mlb_seasons_completed || 0) + (proStatus.ausl_seasons_completed || 0);
          if (totalProSeasons >= 5) {
            hofActive = true;
            const consistencyBonus = deltaMaturity != null && deltaMaturity < 5 ? 10 : 0;
            hofProb = Math.min(99, (totalProSeasons * 3) + (finalScore * 0.3) + consistencyBonus);
          }
        }

        const gradedSessions = sessions.filter(s => s.player_grade && s.coach_grade);
        const hasCoach = !!athlete.primary_coach_id;
        const coachValidationMet = hasCoach ? gradedSessions.length >= count * 0.4 : true;

        const gates: Record<string, boolean> = {
          games_minimum_met: count >= DATA_GATE_MIN,
          integrity_threshold_met: integrityScore >= INTEGRITY_THRESHOLD,
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
          gamePracticeRatio, deltaMaturity, fatigueCorrFlag: fatigueCorr,
          hofActive, hofProb, proProbability, proProbCapped, consecutiveHeavy,
          tierMult, ageCurveMult, posWeight,
        });
       } catch (athleteError: any) {
          console.error(`[nightly-mpi] Error processing athlete ${athlete.user_id}:`, athleteError);
          failedUsers.push({ user_id: athlete.user_id, error: athleteError?.message || String(athleteError) });
        }
      } // end athlete loop
        console.log(`[nightly-mpi] ${sport}: Batch completed in ${Date.now() - batchTimestamp}ms`);
      } // end batch loop
      if (failedUsers.length > 0) {
        console.warn(`[nightly-mpi] ${sport}: ${failedUsers.length} athletes failed processing`);
        await supabase.from('audit_log').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          action: 'nightly_mpi_failures',
          table_name: 'mpi_scores',
          metadata: {
            sport,
            failed_count: failedUsers.length,
            failed_users: failedUsers.slice(0, 20).map(f => f.user_id),
            errors: failedUsers.slice(0, 20).map(f => ({ user_id: f.user_id, error: f.error })),
          },
        });
      }

      // Sort and assign ranks
      scores.sort((a, b) => b.score - a.score);
      const totalPool = scores.length;

      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        const rank = i + 1;
        const percentile = totalPool > 1 ? ((totalPool - rank) / (totalPool - 1)) * 100 : 100;

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
          // Phase 2: transparency columns
          tier_multiplier: s.tierMult,
          age_curve_multiplier: s.ageCurveMult,
          position_weight: s.posWeight,
          // Phase A1: provisional flag + scoring inputs for "Why am I seeing this?"
          is_provisional: false,
          scoring_inputs: {
            source: 'mature',
            sessions_count: s.sessionsCount,
            ranking_min_sessions: RANKING_MIN,
            weights: { bqi: W_BQI, fqi: W_FQI, pei: W_PEI, decision: W_DECISION, competitive: W_COMPETITIVE },
            integrity_score: s.integrityScore,
            verified_boost: s.verifiedBoost,
            contract_modifier: s.contractMod,
            tier_multiplier: s.tierMult,
            age_curve_multiplier: s.ageCurveMult,
            position_weight: s.posWeight,
            consecutive_heavy_days: s.consecutiveHeavy,
            game_practice_ratio: s.gamePracticeRatio,
            computed_at: new Date().toISOString(),
          },
        }, { onConflict: 'user_id,sport,calculation_date' });
      }

      totalProcessed += scores.length;
      // Track processed users for post-nightly HIE triggers
      scores.forEach(s => processedUserIds.push(s.userId));
      console.log(`[nightly-mpi] ${sport}: Ranked ${scores.length} eligible athletes`);

      // ── Heat map snapshots ──
      for (const { userId } of scores) {
        // Block 1: Add session_type to select
        const { data: recentSessions } = await supabase.from('performance_sessions')
          .select('micro_layer_data, module, batting_side_used, throwing_hand_used, session_type')
          .eq('user_id', userId).eq('sport', sport).is('deleted_at', null)
          .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
          .not('micro_layer_data', 'is', null);
        if (!recentSessions || recentSessions.length === 0) continue;

        const makeGrid = (size: number) => Array.from({length: size}, () => Array(size).fill(0));

        let detectedGridSize = 3;
        for (const sess of recentSessions) {
          const microData = Array.isArray(sess.micro_layer_data) ? sess.micro_layer_data : [];
          for (const rep of microData as any[]) {
            if (rep.pitch_location) {
              if (rep.pitch_location.row > 2 || rep.pitch_location.col > 2) { detectedGridSize = 5; break; }
            }
          }
          if (detectedGridSize === 5) break;
        }
        const gs = detectedGridSize;

        // Block 13: 12 map types (8 original + 4 new)
        const mapTypes = [
          'pitch_location', 'swing_chase', 'barrel_zone', 'whiff_zone',
          'command_heat', 'miss_tendency', 'throw_accuracy', 'error_location',
          'velocity_performance', 'intent_performance', 'exit_direction', 'bp_distance_power',
        ];
        const contextFilters = ['all', 'practice', 'game'] as const;
        type CtxMap = Record<string, { grid: number[][]; total: number }>;
        const ctxMaps: Record<string, CtxMap> = {};
        for (const ctx of contextFilters) {
          ctxMaps[ctx] = {};
          for (const mt of mapTypes) ctxMaps[ctx][mt] = { grid: makeGrid(gs), total: 0 };
        }

        const practiceTypes = ['solo_practice', 'team_practice', 'bullpen', 'cage_session', 'lesson', 'machine_bp', 'live_bp'];
        const gameTypes = ['game', 'live_scrimmage'];

        for (const sess of recentSessions) {
          const microData = Array.isArray(sess.micro_layer_data) ? sess.micro_layer_data : [];
          const sessType = (sess as any).session_type;
          // Block 1: Reject records with missing session_type
          if (!sessType) continue;
          const ctxKey = gameTypes.includes(sessType) ? 'game' : practiceTypes.includes(sessType) ? 'practice' : 'practice';

          for (const rep of microData as any[]) {
            const loc = rep.pitch_location;
            if (loc && typeof loc.row === 'number') {
              const r = Math.min(gs - 1, Math.max(0, loc.row));
              const c = Math.min(gs - 1, Math.max(0, loc.col));

              // pitch_location
              ctxMaps.all.pitch_location.grid[r][c]++; ctxMaps.all.pitch_location.total++;
              ctxMaps[ctxKey].pitch_location.grid[r][c]++; ctxMaps[ctxKey].pitch_location.total++;

              // swing_chase
              if (rep.in_zone === false && rep.swing_result && rep.swing_result !== 'take') {
                ctxMaps.all.swing_chase.grid[r][c]++; ctxMaps.all.swing_chase.total++;
                ctxMaps[ctxKey].swing_chase.grid[r][c]++; ctxMaps[ctxKey].swing_chase.total++;
              }

              // barrel_zone
              if (rep.contact_quality === 'barrel') {
                ctxMaps.all.barrel_zone.grid[r][c]++; ctxMaps.all.barrel_zone.total++;
                ctxMaps[ctxKey].barrel_zone.grid[r][c]++; ctxMaps[ctxKey].barrel_zone.total++;
              }

              // whiff_zone
              if (rep.contact_quality === 'miss') {
                ctxMaps.all.whiff_zone.grid[r][c]++; ctxMaps.all.whiff_zone.total++;
                ctxMaps[ctxKey].whiff_zone.grid[r][c]++; ctxMaps[ctxKey].whiff_zone.total++;
              }

              // command_heat
              if (rep.pitch_result && ['strike', 'out'].includes(rep.pitch_result)) {
                ctxMaps.all.command_heat.grid[r][c]++; ctxMaps.all.command_heat.total++;
                ctxMaps[ctxKey].command_heat.grid[r][c]++; ctxMaps[ctxKey].command_heat.total++;
              }

              // miss_tendency
              if (rep.pitch_result === 'ball') {
                ctxMaps.all.miss_tendency.grid[r][c]++; ctxMaps.all.miss_tendency.total++;
                ctxMaps[ctxKey].miss_tendency.grid[r][c]++; ctxMaps[ctxKey].miss_tendency.total++;
              }

              // Block 13: velocity_performance — high-velocity success by zone (sport-relative)
              if (rep.machine_velocity_band && isHighVelocityBand(rep.machine_velocity_band, sport) &&
                  rep.contact_quality && ['barrel', 'hard'].includes(rep.contact_quality)) {
                ctxMaps.all.velocity_performance.grid[r][c]++; ctxMaps.all.velocity_performance.total++;
                ctxMaps[ctxKey].velocity_performance.grid[r][c]++; ctxMaps[ctxKey].velocity_performance.total++;
              }

              // Block 13: intent_performance — game_intent barrels by zone
              if (rep.swing_intent === 'game_intent' && rep.contact_quality === 'barrel') {
                ctxMaps.all.intent_performance.grid[r][c]++; ctxMaps.all.intent_performance.total++;
                ctxMaps[ctxKey].intent_performance.grid[r][c]++; ctxMaps[ctxKey].intent_performance.total++;
              }

              // Block 13: exit_direction distribution by zone
              if (rep.exit_direction) {
                ctxMaps.all.exit_direction.grid[r][c]++; ctxMaps.all.exit_direction.total++;
                ctxMaps[ctxKey].exit_direction.grid[r][c]++; ctxMaps[ctxKey].exit_direction.total++;
              }

              // Block 13: bp_distance_power — high-distance hits by zone
              if (rep.bp_distance_ft && rep.bp_distance_ft > (sport === 'softball' ? 150 : 300)) {
                ctxMaps.all.bp_distance_power.grid[r][c]++; ctxMaps.all.bp_distance_power.total++;
                ctxMaps[ctxKey].bp_distance_power.grid[r][c]++; ctxMaps[ctxKey].bp_distance_power.total++;
              }
            }

            // throw_accuracy
            if (typeof rep.throw_accuracy === 'number' && loc) {
              const r = Math.min(gs - 1, Math.max(0, loc.row));
              const c = Math.min(gs - 1, Math.max(0, loc.col));
              ctxMaps.all.throw_accuracy.grid[r][c] += rep.throw_accuracy;
              ctxMaps.all.throw_accuracy.total++;
              ctxMaps[ctxKey].throw_accuracy.grid[r][c] += rep.throw_accuracy;
              ctxMaps[ctxKey].throw_accuracy.total++;
            }

            // error_location
            if (rep.contact_quality === 'error' && loc) {
              const r = Math.min(gs - 1, Math.max(0, loc.row));
              const c = Math.min(gs - 1, Math.max(0, loc.col));
              ctxMaps.all.error_location.grid[r][c]++;
              ctxMaps.all.error_location.total++;
              ctxMaps[ctxKey].error_location.grid[r][c]++;
              ctxMaps[ctxKey].error_location.total++;
            }
          }
        }

        // Upsert all context x map type combinations
        for (const ctx of contextFilters) {
          for (const [mapType, data] of Object.entries(ctxMaps[ctx])) {
            if (data.total === 0) continue;
            const blindZones: Array<{row: number; col: number; deficit_pct?: number}> = [];
            const avgPerCell = data.total / (gs * gs);
            for (let r = 0; r < gs; r++) {
              for (let c = 0; c < gs; c++) {
                const cellPct = data.grid[r][c] / data.total;
                if (cellPct < 0.05) {
                  const deficit = avgPerCell > 0 ? ((avgPerCell - data.grid[r][c]) / avgPerCell) * 100 : 100;
                  blindZones.push({ row: r, col: c, deficit_pct: Math.round(deficit) });
                }
              }
            }
            await supabase.from('heat_map_snapshots').upsert({
              user_id: userId, sport, map_type: mapType, time_window: '30d',
              grid_data: { grid: data.grid, grid_size: gs },
              blind_zones: blindZones,
              total_data_points: data.total, split_key: 'all', context_filter: ctx,
            }, { onConflict: 'user_id,sport,map_type,time_window,split_key,context_filter' } as any);
          }
        }

        // Blind zone influence on roadmap
        const allBlindZones = Object.entries(ctxMaps.all)
          .filter(([_, d]) => d.total > 0)
          .flatMap(([mt, d]) => {
            const zones: any[] = [];
            for (let r = 0; r < gs; r++) {
              for (let c = 0; c < gs; c++) {
                if (d.grid[r][c] / d.total < 0.03) zones.push({ map_type: mt, row: r, col: c });
              }
            }
            return zones;
          });
        if (allBlindZones.length > 0) {
          const { data: roadmapMilestones } = await supabase.from('roadmap_milestones')
            .select('id, requirements').eq('sport', sport);
          if (roadmapMilestones) {
            for (const ms of roadmapMilestones) {
              const req = ms.requirements || {};
              if (req.zone_awareness) {
                await supabase.from('athlete_roadmap_progress').upsert({
                  user_id: userId, milestone_id: ms.id,
                  status: 'blocked', blocked_reason: `${allBlindZones.length} blind zones detected`,
                  progress_pct: Math.max(0, 100 - allBlindZones.length * 10),
                }, { onConflict: 'user_id,milestone_id' } as any);
              }
            }
          }
        }
      }

      // ── Roadmap progress (Block 10: micro-metric gates + overload freeze) ──
      const { data: milestones } = await supabase.from('roadmap_milestones').select('*').eq('sport', sport);
      if (milestones && milestones.length > 0) {
        for (const s of scores) {
          // Block 10: Freeze roadmap during overload
          if (s.consecutiveHeavy >= 14) continue;

          const { data: mpiSettings } = await supabase.from('athlete_mpi_settings')
            .select('streak_current').eq('user_id', s.userId).maybeSingle();
          const { data: prevMpi } = await supabase.from('mpi_scores')
            .select('trend_direction').eq('user_id', s.userId).eq('sport', sport)
            .eq('calculation_date', today).maybeSingle();

          // Fetch latest composite_indexes for micro-metric gates
          const { data: latestSession } = await supabase.from('performance_sessions')
            .select('composite_indexes')
            .eq('user_id', s.userId).eq('sport', sport).is('deleted_at', null)
            .order('session_date', { ascending: false })
            .limit(1).maybeSingle();
          const latestIx = latestSession?.composite_indexes || {};

          for (const milestone of milestones) {
            const req = milestone.requirements || {};
            let met = false, progress = 0;

            if (req.min_sessions) {
              progress = Math.min(100, (s.sessionsCount / req.min_sessions) * 100);
              met = s.sessionsCount >= req.min_sessions;
            } else if (req.min_streak) {
              const streak = mpiSettings?.streak_current || 0;
              progress = Math.min(100, (streak / req.min_streak) * 100);
              met = streak >= req.min_streak;
            } else if (req.min_mpi) {
              progress = Math.min(100, (s.score / req.min_mpi) * 100);
              met = s.score >= req.min_mpi;
            } else if (req.trend) {
              met = prevMpi?.trend_direction === req.trend;
              progress = met ? 100 : 0;
            }

            // Block 10: Micro-metric gates
            if (req.min_barrel_pct) {
              const avgBarrel = latestIx.barrel_pct ?? 0;
              progress = Math.min(100, (avgBarrel / req.min_barrel_pct) * 100);
              met = avgBarrel >= req.min_barrel_pct;
            }
            if (req.max_blind_zones) {
              // Use blind zone count from latest heat map
              const { data: heatSnap } = await supabase.from('heat_map_snapshots')
                .select('blind_zones')
                .eq('user_id', s.userId).eq('sport', sport).eq('context_filter', 'all')
                .order('computed_at', { ascending: false }).limit(1).maybeSingle();
              const blindZoneCount = Array.isArray(heatSnap?.blind_zones) ? heatSnap.blind_zones.length : 0;
              met = blindZoneCount <= req.max_blind_zones;
              progress = met ? 100 : Math.max(0, 100 - (blindZoneCount - req.max_blind_zones) * 20);
            }
            if (req.velocity_band_mastery) {
              const velMult = latestIx.velocity_difficulty_mult ?? 1.0;
              met = velMult >= req.velocity_band_mastery;
              progress = Math.min(100, (velMult / req.velocity_band_mastery) * 100);
            }
            if (req.zone_power_minimum) {
              const hardPct = latestIx.hard_contact_pct ?? 0;
              met = hardPct >= req.zone_power_minimum;
              progress = Math.min(100, (hardPct / req.zone_power_minimum) * 100);
            }

            // Phase 2: 6 new micro-metric roadmap gates
            if (req.max_whiff_pct != null) {
              const whiffPct = latestIx.avg_whiff_pct ?? 100;
              met = whiffPct <= req.max_whiff_pct;
              progress = met ? 100 : Math.max(0, 100 - (whiffPct - req.max_whiff_pct) * 5);
            }
            if (req.max_chase_pct != null) {
              const chasePct = latestIx.avg_chase_pct ?? 100;
              met = chasePct <= req.max_chase_pct;
              progress = met ? 100 : Math.max(0, 100 - (chasePct - req.max_chase_pct) * 5);
            }
            if (req.min_iz_contact_pct != null) {
              const izPct = latestIx.avg_iz_contact_pct ?? 0;
              met = izPct >= req.min_iz_contact_pct;
              progress = Math.min(100, (izPct / req.min_iz_contact_pct) * 100);
            }
            if (req.min_zone_pct != null) {
              const zonePct = latestIx.avg_zone_pct ?? 0;
              met = zonePct >= req.min_zone_pct;
              progress = Math.min(100, (zonePct / req.min_zone_pct) * 100);
            }
            if (req.min_footwork_grade != null) {
              const fwg = latestIx.avg_footwork_grade ?? 20;
              met = fwg >= req.min_footwork_grade;
              progress = Math.min(100, ((fwg - 20) / (req.min_footwork_grade - 20)) * 100);
            }
            if (req.min_clean_field_pct != null) {
              const cfp = latestIx.avg_clean_field_pct ?? 0;
              met = cfp >= req.min_clean_field_pct;
              progress = Math.min(100, (cfp / req.min_clean_field_pct) * 100);
            }

            await supabase.from('athlete_roadmap_progress').upsert({
              user_id: s.userId, milestone_id: milestone.id,
              status: met ? 'completed' : 'in_progress',
              progress_pct: Math.round(progress),
              completed_at: met ? new Date().toISOString() : null,
            }, { onConflict: 'user_id,milestone_id' } as any);
          }
        }
      }
    }

    // Phase 2: Audit log entry for nightly completion
    await supabase.from('audit_log').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action: 'nightly_mpi_complete',
      table_name: 'mpi_scores',
      metadata: {
        timestamp: new Date().toISOString(),
        athletes_processed: totalProcessed,
        duration_ms: Date.now() - nightlyStartTime,
      },
    });

    // ── Post-nightly HIE triggers (fire-and-forget) ──
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uniqueProcessed = [...new Set(processedUserIds)];
    console.log(`[nightly-mpi] Triggering HIE analysis for ${uniqueProcessed.length} athletes...`);
    for (const uid of uniqueProcessed) {
      fetch(`${SUPABASE_URL}/functions/v1/hie-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ user_id: uid, sport: 'baseball' }),
      }).catch(err => console.error(`[nightly-mpi] HIE trigger failed for ${uid}:`, err));
    }

    console.log('[nightly-mpi] Complete.');
    return new Response(JSON.stringify({ success: true, athletes_processed: totalProcessed, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[nightly-mpi] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
