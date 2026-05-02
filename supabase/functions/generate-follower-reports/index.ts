import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

type Role = 'scout' | 'coach';
interface FollowerInfo { follower_id: string; player_id: string; follower_role: Role }

type Snapshot = {
  profile: any;
  sessions: any[];
  vaultGrades: any[];
  weaknesses: any[];
  games: any[];
};

type Deltas = {
  sessions_count: number;
  games_count: number;
  avg_bqi: number | null;
  avg_pei: number | null;
  avg_fqi: number | null;
};

// ---------- Safe logging ----------
async function logResult(
  supabase: any,
  fi: Pick<FollowerInfo, 'follower_id' | 'player_id'>,
  reportType: string,
  status: 'success' | 'skipped' | 'failed',
  reason: string | null,
  error: string | null,
  durationMs: number,
) {
  try {
    await supabase.from('follower_report_logs').insert({
      follower_id: fi.follower_id,
      player_id: fi.player_id,
      report_type: reportType,
      status,
      reason,
      error,
      duration_ms: durationMs,
    });
  } catch (_) { /* never throw from logger */ }
}

// ---------- Active follower discovery ----------
async function getActiveFollowers(supabase: any): Promise<FollowerInfo[]> {
  const { data: follows } = await supabase
    .from('scout_follows')
    .select('scout_id, player_id, status')
    .eq('status', 'accepted');
  if (!follows?.length) return [];

  const followerIds = [...new Set(follows.map((f: any) => f.scout_id as string))];
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role, status')
    .in('user_id', followerIds)
    .in('role', ['scout', 'coach'])
    .eq('status', 'active');

  const roleMap = new Map<string, Role>();
  for (const r of (roles ?? []) as Array<{ user_id: string; role: Role }>) {
    const cur = roleMap.get(r.user_id);
    if (r.role === 'coach' || !cur) roleMap.set(r.user_id, r.role);
  }

  return follows
    .filter((f: any) => roleMap.has(f.scout_id))
    .map((f: any) => ({
      follower_id: f.scout_id as string,
      player_id: f.player_id as string,
      follower_role: roleMap.get(f.scout_id)!,
    }));
}

// ---------- Bulk pre-fetch ----------
async function bulkFetchSnapshots(
  supabase: any,
  playerIds: string[],
  periodStart: string,
  periodEnd: string,
): Promise<Map<string, Snapshot>> {
  const map = new Map<string, Snapshot>();
  if (!playerIds.length) return map;

  const [profilesRes, sessionsRes, gradesRes, weaknessRes, gamesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, sport, position, primary_position, hs_grad_year').in('id', playerIds),
    supabase.from('performance_sessions')
      .select('id, user_id, session_date, module, composite_indexes, drill_blocks, session_type, opponent_level, coach_grade, shared_with_scouts')
      .in('user_id', playerIds)
      .gte('session_date', periodStart)
      .lte('session_date', periodEnd)
      .eq('shared_with_scouts', true)
      .order('session_date', { ascending: false }),
    supabase.from('vault_scout_grades').select('*').in('user_id', playerIds).order('created_at', { ascending: false }),
    supabase.from('hie_weakness_clusters').select('*').in('user_id', playerIds).order('priority_score', { ascending: false }),
    supabase.from('games').select('id, user_id, game_date, opponent_name, league_level, game_summary')
      .in('user_id', playerIds).gte('game_date', periodStart).lte('game_date', periodEnd),
  ]);

  for (const id of playerIds) {
    map.set(id, { profile: null, sessions: [], vaultGrades: [], weaknesses: [], games: [] });
  }
  for (const p of (profilesRes.data ?? []) as any[]) map.get(p.id) && (map.get(p.id)!.profile = p);
  for (const s of (sessionsRes.data ?? []) as any[]) map.get(s.user_id)?.sessions.push(s);
  for (const g of (gradesRes.data ?? []) as any[]) {
    const snap = map.get(g.user_id); if (snap && snap.vaultGrades.length < 2) snap.vaultGrades.push(g);
  }
  for (const w of (weaknessRes.data ?? []) as any[]) {
    const snap = map.get(w.user_id); if (snap && snap.weaknesses.length < 5) snap.weaknesses.push(w);
  }
  for (const g of (gamesRes.data ?? []) as any[]) map.get(g.user_id)?.games.push(g);

  // cap sessions per player to 40
  for (const snap of map.values()) {
    if (snap.sessions.length > 40) snap.sessions = snap.sessions.slice(0, 40);
  }
  return map;
}

