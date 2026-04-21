// Context Aggregation Layer for 6-Week Recap V2
// Builds a `globalContext` object from all relevant performance data sources.
// Engine NEVER throws — missing rows degrade gracefully.

export type SeasonPhase = 'preseason' | 'in_season' | 'post_season' | 'off_season';

export interface GlobalContext {
  player: {
    firstName: string | null;
    sport: string | null;
    position: string | null;
    level: string | null;
    ageYears: number | null;
    dob: string | null;
  };
  season: {
    phase: SeasonPhase;
    phaseStartedAt: string | null;
    daysIntoPhase: number | null;
    daysUntilNextPhase: number | null;
  };
  performance: {
    mpi: {
      current: number | null;
      prevBlock: number | null;
      delta: number | null;
      trendDirection: string | null;
      trendDelta30d: number | null;
      percentile: number | null;
      segmentPool: string | null;
      composites: {
        bqi: number | null;
        fqi: number | null;
        pei: number | null;
        competitive: number | null;
        decision: number | null;
      };
    };
    sessions: {
      practice: { count: number; avgGrade: number | null; byModule: Record<string, { count: number; avgGrade: number | null }> };
      game: { count: number; avgGrade: number | null; opponentLevels: string[] };
    };
    transferGap: number | null;
    sixWeekTest: { current: number | null; previous: number | null; delta: number | null; byMetric: Record<string, number> };
    sixWeekTestHistory: Array<{ test_date: string; metrics: Record<string, number> }>;
  };
  physical: {
    weightStart: number | null;
    weightEnd: number | null;
    weightChange: number | null;
    physicalReadinessAvg: number | null;
    painLoadIndex: number | null;
    fasciaSummary: string | null;
  };
  workload: {
    sessionsPerWeek: number;
    totalCnsLoad: number;
    throwingReps: number;
    hittingReps: number;
    weeklyLoadSeries: number[];
    spikeDetected: boolean;
    overuseFlags: string[];
    undertrainingFlags: string[];
    restDays: number;
    longestStreak: number;
  };
  systemIntel: {
    hieSnapshot: {
      weakness_clusters: any[];
      prescriptive_actions: any[];
      tool_performance_gaps: any[];
    } | null;
    videoAnalyses: { count: number; byModule: Record<string, number>; recurringIssues: string[]; mechanicsTrend: string | null };
    movementPatterns: string[];
  };
  goals: { weekly: string[]; sixWeek: string | null; longTerm: string | null; alignmentScore: number | null };
  previousRecap: { id: string; generatedAt: string; headline: string | null; focusAreas: string[]; recommendations: string[] } | null;
  inputWeights: Record<string, number>;
  disabledSections: string[];
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

function detectSeasonPhase(settings: any): { phase: SeasonPhase; phaseStartedAt: string | null; daysIntoPhase: number | null; daysUntilNextPhase: number | null } {
  if (!settings) return { phase: 'off_season', phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null };
  const today = new Date().toISOString().split('T')[0];
  const phases: { status: SeasonPhase; start: string | null; end: string | null }[] = [
    { status: 'preseason', start: settings.preseason_start_date, end: settings.preseason_end_date },
    { status: 'in_season', start: settings.in_season_start_date, end: settings.in_season_end_date },
    { status: 'post_season', start: settings.post_season_start_date, end: settings.post_season_end_date },
  ];
  for (const p of phases) {
    if (p.start && p.end && today >= p.start && today <= p.end) {
      const startDate = new Date(p.start);
      const endDate = new Date(p.end);
      const now = new Date();
      const daysIntoPhase = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilNextPhase = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { phase: p.status, phaseStartedAt: p.start, daysIntoPhase, daysUntilNextPhase };
    }
  }
  // Stored fallback
  const stored = (settings.season_status as SeasonPhase) || 'off_season';
  return { phase: stored === 'in_season' || stored === 'preseason' || stored === 'post_season' ? stored : 'off_season', phaseStartedAt: null, daysIntoPhase: null, daysUntilNextPhase: null };
}

function safeAvg(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function weeklyBuckets(items: Array<{ date: string; load: number }>, startDate: Date): number[] {
  const buckets = [0, 0, 0, 0, 0, 0];
  items.forEach(it => {
    const d = new Date(it.date);
    const weekIdx = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    if (weekIdx >= 0 && weekIdx < 6) buckets[weekIdx] += it.load;
  });
  return buckets;
}

export async function buildGlobalContext(
  supabase: any,
  userId: string,
  startDate: Date,
  endDate: Date,
  profile: any,
): Promise<GlobalContext> {
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const prevBlockStart = new Date(startDate); prevBlockStart.setDate(prevBlockStart.getDate() - 42);
  const prevBlockStartStr = prevBlockStart.toISOString().split('T')[0];

  const [
    { data: mpiSettings },
    { data: extProfile },
    { data: perfSessions },
    { data: mpiCurrent },
    { data: mpiPrev },
    { data: hieSnap },
    { data: prevRecap },
    { data: testHistory },
    { data: engineSettings },
  ] = await Promise.all([
    supabase.from('athlete_mpi_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('date_of_birth').eq('id', userId).maybeSingle(),
    supabase.from('performance_sessions').select('id, session_type, session_date, module, effective_grade, drill_blocks, composite_indexes, opponent_name, opponent_level')
      .eq('user_id', userId).is('deleted_at', null)
      .gte('session_date', startStr).lte('session_date', endStr),
    supabase.from('mpi_scores').select('*').eq('user_id', userId).order('calculation_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('mpi_scores').select('*').eq('user_id', userId).lte('calculation_date', prevBlockStartStr).order('calculation_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('hie_snapshots').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vault_recaps').select('id, generated_at, recap_data').eq('user_id', userId).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vault_performance_tests').select('test_date, metrics, six_week_score').eq('user_id', userId).order('test_date', { ascending: false }).limit(4),
    supabase.from('recap_engine_settings').select('*').eq('scope', 'global').maybeSingle(),
  ]);

  // ===== Player =====
  const player = {
    firstName: profile?.first_name ?? null,
    sport: profile?.sport ?? mpiSettings?.sport ?? null,
    position: profile?.position ?? mpiSettings?.primary_position ?? null,
    level: mpiSettings?.league_tier ?? null,
    ageYears: calcAge(extProfile?.date_of_birth ?? null),
    dob: extProfile?.date_of_birth ?? null,
  };

  // ===== Season =====
  const season = detectSeasonPhase(mpiSettings);

  // ===== Sessions =====
  const practiceSess = (perfSessions || []).filter((s: any) => s.session_type === 'practice');
  const gameSess = (perfSessions || []).filter((s: any) => s.session_type === 'game' || s.session_type === 'live_scrimmage');
  const byModule: Record<string, { count: number; grades: number[] }> = {};
  practiceSess.forEach((s: any) => {
    const m = s.module || 'general';
    if (!byModule[m]) byModule[m] = { count: 0, grades: [] };
    byModule[m].count++;
    if (typeof s.effective_grade === 'number') byModule[m].grades.push(s.effective_grade);
  });
  const byModuleOut: Record<string, { count: number; avgGrade: number | null }> = {};
  Object.entries(byModule).forEach(([k, v]) => {
    byModuleOut[k] = { count: v.count, avgGrade: safeAvg(v.grades) };
  });
  const practiceAvg = safeAvg(practiceSess.map((s: any) => s.effective_grade));
  const gameAvg = safeAvg(gameSess.map((s: any) => s.effective_grade));
  const transferGap = practiceAvg !== null && gameAvg !== null ? Math.round((practiceAvg - gameAvg) * 10) / 10 : null;

  // ===== Workload (derived from sessions when no cns table) =====
  const loadItems = (perfSessions || []).map((s: any) => {
    const blocks = Array.isArray(s.drill_blocks) ? s.drill_blocks : [];
    const reps = blocks.reduce((sum: number, b: any) => sum + (b.outcomes?.length || b.volume || 0), 0);
    return { date: s.session_date, load: reps };
  });
  const weeklyLoadSeries = weeklyBuckets(loadItems, startDate);
  const totalCnsLoad = weeklyLoadSeries.reduce((a, b) => a + b, 0);
  const sessionsPerWeek = (perfSessions?.length || 0) / 6;
  const sessionDates = new Set((perfSessions || []).map((s: any) => s.session_date));
  const restDays = 42 - sessionDates.size;
  // Spike detection: any week > 1.5x avg
  const avgLoad = totalCnsLoad / 6;
  const spikeDetected = weeklyLoadSeries.some(w => avgLoad > 0 && w > avgLoad * 1.5);
  const overuseFlags: string[] = [];
  const undertrainingFlags: string[] = [];
  if (spikeDetected) overuseFlags.push('weekly_load_spike');
  if (sessionsPerWeek < 2) undertrainingFlags.push('low_session_frequency');
  if (restDays < 6) overuseFlags.push('insufficient_rest_days');

  // Throwing/hitting reps from drill_blocks
  let throwingReps = 0, hittingReps = 0;
  (perfSessions || []).forEach((s: any) => {
    const blocks = Array.isArray(s.drill_blocks) ? s.drill_blocks : [];
    blocks.forEach((b: any) => {
      const reps = b.outcomes?.length || b.volume || 0;
      const mod = (s.module || '').toLowerCase();
      if (mod.includes('pitch') || mod.includes('throw')) throwingReps += reps;
      if (mod.includes('hit') || mod.includes('bat')) hittingReps += reps;
    });
  });

  // ===== Six-week test history =====
  const sixWeekTestHistory = (testHistory || []).map((t: any) => ({
    test_date: t.test_date,
    metrics: (t.metrics as Record<string, number>) || {},
  }));
  const currentTest = sixWeekTestHistory[0]?.metrics || {};
  const prevTest = sixWeekTestHistory[1]?.metrics || {};
  const currentTestScore = (testHistory?.[0] as any)?.six_week_score ?? null;
  const prevTestScore = (testHistory?.[1] as any)?.six_week_score ?? null;
  const sixWeekTestByMetric: Record<string, number> = {};
  Object.keys(currentTest).forEach(k => {
    if (typeof currentTest[k] === 'number' && typeof prevTest[k] === 'number') {
      sixWeekTestByMetric[k] = Math.round((currentTest[k] - prevTest[k]) * 100) / 100;
    }
  });

  // ===== MPI =====
  const mpi = {
    current: mpiCurrent?.adjusted_global_score ?? null,
    prevBlock: mpiPrev?.adjusted_global_score ?? null,
    delta: (mpiCurrent?.adjusted_global_score && mpiPrev?.adjusted_global_score)
      ? Math.round((mpiCurrent.adjusted_global_score - mpiPrev.adjusted_global_score) * 10) / 10
      : null,
    trendDirection: mpiCurrent?.trend_direction ?? null,
    trendDelta30d: mpiCurrent?.trend_delta_30d ?? null,
    percentile: mpiCurrent?.percentile_rank ?? null,
    segmentPool: mpiCurrent?.segment_pool ?? null,
    composites: {
      bqi: mpiCurrent?.composite_bqi ?? null,
      fqi: mpiCurrent?.composite_fqi ?? null,
      pei: mpiCurrent?.composite_pei ?? null,
      competitive: mpiCurrent?.composite_competitive ?? null,
      decision: mpiCurrent?.composite_decision ?? null,
    },
  };

  // ===== HIE intelligence =====
  const hieSnapshot = hieSnap ? {
    weakness_clusters: hieSnap.weakness_clusters || [],
    prescriptive_actions: hieSnap.prescriptive_actions || [],
    tool_performance_gaps: hieSnap.tool_performance_gaps || [],
  } : null;

  // ===== Previous recap =====
  let previousRecap = null;
  if (prevRecap?.recap_data) {
    const rd = prevRecap.recap_data as any;
    previousRecap = {
      id: prevRecap.id,
      generatedAt: prevRecap.generated_at,
      headline: rd.executive_summary || rd.summary || null,
      focusAreas: rd.critical_focus_areas || rd.focus_areas || [],
      recommendations: rd.strategic_recommendations || rd.recommendations || [],
    };
  }

  // ===== Engine settings (owner overrides) =====
  const inputWeights = (engineSettings?.input_weights as Record<string, number>) || {};
  const disabledSections = (engineSettings?.disabled_sections as string[]) || [];

  return {
    player,
    season,
    performance: {
      mpi,
      sessions: {
        practice: { count: practiceSess.length, avgGrade: practiceAvg, byModule: byModuleOut },
        game: {
          count: gameSess.length,
          avgGrade: gameAvg,
          opponentLevels: Array.from(new Set(gameSess.map((g: any) => g.opponent_level).filter(Boolean))),
        },
      },
      transferGap,
      sixWeekTest: { current: currentTestScore, previous: prevTestScore, delta: currentTestScore && prevTestScore ? currentTestScore - prevTestScore : null, byMetric: sixWeekTestByMetric },
      sixWeekTestHistory,
    },
    physical: {
      weightStart: null, weightEnd: null, weightChange: null,
      physicalReadinessAvg: null, painLoadIndex: null, fasciaSummary: null,
    },
    workload: {
      sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
      totalCnsLoad,
      throwingReps,
      hittingReps,
      weeklyLoadSeries,
      spikeDetected,
      overuseFlags,
      undertrainingFlags,
      restDays,
      longestStreak: 0,
    },
    systemIntel: {
      hieSnapshot,
      videoAnalyses: { count: 0, byModule: {}, recurringIssues: [], mechanicsTrend: null },
      movementPatterns: hieSnapshot?.weakness_clusters?.map((c: any) => c.area || c.cluster_name).filter(Boolean) || [],
    },
    goals: { weekly: [], sixWeek: null, longTerm: null, alignmentScore: null },
    previousRecap,
    inputWeights,
    disabledSections,
  };
}
