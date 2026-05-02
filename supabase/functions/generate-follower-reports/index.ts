import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface FollowerInfo {
  follower_id: string;
  player_id: string;
  follower_role: 'scout' | 'coach';
}

async function getActiveFollowers(supabase: any): Promise<FollowerInfo[]> {
  // scout_follows: scout_id, player_id, status='accepted'
  const { data: follows } = await supabase
    .from('scout_follows')
    .select('scout_id, player_id, status')
    .eq('status', 'accepted');

  if (!follows?.length) return [];

  const followerIds = [...new Set(follows.map((f: any) => f.scout_id))];
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role, status')
    .in('user_id', followerIds)
    .in('role', ['scout', 'coach'])
    .eq('status', 'active');

  const roleMap = new Map<string, 'scout' | 'coach'>();
  for (const r of roles ?? []) {
    // Coach takes precedence
    const cur = roleMap.get(r.user_id);
    if (r.role === 'coach' || !cur) roleMap.set(r.user_id, r.role);
  }

  return follows
    .filter((f: any) => roleMap.has(f.scout_id))
    .map((f: any) => ({
      follower_id: f.scout_id,
      player_id: f.player_id,
      follower_role: roleMap.get(f.scout_id)!,
    }));
}

async function buildPlayerSnapshot(supabase: any, playerId: string, periodStart: string, periodEnd: string) {
  const [profileRes, sessionsRes, vaultGradesRes, weaknessRes, gamesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, sport, position, primary_position, hs_grad_year').eq('id', playerId).maybeSingle(),
    supabase.from('performance_sessions')
      .select('id, session_date, module, composite_indexes, drill_blocks, session_type, opponent_level, coach_grade, shared_with_scouts')
      .eq('user_id', playerId)
      .gte('session_date', periodStart)
      .lte('session_date', periodEnd)
      .eq('shared_with_scouts', true)
      .order('session_date', { ascending: false })
      .limit(40),
    supabase.from('vault_scout_grades').select('*').eq('user_id', playerId).order('created_at', { ascending: false }).limit(2),
    supabase.from('hie_weakness_clusters').select('*').eq('user_id', playerId).order('priority_score', { ascending: false }).limit(5),
    supabase.from('game_logs').select('id, game_date, opponent_level, summary').eq('user_id', playerId).gte('game_date', periodStart).lte('game_date', periodEnd).limit(20),
  ]);

  return {
    profile: profileRes.data,
    sessions: sessionsRes.data ?? [],
    vaultGrades: vaultGradesRes.data ?? [],
    weaknesses: weaknessRes.data ?? [],
    games: gamesRes.data ?? [],
  };
}

function deriveDeltas(snapshot: any) {
  const sessions = snapshot.sessions ?? [];
  const composites = sessions
    .map((s: any) => s.composite_indexes)
    .filter(Boolean);
  const avg = (key: string) => {
    const vals = composites.map((c: any) => c?.[key]).filter((v: any) => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
  };
  return {
    sessions_count: sessions.length,
    games_count: snapshot.games?.length ?? 0,
    avg_bqi: avg('BQI'),
    avg_pei: avg('PEI'),
    avg_fqi: avg('FQI'),
  };
}

async function generateHeadline(snapshot: any, deltas: any, role: 'scout' | 'coach'): Promise<string> {
  if (!LOVABLE_API_KEY) return 'Activity summary for the period.';
  try {
    const sysPrompt = role === 'coach'
      ? 'You are Hammer, an elite player development coach. Write a 2-sentence headline verdict about a followed player\'s recent progress. Direct, actionable.'
      : 'You are Hammer, an elite scouting analyst. Write a 2-sentence headline verdict about a followed prospect. Evaluator tone, no prescriptive advice.';
    const userMsg = `Player: ${snapshot.profile?.full_name ?? 'Unknown'} (${snapshot.profile?.sport ?? '?'} / ${snapshot.profile?.primary_position ?? snapshot.profile?.position ?? '?'})\nPeriod metrics: ${JSON.stringify(deltas)}\nWeaknesses: ${snapshot.weaknesses?.slice(0,3).map((w: any) => w.cluster_label || w.area).join(', ') || 'none'}\nSessions: ${snapshot.sessions.length}, Games: ${snapshot.games.length}.`;
    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
      }),
    });
    if (!r.ok) return 'Activity summary for the period.';
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() ?? 'Activity summary for the period.';
  } catch {
    return 'Activity summary for the period.';
  }
}