// ---------- Derivations ----------
function deriveDeltas(snapshot: Snapshot): Deltas {
  const sessions = snapshot.sessions ?? [];
  const composites = sessions
    .map((s: Record<string, unknown>) => s?.composite_indexes)
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object');

  const avg = (key: string): number | null => {
    const vals = composites
      .map((c: Record<string, unknown>) => c?.[key])
      .filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  return {
    sessions_count: sessions.length,
    games_count: snapshot.games?.length ?? 0,
    avg_bqi: avg('BQI'),
    avg_pei: avg('PEI'),
    avg_fqi: avg('FQI'),
  };
}

function deterministicHeadline(snapshot: Snapshot, deltas: Deltas): string {
  const name = snapshot.profile?.full_name ?? 'Player';
  return `${name} recorded ${deltas.sessions_count} sessions and ${deltas.games_count} games. Performance trends remain stable.`;
}

async function generateHeadline(
  snapshot: Snapshot,
  deltas: Deltas,
  role: Role,
  signal: AbortSignal,
): Promise<string> {
  if (!LOVABLE_API_KEY) return deterministicHeadline(snapshot, deltas);
  try {
    const sysPrompt = role === 'coach'
      ? "You are Hammer, an elite player development coach. Write a 2-sentence headline verdict about a followed player's recent progress. Direct, actionable."
      : "You are Hammer, an elite scouting analyst. Write a 2-sentence headline verdict about a followed prospect. Evaluator tone, no prescriptive advice.";
    const userMsg = `Player: ${snapshot.profile?.full_name ?? 'Unknown'} (${snapshot.profile?.sport ?? '?'} / ${snapshot.profile?.primary_position ?? snapshot.profile?.position ?? '?'})\nPeriod metrics: ${JSON.stringify(deltas)}\nWeaknesses: ${(snapshot.weaknesses ?? []).slice(0, 3).map((w: any) => w.cluster_label || w.area).join(', ') || 'none'}\nSessions: ${snapshot.sessions.length}, Games: ${snapshot.games.length}.`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
      }),
    });
    if (!r.ok) return deterministicHeadline(snapshot, deltas);
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text && typeof text === 'string' ? text : deterministicHeadline(snapshot, deltas);
  } catch {
    return deterministicHeadline(snapshot, deltas);
  }
}