function buildReportData(snapshot: any, deltas: any, role: 'scout' | 'coach', headline: string) {
  const sessions = snapshot.sessions ?? [];
  const lowBlocks = sessions
    .flatMap((s: any) => (s.drill_blocks ?? []).map((b: any) => ({ ...b, session_id: s.id, date: s.session_date })))
    .filter((b: any) => typeof b.execution_grade === 'number')
    .sort((a: any, b: any) => (a.execution_grade ?? 100) - (b.execution_grade ?? 100))
    .slice(0, 3);

  const grades = snapshot.vaultGrades?.[0]?.grades ?? null;
  const prevGrades = snapshot.vaultGrades?.[1]?.grades ?? null;
  const gradeDeltas: Record<string, { current: number; delta: number | null }> = {};
  if (grades) {
    for (const [k, v] of Object.entries<any>(grades)) {
      if (typeof v === 'number') {
        const prev = prevGrades?.[k];
        gradeDeltas[k] = { current: v, delta: typeof prev === 'number' ? v - prev : null };
      }
    }
  }

  const strengths = Object.entries(gradeDeltas)
    .filter(([, g]) => g.current >= 55)
    .sort((a, b) => b[1].current - a[1].current)
    .slice(0, 3)
    .map(([tool, g]) => ({ tool, grade: g.current, delta: g.delta }));

  const weaknesses = (snapshot.weaknesses ?? []).slice(0, 3).map((w: any) => ({
    area: w.cluster_label || w.area || w.movement_pattern,
    severity: w.priority_score ?? w.severity,
    classification: w.classification ?? 'execution',
  }));

  const data: any = {
    headline,
    snapshot: {
      sport: snapshot.profile?.sport,
      position: snapshot.profile?.primary_position ?? snapshot.profile?.position,
      hs_grad_year: snapshot.profile?.hs_grad_year,
    },
    period_metrics: deltas,
    tool_grades: gradeDeltas,
    strengths,
    weaknesses,
    low_blocks: lowBlocks,
    recent_sessions: sessions.slice(0, 10).map((s: any) => ({
      id: s.id, date: s.session_date, module: s.module, type: s.session_type,
      composite: s.composite_indexes, coach_grade: s.coach_grade,
    })),
    recent_games: snapshot.games?.slice(0, 5) ?? [],
  };

  // Coach-only: prescriptive fixes
  if (role === 'coach') {
    data.prescriptive_fixes = lowBlocks.map((b: any) => ({
      issue: b.mechanic_id || b.module || 'Low-graded block',
      drill: 'Targeted progression drill — see drill library',
      cue: 'Hold position 2 seconds, then release',
      session_id: b.session_id,
    }));
  }

  return data;
}

async function generateForFollower(supabase: any, fi: FollowerInfo, mode: 'weekly_digest' | 'monthly_deep', periodStart: string, periodEnd: string, reportType: 'weekly_digest' | 'monthly_deep') {
  // Idempotency: skip if already exists
  const { data: existing } = await supabase
    .from('follower_reports')
    .select('id')
    .eq('follower_id', fi.follower_id)
    .eq('player_id', fi.player_id)
    .eq('report_type', reportType)
    .eq('period_start', periodStart)
    .maybeSingle();
  if (existing) return { skipped: true };

  const snapshot = await buildPlayerSnapshot(supabase, fi.player_id, periodStart, periodEnd);
  if (!snapshot.sessions.length && !snapshot.games.length && reportType === 'weekly_digest') {
    return { skipped: true, reason: 'no_activity' };
  }

  const deltas = deriveDeltas(snapshot);
  const headline = await generateHeadline(snapshot, deltas, fi.follower_role);
  const reportData = buildReportData(snapshot, deltas, fi.follower_role, headline);

  const { data: inserted, error } = await supabase.from('follower_reports').insert({
    follower_id: fi.follower_id,
    player_id: fi.player_id,
    follower_role: fi.follower_role,
    report_type: reportType,
    period_start: periodStart,
    period_end: periodEnd,
    headline,
    report_data: reportData,
    status: 'ready',
  }).select('id').single();

  if (error) {
    await supabase.from('follower_report_events').insert({
      follower_id: fi.follower_id, player_id: fi.player_id,
      event_type: 'generation_failed', metadata: { error: error.message, reportType },
    });
    return { error: error.message };
  }

  await supabase.from('follower_report_events').insert({
    follower_id: fi.follower_id, player_id: fi.player_id, report_id: inserted.id,
    event_type: 'report_generated', metadata: { reportType },
  });

  return { id: inserted.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const mode: 'weekly_digest' | 'monthly_deep' = body.mode === 'monthly_deep' ? 'monthly_deep' : 'weekly_digest';

    // Optional: targeted single (follower_id, player_id) for on-demand
    const targetedFollower = body.follower_id as string | undefined;
    const targetedPlayer = body.player_id as string | undefined;

    const today = new Date();
    const periodEnd = today.toISOString().slice(0, 10);
    const periodStartDate = new Date(today);
    periodStartDate.setDate(today.getDate() - (mode === 'weekly_digest' ? 7 : 30));
    const periodStart = periodStartDate.toISOString().slice(0, 10);

    let pairs = await getActiveFollowers(supabase);
    if (targetedFollower) pairs = pairs.filter(p => p.follower_id === targetedFollower);
    if (targetedPlayer) pairs = pairs.filter(p => p.player_id === targetedPlayer);

    // Apply preferences
    const followerIds = [...new Set(pairs.map(p => p.follower_id))];
    const { data: prefs } = await supabase
      .from('follower_notification_prefs')
      .select('*')
      .in('follower_id', followerIds);
    const prefMap = new Map((prefs ?? []).map((p: any) => [p.follower_id, p]));
    const prefKey = mode === 'weekly_digest' ? 'weekly_digest_enabled' : 'monthly_per_player_enabled';
    pairs = pairs.filter(p => {
      const pref = prefMap.get(p.follower_id);
      return !pref || pref[prefKey] !== false;
    });

    let generated = 0, skipped = 0, failed = 0;
    for (const pair of pairs) {
      const r = await generateForFollower(supabase, pair, mode, periodStart, periodEnd, mode);
      if (r.id) generated++;
      else if (r.skipped) skipped++;
      else failed++;
    }

    return new Response(JSON.stringify({ ok: true, mode, generated, skipped, failed, total: pairs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-follower-reports]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