function buildReportData(snapshot: Snapshot, deltas: Deltas, role: Role, headline: string) {
  const sessions = snapshot.sessions ?? [];
  const lowBlocks = sessions
    .flatMap((s: any) => (Array.isArray(s.drill_blocks) ? s.drill_blocks : []).map((b: any) => ({ ...b, session_id: s.id, date: s.session_date })))
    .filter((b: any) => typeof b?.execution_grade === 'number')
    .sort((a: any, b: any) => (a.execution_grade ?? 100) - (b.execution_grade ?? 100))
    .slice(0, 3);

  const grades = snapshot.vaultGrades?.[0]?.grades ?? null;
  const prevGrades = snapshot.vaultGrades?.[1]?.grades ?? null;
  const gradeDeltas: Record<string, { current: number; delta: number | null }> = {};
  if (grades && typeof grades === 'object') {
    for (const [k, v] of Object.entries(grades as Record<string, unknown>)) {
      if (typeof v === 'number') {
        const prev = (prevGrades as Record<string, unknown> | null)?.[k];
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
    area: w.cluster_label || w.area || w.movement_pattern || 'Unspecified',
    severity: w.priority_score ?? w.severity ?? null,
    classification: w.classification ?? 'execution',
  }));

  const data: Record<string, unknown> = {
    headline,
    snapshot: {
      sport: snapshot.profile?.sport ?? null,
      position: snapshot.profile?.primary_position ?? snapshot.profile?.position ?? null,
      hs_grad_year: snapshot.profile?.hs_grad_year ?? null,
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
    recent_games: (snapshot.games ?? []).slice(0, 5),
    prescriptive_fixes: [] as Array<Record<string, unknown>>,
  };

  if (role === 'coach') {
    data.prescriptive_fixes = lowBlocks.map((b: any) => ({
      issue: b.mechanic_id || b.module || 'Low-graded block',
      drill: 'Targeted progression drill — see drill library',
      cue: 'Hold position 2 seconds, then release',
      session_id: b.session_id,
    }));
  }

  // Final shape guarantees
  if (!data.snapshot) (data as any).snapshot = {};
  if (!Array.isArray((data as any).recent_sessions)) (data as any).recent_sessions = [];
  if (!Array.isArray((data as any).weaknesses)) (data as any).weaknesses = [];
  if (!Array.isArray((data as any).strengths)) (data as any).strengths = [];

  return data;
}

// ---------- Per-follower generation ----------
async function generateForFollower(
  supabase: any,
  fi: FollowerInfo,
  reportType: 'weekly_digest' | 'monthly_deep',
  periodStart: string,
  periodEnd: string,
  snapshotCache: Map<string, Snapshot>,
  signal: AbortSignal,
): Promise<{ id?: string; skipped?: boolean; reason?: string; error?: string }> {
  const startedAt = Date.now();

  // Whitelist role
  if (fi.follower_role !== 'scout' && fi.follower_role !== 'coach') {
    await logResult(supabase, fi, reportType, 'skipped', 'invalid_role', null, Date.now() - startedAt);
    return { skipped: true, reason: 'invalid_role' };
  }

  const snapshot = snapshotCache.get(fi.player_id) ?? { profile: null, sessions: [], vaultGrades: [], weaknesses: [], games: [] };
  if (!snapshot.sessions.length && !snapshot.games.length && reportType === 'weekly_digest') {
    await logResult(supabase, fi, reportType, 'skipped', 'no_activity', null, Date.now() - startedAt);
    return { skipped: true, reason: 'no_activity' };
  }

  try {
    const deltas = deriveDeltas(snapshot);
    const headline = await generateHeadline(snapshot, deltas, fi.follower_role, signal);
    const reportData = buildReportData(snapshot, deltas, fi.follower_role, headline);

    const { data: upserted, error } = await supabase
      .from('follower_reports')
      .upsert({
        follower_id: fi.follower_id,
        player_id: fi.player_id,
        follower_role: fi.follower_role,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        headline,
        report_data: reportData,
        status: 'ready',
      }, { onConflict: 'follower_id,player_id,report_type,period_start' })
      .select('id')
      .single();

    if (error) {
      await logResult(supabase, fi, reportType, 'failed', null, error.message, Date.now() - startedAt);
      return { error: error.message };
    }

    await logResult(supabase, fi, reportType, 'success', null, null, Date.now() - startedAt);
    return { id: upserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await logResult(supabase, fi, reportType, 'failed', null, msg, Date.now() - startedAt);
    return { error: msg };
  }
}

// ---------- Entrypoint ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const mode: 'weekly_digest' | 'monthly_deep' = body.mode === 'monthly_deep' ? 'monthly_deep' : 'weekly_digest';
    const targetedFollower = typeof body.follower_id === 'string' ? body.follower_id : undefined;
    const targetedPlayer = typeof body.player_id === 'string' ? body.player_id : undefined;

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
    const { data: prefs } = followerIds.length
      ? await supabase.from('follower_notification_prefs').select('*').in('follower_id', followerIds)
      : { data: [] as any[] };
    const prefMap = new Map((prefs ?? []).map((p: any) => [p.follower_id, p]));
    const prefKey = mode === 'weekly_digest' ? 'weekly_digest_enabled' : 'monthly_per_player_enabled';
    pairs = pairs.filter(p => {
      const pref = prefMap.get(p.follower_id);
      return !pref || pref[prefKey] !== false;
    });

    // Cap work per invocation
    let capped = false;
    if (pairs.length > 200) { pairs = pairs.slice(0, 200); capped = true; }

    // Bulk pre-fetch snapshots (one query each across all unique players)
    const playerIds = [...new Set(pairs.map(p => p.player_id))];
    const snapshotCache = await bulkFetchSnapshots(supabase, playerIds, periodStart, periodEnd);

    // Batch process (controlled parallelism)
    const BATCH_SIZE = 5;
    let generated = 0, skipped = 0, failed = 0;
    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(p =>
        generateForFollower(supabase, p, mode, periodStart, periodEnd, snapshotCache, controller.signal),
      ));
      for (const r of results) {
        if (r.id) generated++;
        else if (r.skipped) skipped++;
        else failed++;
      }
    }

    clearTimeout(timeoutId);
    return new Response(JSON.stringify({ ok: true, mode, generated, skipped, failed, total: pairs.length, capped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('[generate-follower-reports]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
